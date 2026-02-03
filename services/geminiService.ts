
import { Modalidade, ModeloQuestao, Question, StudyPlan, GroundingSource, ThermometerData, PredictedConcursosResponse } from "../types";
import { telemetry } from "./telemetry";

/**
 * Função central para chamar o proxy do Gemini no backend.
 * Resolve problemas de CORS e exposição de chaves no frontend (Vercel).
 */
async function callGeminiProxy(payload: { model: string, contents: any, config?: any }) {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Falha na chamada callGeminiProxy:", error);
    throw error;
  }
}

/**
 * Utilitário para limpar e parsear JSON retornado pela IA.
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

/**
 * Extrai fontes de Grounding do Google Search a partir da resposta do proxy.
 */
function extractSources(data: any): GroundingSource[] | undefined {
  const sources: GroundingSource[] = [];
  const metadata = data.candidates?.[0]?.groundingMetadata;
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
    const data = await callGeminiProxy({
      model: modelName,
      contents: `Analise as tendências para o concurso: "${concurso}"${banca ? ` banca: "${banca}"` : ""}. 
      Retorne um JSON com os campos: concurso, banca, analysis (texto), subjects (Array<{name, frequency, heatLevel, description}>) e topQuestions (Array de 3 questões reais).`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "Você é um especialista em concursos brasileiros. Sua resposta deve ser exclusivamente um objeto JSON válido."
      }
    });

    const result = parseFlexibleJSON(data.text) as ThermometerData;
    if (result) result.sources = extractSources(data);
    return result;
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
    const data = await callGeminiProxy({
      model: modelName,
      contents: prompt,
      config: {
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
        systemInstruction: "Sua resposta deve ser EXCLUSIVAMENTE um objeto JSON válido."
      }
    });

    const parsed = parseFlexibleJSON(data.text);
    
    if (!parsed || !parsed.questions) {
      if (useSearch) {
        return executeGeneration(prompt, numQuestao, false, modelName);
      }
      throw new Error("IA não retornou questões válidas.");
    }

    return {
      passage: parsed.passage,
      questions: parsed.questions.slice(0, numQuestao),
      sources: extractSources(data)
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
    const data = await callGeminiProxy({
      model: modelName,
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }],
        systemInstruction: "Sua resposta deve ser EXCLUSIVAMENTE um objeto JSON válido."
      }
    });
    
    const plan = parseFlexibleJSON(data.text) as StudyPlan;
    if (plan) plan.sources = extractSources(data);
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
    const data = await callGeminiProxy({
      model: modelName,
      contents: "Liste 12 concursos reais confirmados ou autorizados no Brasil para 2024/2025. Retorne um JSON com um campo 'predictions' (array de {name, banca, officialLink, status}).",
      config: { 
        tools: [{ googleSearch: {} }],
        systemInstruction: "Sua resposta deve ser EXCLUSIVAMENTE um objeto JSON válido."
      }
    });
    
    const parsed = parseFlexibleJSON(data.text);
    return {
      predictions: parsed?.predictions || [],
      sources: extractSources(data)
    };
  } catch (error) {
    console.error("Erro fetchPredictedConcursos:", error);
    return { predictions: [] };
  }
}

export async function fetchConcursosSugestoes(modalidade: Modalidade): Promise<string[]> {
  try {
    const data = await callGeminiProxy({
      model: 'gemini-3-flash-preview',
      contents: `Liste 20 nomes de concursos da modalidade ${modalidade} em um array JSON de strings.`,
      config: { systemInstruction: "Responda apenas com o JSON." }
    });
    return parseFlexibleJSON(data.text) || [];
  } catch (error) {
    console.error("Erro fetchConcursosSugestoes:", error);
    return [];
  }
}
