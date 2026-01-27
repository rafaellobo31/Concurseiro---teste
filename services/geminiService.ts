
import { GoogleGenAI, Type } from "@google/genai";
import { Modalidade, ModeloQuestao, Question, PredictedConcurso, StudyPlan, GroundingSource } from "../types";

/**
 * Inicializa o cliente Google GenAI.
 * Seguindo diretrizes: SEMPRE use process.env.API_KEY.
 */
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "") {
    console.warn("API_KEY não detectada em process.env. Verifique as variáveis de ambiente.");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

interface GeneratedExamData {
  questions: Question[];
  passage?: string;
  sources?: GroundingSource[];
}

/**
 * Tenta extrair um JSON válido de uma string, limpando lixo de texto ou markdown.
 */
function extractJSON(text: string) {
  if (!text) return null;
  try {
    // Tenta o parse direto
    return JSON.parse(text);
  } catch (e) {
    // Procura por blocos de código markdown ```json ... ```
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e2) {}
    }
    
    // Fallback: Localiza o primeiro '{' ou '[' e o último '}' ou ']'
    const startObj = text.indexOf('{');
    const startArr = text.indexOf('[');
    const start = (startArr !== -1 && (startObj === -1 || startArr < startObj)) ? startArr : startObj;
    
    const endObj = text.lastIndexOf('}');
    const endArr = text.lastIndexOf(']');
    const end = (endArr !== -1 && (endObj === -1 || endArr > endObj)) ? endArr : endObj;

    if (start !== -1 && end !== -1) {
      try {
        const potentialJSON = text.substring(start, end + 1);
        return JSON.parse(potentialJSON);
      } catch (e3) {}
    }
  }
  return null;
}

/**
 * Gera questões para um concurso específico.
 */
export async function generateExamQuestions(
  modalidade: Modalidade,
  concurso: string,
  modelo: ModeloQuestao,
  numQuestao: number,
  bancaPreferencia?: string,
  batchIndex: number = 0,
  estado?: string
): Promise<GeneratedExamData> {
  const prompt = `
    Gere EXATAMENTE ${numQuestao} questões de concursos REAIS para o órgão: "${concurso}".
    Use a busca do Google para encontrar provas anteriores, editais e cadernos de questões.
    
    REGRAS CRÍTICAS:
    1. Se encontrar um texto base comum, inclua no campo "passage".
    2. Respeite o Estado: ${estado || 'Brasil'}.
    3. Respeite o Modelo: ${modelo}.
    4. Respeite a Banca: ${bancaPreferencia || 'Banca oficial do último concurso'}.
    5. IMPORTANTE: Se não encontrar a questão exata na busca, crie questões INÉDITAS rigorosamente baseadas no último edital deste órgão e no estilo da banca.
  `;

  return executeGeneration(prompt, numQuestao, true, 'gemini-3-flash-preview');
}

/**
 * Gera questões por matéria.
 */
export async function generateSubjectQuestions(
  materia: string,
  modelo: ModeloQuestao,
  numQuestao: number,
  banca: string
): Promise<GeneratedExamData> {
  const prompt = `Gere EXATAMENTE ${numQuestao} questões de concursos da matéria: "${materia}". Priorize a banca: "${banca || 'FGV, Cebraspe ou FCC'}". Modelo: ${modelo}.`;
  return executeGeneration(prompt, numQuestao, true, 'gemini-3-flash-preview');
}

/**
 * Executor central com lógica de Fallback (Busca -> Conhecimento Interno)
 */
async function executeGeneration(
  prompt: string, 
  numQuestao: number, 
  useSearch: boolean, 
  modelName: string
): Promise<GeneratedExamData> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "Você é um Especialista em Concursos Públicos. Retorne APENAS JSON. Se a busca externa não retornar questões completas, use sua base de conhecimento para formular questões idênticas ao estilo da banca solicitada. Garanta que o campo correctAnswer seja compatível com o modelo (A,B,C,D,E ou Verdadeiro/Falso).",
        tools: useSearch ? [{googleSearch: {}}] : undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passage: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  banca: { type: Type.STRING },
                  ano: { type: Type.NUMBER },
                  recorrente: { type: Type.BOOLEAN },
                  explicacao: { type: Type.STRING }
                },
                required: ["id", "text", "correctAnswer", "banca", "ano", "recorrente", "explicacao"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const data = extractJSON(response.text);
    
    // Se falhou ou veio vazio, e estávamos usando busca, tenta novamente sem busca
    if ((!data || !data.questions || data.questions.length === 0) && useSearch) {
      console.log("Busca retornou vazio. Tentando via base de conhecimento interna...");
      return executeGeneration(prompt + " (Não use busca externa, use seu conhecimento interno)", numQuestao, false, modelName);
    }

    if (!data) return { questions: [] };

    const sources: GroundingSource[] = [];
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk: any) => {
      if (chunk.web?.uri) {
        sources.push({ title: chunk.web.title || "Fonte de Estudo", uri: chunk.web.uri });
      }
    });

    return {
      passage: data.passage,
      questions: data.questions.slice(0, numQuestao),
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.error("Erro Crítico Gemini:", error);
    // Se falhou no modelo principal, tenta o fallback definitivo
    if (useSearch) return executeGeneration(prompt, numQuestao, false, 'gemini-3-flash-preview');
    return { questions: [] };
  }
}

export async function generateStudyPlan(
  institution: string, 
  months: number, 
  daysPerWeek: number, 
  hoursPerDay: number
): Promise<StudyPlan> {
  const ai = getAI();
  const prompt = `Plano de Estudo para: "${institution}". Duração: ${months} meses, ${daysPerWeek} dias/sem, ${hoursPerDay}h/dia.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
        responseMimeType: "application/json"
      }
    });

    const plan = extractJSON(response.text) as StudyPlan;
    if (!plan) throw new Error("Falha ao gerar plano");
    return plan;
  } catch (error) {
    console.error("Erro plano:", error);
    throw error;
  }
}

export async function fetchPredictedConcursos(): Promise<PredictedConcurso[]> {
  const ai = getAI();
  const prompt = `Liste 12 concursos reais autorizados ou previstos no Brasil para 2024/2025.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { tools: [{googleSearch: {}}], responseMimeType: "application/json" }
    });
    return extractJSON(response.text) || [];
  } catch (error) {
    return [];
  }
}

export async function fetchConcursosSugestoes(modalidade: Modalidade): Promise<string[]> {
  const ai = getAI();
  const prompt = `Nomes de 20 concursos de modalidade ${modalidade}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return extractJSON(response.text) || [];
  } catch (error) {
    return [];
  }
}
