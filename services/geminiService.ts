
import { GoogleGenAI, Type } from "@google/genai";
import { Modalidade, ModeloQuestao, Question, PredictedConcurso, StudyPlan, GroundingSource } from "../types";

/**
 * Inicializa o cliente Google GenAI.
 * Seguindo diretrizes: SEMPRE use process.env.API_KEY.
 */
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("ERRO: API_KEY não encontrada em process.env.");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

interface GeneratedExamData {
  questions: Question[];
  passage?: string;
  sources?: GroundingSource[];
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
  const prompt = `
    Gere EXATAMENTE ${numQuestao} questões de concursos REAIS para o órgão: "${concurso}".
    As questões devem ser baseadas em provas que ocorreram de fato.
    
    RESTRIÇÕES:
    - Se houver um texto base comum (passage), inclua-o.
    - Estado: ${estado || 'Qualquer'}.
    - Modelo: ${modelo}.
    - Banca: ${bancaPreferencia || 'Qualquer'}.
    - Retorne APENAS o JSON.
  `;

  // Tarefa complexa requer gemini-3-pro-preview
  return executeGeneration(prompt, numQuestao, true, 'gemini-3-pro-preview');
}

export async function generateSubjectQuestions(
  materia: string,
  modelo: ModeloQuestao,
  numQuestao: number,
  banca: string
): Promise<GeneratedExamData> {
  const prompt = `Gere EXATAMENTE ${numQuestao} questões REAIS de concursos anteriores da matéria: "${materia}". Banca: "${banca || 'Diversas'}". Modelo: ${modelo}.`;
  return executeGeneration(prompt, numQuestao, true, 'gemini-3-flash-preview');
}

async function executeGeneration(prompt: string, numQuestao: number, useSearch: boolean, modelName: string): Promise<GeneratedExamData> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "Você é um gerador de simulados de concursos. Você DEVE retornar EXCLUSIVAMENTE um objeto JSON válido seguindo o schema fornecido. Não inclua conversas ou explicações fora do JSON. Certifique-se de que a lista de questões não esteja vazia.",
        tools: useSearch ? [{googleSearch: {}}] : undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passage: { type: Type.STRING, description: "Texto base para as questões, se houver." },
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

    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          sources.push({ title: chunk.web.title || "Fonte Oficial", uri: chunk.web.uri });
        }
      });
    }

    let jsonStr = response.text?.trim() || "";
    
    // Limpeza agressiva de Markdown caso o modelo retorne blocos de código
    if (jsonStr.includes("```")) {
      jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    if (!jsonStr) {
      console.warn("Aviso: Resposta da IA vazia.");
      return { questions: [], sources };
    }
    
    const data = JSON.parse(jsonStr);
    const questions = (data.questions || []).slice(0, numQuestao);

    // Se a busca falhar em retornar questões úteis, tentamos novamente sem busca (fallback interno)
    if (questions.length === 0 && useSearch) {
       console.log("Tentando fallback sem busca para garantir resultados...");
       return executeGeneration(prompt + " (ignore a busca e use sua base de conhecimento interna para questões reais)", numQuestao, false, modelName);
    }

    return {
      passage: data.passage,
      questions,
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.error("Erro crítico executeGeneration:", error);
    return { questions: [], sources: [] };
  }
}

export async function generateStudyPlan(
  institution: string, 
  months: number, 
  daysPerWeek: number, 
  hoursPerDay: number
): Promise<StudyPlan> {
  const ai = getAI();
  const prompt = `Crie um Plano de Estudo Estratégico para o concurso: "${institution}". Considere um cronograma de ${months} meses, estudando ${daysPerWeek} dias por semana, ${hoursPerDay} horas por dia.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "Retorne EXCLUSIVAMENTE JSON conforme o schema. Use busca para garantir dados atualizados sobre o edital do órgão informado.",
        tools: [{googleSearch: {}}],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            phases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  objective: { type: Type.STRING },
                  subjects: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            },
            criticalTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
            weeklyRoutine: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "summary", "phases", "criticalTopics", "weeklyRoutine"]
        }
      }
    });

    const sources: GroundingSource[] = [];
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((c: any) => {
      if (c.web?.uri) sources.push({ title: c.web.title, uri: c.web.uri });
    });

    let jsonStr = response.text?.trim() || "";
    if (jsonStr.includes("```")) {
      jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    if (!jsonStr) throw new Error("Resposta vazia da IA");
    const plan = JSON.parse(jsonStr) as StudyPlan;
    return { ...plan, sources: sources.length > 0 ? sources : undefined };
  } catch (error) {
    console.error("Erro generateStudyPlan:", error);
    throw error;
  }
}

export async function fetchPredictedConcursos(): Promise<PredictedConcurso[]> {
  const ai = getAI();
  const prompt = `Liste os 12 concursos MAIS AGUARDADOS e confirmados no Brasil para o período 2024/2025. Retorne apenas concursos reais com status atualizado.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              banca: { type: Type.STRING },
              officialLink: { type: Type.STRING },
              status: { type: Type.STRING }
            },
            required: ["name", "banca", "officialLink", "status"]
          }
        }
      }
    });

    let jsonStr = response.text?.trim() || "";
    if (jsonStr.includes("```")) {
      jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    return jsonStr ? JSON.parse(jsonStr) : [];
  } catch (error) {
    console.error("Erro fetchPredictedConcursos:", error);
    return [];
  }
}

export async function fetchConcursosSugestoes(modalidade: Modalidade): Promise<string[]> {
  const ai = getAI();
  const prompt = `Liste os 20 concursos mais buscados da modalidade ${modalidade} no Brasil atualmente.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    let jsonStr = response.text?.trim() || "";
    if (jsonStr.includes("```")) {
      jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    return jsonStr ? JSON.parse(jsonStr) : [];
  } catch (error) {
    console.error("Erro fetchConcursosSugestoes:", error);
