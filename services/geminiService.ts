
import { GoogleGenAI, Type } from "@google/genai";
import { Modalidade, ModeloQuestao, Question, PredictedConcurso, StudyPlan, GroundingSource } from "../types";

/**
 * Initialize the Google GenAI client using the API key from environment variables.
 * Following strict guidelines: new GoogleGenAI({ apiKey: process.env.API_KEY })
 */
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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
    Aja como um historiador de concursos e especialista em provas brasileiras. 
    Gere EXATAMENTE ${numQuestao} questões de concursos REAIS para o órgão: "${concurso}".
    As questões devem ser baseadas em provas que ocorreram de fato.

    ESTRUTURA DE RETORNO:
    - Se houver um texto base comum, use o campo "passage".
    
    ${estado ? `- Restrição: Apenas questões aplicadas no estado: "${estado}".` : ''}
    - Modelo: ${modelo}.
    ${bancaPreferencia ? `- Prioridade de Banca: ${bancaPreferencia}.` : ''}
  `;

  // Using gemini-3-pro-preview for complex reasoning task (Brazilian Civil Service Exams)
  return executeGeneration(prompt, numQuestao, true, 'gemini-3-pro-preview');
}

export async function generateSubjectQuestions(
  materia: string,
  modelo: ModeloQuestao,
  numQuestao: number,
  banca: string
): Promise<GeneratedExamData> {
  const isReadingComp = materia.toLowerCase().includes('interpretação');
  const prompt = `Gere EXATAMENTE ${numQuestao} questões REAIS de concursos anteriores da matéria: "${materia}". Banca: "${banca || 'Diversas'}". Modelo: ${modelo}.`;

  // Using gemini-3-flash-preview for standard question retrieval task
  return executeGeneration(prompt, numQuestao, isReadingComp, 'gemini-3-flash-preview');
}

async function executeGeneration(prompt: string, numQuestao: number, useSearch: boolean, modelName: string): Promise<GeneratedExamData> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
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

  const sources: GroundingSource[] = [];
  // Extracting URLs from groundingChunks as per Search Grounding guidelines
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.web?.uri) {
        sources.push({ title: chunk.web.title || "Fonte Oficial", uri: chunk.web.uri });
      }
    });
  }

  try {
    const jsonStr = response.text?.trim();
    if (!jsonStr) return { questions: [], sources };
    const data = JSON.parse(jsonStr);
    return {
      passage: data.passage,
      questions: data.questions.slice(0, numQuestao),
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.error("Erro ao processar simulado:", error);
    return { questions: [], sources };
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
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
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
  // Extracting URLs from groundingChunks as per Search Grounding guidelines
  response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((c: any) => {
    if (c.web?.uri) sources.push({ title: c.web.title, uri: c.web.uri });
  });

  try {
    const jsonStr = response.text?.trim();
    if (!jsonStr) throw new Error("Resposta vazia");
    const plan = JSON.parse(jsonStr) as StudyPlan;
    return { ...plan, sources: sources.length > 0 ? sources : undefined };
  } catch (error) {
    console.error("Erro ao gerar plano:", error);
    throw error;
  }
}

export async function fetchPredictedConcursos(): Promise<PredictedConcurso[]> {
  const ai = getAI();
  const prompt = `Liste os 12 concursos MAIS AGUARDADOS e confirmados no Brasil. Retorne apenas concursos reais com status atualizado.`;
  
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

  try {
    const jsonStr = response.text?.trim();
    return jsonStr ? JSON.parse(jsonStr) : [];
  } catch {
    return [];
  }
}

export async function fetchConcursosSugestoes(modalidade: Modalidade): Promise<string[]> {
  const ai = getAI();
  const prompt = `Liste os 20 concursos mais buscados da modalidade ${modalidade} no Brasil atualmente.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
  });
  try {
    const jsonStr = response.text?.trim();
    return jsonStr ? JSON.parse(jsonStr) : [];
  } catch {
    return [];
  }
}
