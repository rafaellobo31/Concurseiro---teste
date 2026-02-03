
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Modalidade, ModeloQuestao, Question, PredictedConcurso, StudyPlan, GroundingSource, ThermometerData, PredictedConcursosResponse } from "../types";
import { telemetry } from "./telemetry";

/**
 * Helper para obter a chave de API de forma segura
 */
function getSafeApiKey(): string {
  const key = process.env.API_KEY;
  if (!key) {
    throw new Error("API_KEY não configurada. Se estiver no Vercel, use o painel de Admin (Alt+Shift+A) para vincular uma chave.");
  }
  return key;
}

/**
 * Função utilitária para extrair JSON de uma string que pode conter markdown ou texto extra.
 */
function parseFlexibleJSON(text: string | undefined) {
  if (!text) return null;
  let cleanText = text.trim();
  
  cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
  cleanText = cleanText.replace(/^```\s*/, "").replace(/```\s*$/, "");

  try {
    return JSON.parse(cleanText);
  } catch (e) {
    const match = cleanText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        console.error("Erro ao parsear JSON extraído por Regex:", e2);
      }
    }
    return null;
  }
}

function extractSources(response: GenerateContentResponse): GroundingSource[] | undefined {
  const sources: GroundingSource[] = [];
  const metadata = response.candidates?.[0]?.groundingMetadata;
  if (metadata?.groundingChunks) {
    metadata.groundingChunks.forEach((chunk: any) => {
      if (chunk.web?.uri) {
        sources.push({ title: chunk.web.title || "Referência", uri: chunk.web.uri });
      }
    });
  }
  return sources.length > 0 ? sources : undefined;
}

interface GeneratedExamData {
  questions: Question[];
  passage?: string;
  sources?: GroundingSource[];
}

export async function fetchThermometerData(concurso: string, banca?: string): Promise<ThermometerData | null> {
  const modelName = 'gemini-3-flash-preview';
  telemetry.logAICall(modelName, `Termômetro: ${concurso}`);
  
  try {
    const ai = new GoogleGenAI({ apiKey: getSafeApiKey() });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Analise as tendências para o concurso: "${concurso}"${banca ? ` banca: "${banca}"` : ""}. 
      Retorne um JSON com os campos: concurso, banca, analysis (texto), subjects (Array<{name, frequency, heatLevel, description}>) e topQuestions (Array de 3 questões reais).`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        systemInstruction: "Você é um especialista em concursos brasileiros. Sua resposta deve ser exclusivamente um objeto JSON válido."
      }
    });

    const data = parseFlexibleJSON(response.text) as ThermometerData;
    if (data) data.sources = extractSources(response);
    return data;
  } catch (error) {
    console.error("Erro fetchThermometerData:", error);
    return null;
  }
}

export async function generateExamQuestions(
  modalidade: Modalidade,
  concurso: string,
  modelo: ModeloQuestao,
  numQuestao: number,
  bancaPreferencia?: string,
  batchIndex: number = 0,
  estado?: string
): Promise<GeneratedExamData> {
  const modelName = 'gemini-3-flash-preview';
  telemetry.logAICall(modelName, `Simulado: ${concurso}`);
  
  const prompt = `Gere ${numQuestao} questões de concursos REAIS para "${concurso}" (${estado || 'Brasil'}). Banca: ${bancaPreferencia || 'Qualquer'}. Modelo: ${modelo}. 
  Retorne um JSON com: passage (opcional) e questions (array de objetos com id, text, options, correctAnswer, banca, ano, recorrente, explicacao).`;

  return executeGeneration(prompt, numQuestao, true, modelName);
}

export async function generateSubjectQuestions(
  materia: string,
  modelo: ModeloQuestao,
  numQuestao: number,
  banca: string
): Promise<GeneratedExamData> {
  const modelName = 'gemini-3-flash-preview';
  telemetry.logAICall(modelName, `Disciplina: ${materia}`);
  const prompt = `Gere ${numQuestao} questões reais da matéria "${materia}" da banca "${banca || 'Diversas'}". Modelo: ${modelo}.
  Retorne um JSON com o array de questões em 'questions'.`;
  
  return executeGeneration(prompt, numQuestao, true, modelName);
}

async function executeGeneration(
  prompt: string, 
  numQuestao: number, 
  useSearch: boolean, 
  modelName: string
): Promise<GeneratedExamData> {
  try {
    const ai = new GoogleGenAI({ apiKey: getSafeApiKey() });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
        responseMimeType: "application/json",
        systemInstruction: "Sua resposta deve ser EXCLUSIVAMENTE um objeto JSON válido."
      }
    });

    const data = parseFlexibleJSON(response.text);
    
    if (!data || !data.questions) {
      if (useSearch) {
        return executeGeneration(prompt, numQuestao, false, modelName);
      }
      throw new Error("IA não retornou questões válidas.");
    }

    return {
      passage: data.passage,
      questions: data.questions.slice(0, numQuestao),
      sources: extractSources(response)
    };
  } catch (error) {
    console.error("Erro crítico na geração Gemini:", error);
    return { questions: [] };
  }
}

export async function generateStudyPlan(
  institution: string, 
  months: number, 
  daysPerWeek: number, 
  hoursPerDay: number
): Promise<StudyPlan> {
  const modelName = 'gemini-3-flash-preview';
  telemetry.logAICall(modelName, `Plano: ${institution}`);

  const prompt = `Crie um Cronograma de Estudo para "${institution}". Duração: ${months} meses, ${daysPerWeek} dias/semana, ${hoursPerDay}h/dia. 
  Retorne um JSON com title, summary, phases (array), criticalTopics (array) e weeklyRoutine (array).`;

  try {
    const ai = new GoogleGenAI({ apiKey: getSafeApiKey() });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    const plan = parseFlexibleJSON(response.text) as StudyPlan;
    if (plan) plan.sources = extractSources(response);
    return plan;
  } catch (error) {
    console.error("Erro generateStudyPlan:", error);
    throw error;
  }
}

export async function fetchPredictedConcursos(): Promise<PredictedConcursosResponse> {
  const modelName = 'gemini-3-flash-preview';
  telemetry.logAICall(modelName, 'Radar de Concursos');

  try {
    const ai = new GoogleGenAI({ apiKey: getSafeApiKey() });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "Liste 12 concursos reais confirmados ou autorizados no Brasil para 2024/2025. Retorne um JSON com um campo 'predictions' (array de {name, banca, officialLink, status}).",
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    const data = parseFlexibleJSON(response.text);
    return {
      predictions: data?.predictions || [],
      sources: extractSources(response)
    };
  } catch (error) {
    console.error("Erro fetchPredictedConcursos:", error);
    return { predictions: [] };
  }
}

export async function fetchConcursosSugestoes(modalidade: Modalidade): Promise<string[]> {
  try {
    const ai = new GoogleGenAI({ apiKey: getSafeApiKey() });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Liste 20 nomes de concursos da modalidade ${modalidade} em um array JSON de strings.`,
      config: { responseMimeType: "application/json" }
    });
    return parseFlexibleJSON(response.text) || [];
  } catch (error) {
    return [];
  }
}
