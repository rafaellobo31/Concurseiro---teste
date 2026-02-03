
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Modalidade, ModeloQuestao, Question, PredictedConcurso, StudyPlan, GroundingSource, ThermometerData, PredictedConcursosResponse } from "../types";
import { telemetry } from "./telemetry";

/**
 * Função utilitária para extrair JSON de uma string que pode conter markdown ou texto extra.
 * Essencial quando usamos 'googleSearch', pois o modelo pode ignorar o MIME type JSON.
 */
function parseFlexibleJSON(text: string | undefined) {
  if (!text) return null;
  let cleanText = text.trim();
  
  // Remove blocos de código Markdown se o modelo os incluiu
  cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
  cleanText = cleanText.replace(/^```\s*/, "").replace(/```\s*$/, "");

  try {
    return JSON.parse(cleanText);
  } catch (e) {
    // Tenta encontrar o padrão JSON dentro do texto se houver lixo ao redor
    const match = cleanText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        console.error("Erro ao parsear JSON extraído por Regex:", e2);
      }
    }
    console.error("Falha total ao parsear resposta da IA como JSON:", cleanText);
    return null;
  }
}

/**
 * Extrai fontes de grounding das respostas da IA para conformidade.
 */
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

/**
 * Interface para retorno de questões
 */
interface GeneratedExamData {
  questions: Question[];
  passage?: string;
  sources?: GroundingSource[];
}

export async function fetchThermometerData(concurso: string, banca?: string): Promise<ThermometerData | null> {
  const modelName = 'gemini-3-flash-preview';
  telemetry.logAICall(modelName, `Termômetro: ${concurso}`);
  
  // SEMPRE inicializar no momento da chamada para garantir a API_KEY mais atual (regra Gemini API)
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Analise as tendências para o concurso: "${concurso}"${banca ? ` banca: "${banca}"` : ""}. 
      Retorne um JSON com os campos: concurso, banca, analysis (texto), subjects (Array<{name, frequency, heatLevel, description}>) e topQuestions (Array de 3 questões reais).`,
      config: {
        tools: [{ googleSearch: {} }],
        // Com googleSearch, o responseMimeType as vezes é ignorado pelo modelo, por isso o parser flexível
        responseMimeType: "application/json",
        systemInstruction: "Você é um especialista em concursos brasileiros. Responda APENAS com o JSON solicitado."
      }
    });

    const text = response.text; // Usando propriedade .text conforme as regras
    const data = parseFlexibleJSON(text) as ThermometerData;
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
        responseMimeType: "application/json",
        systemInstruction: "Sua resposta deve ser EXCLUSIVAMENTE um objeto JSON válido. Nunca inclua texto antes ou depois do JSON."
      }
    });

    const data = parseFlexibleJSON(response.text);
    
    if (!data || !data.questions || data.questions.length === 0) {
      if (useSearch) {
        console.warn("Falha ao gerar com pesquisa web, tentando fallback sem busca...");
        return executeGeneration(prompt + " (Gere usando sua base de conhecimento interna)", numQuestao, false, modelName);
      }
      throw new Error("Resposta da IA vazia ou inválida.");
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

  const prompt = `Crie um Cronograma de Estudo para "${institution}". Duração: ${months} meses, ${daysPerWeek} dias/semana, ${hoursPerDay}h/dia. Pesquise o último edital. 
  Retorne um JSON com title, summary, phases (array), criticalTopics (array) e weeklyRoutine (array).`;

  try {
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const modelName = 'gemini-3-flash-preview';
  telemetry.logAICall(modelName, 'Radar de Concursos');

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "Liste 12 concursos reais confirmados ou autorizados no Brasil para 2024/2025. Retorne um JSON com um campo 'predictions' que é um array de objetos {name, banca, officialLink, status}.",
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  try {
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
