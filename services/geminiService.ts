
import { GoogleGenAI, Type } from "@google/genai";
import { Modalidade, ModeloQuestao, Question, StudyGuide, PredictedConcurso, StudyPlan } from "../types";

// Always use the direct process.env.API_KEY as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface GeneratedExamData {
  questions: Question[];
  passage?: string;
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
    USE A BUSCA DO GOOGLE para verificar os editais mais recentes e o estilo de prova para o órgão: "${concurso}".
    Gere EXATAMENTE ${numQuestao} questões de concursos REAIS para este órgão.

    ESTRUTURA DE RETORNO (IMPORTANTE):
    - Se houver um texto base comum às questões, inclua-o no campo "passage".
    - Se for um simulado geral de várias matérias, deixe "passage" vazio.

    RESTRIAÇÃO GEOGRÁFICA CRÍTICA:
    ${estado ? `
    - O usuário selecionou especificamente o estado: "${estado}".
    - VOCÊ SÓ PODE GERAR QUESTÕES QUE FORAM APLICADAS NESTE ESTADO (${estado}).
    ` : 'Foque em órgãos de esfera Nacional se o contexto permitir.'}
    
    Modelo de resposta: ${modelo}.
    ${bancaPreferencia ? `Prioridade de Banca: ${bancaPreferencia}.` : ''}
  `;

  return executeGeneration(prompt, numQuestao, true);
}

export async function generateSubjectQuestions(
  materia: string,
  modelo: ModeloQuestao,
  numQuestao: number,
  banca: string,
  batchIndex: number = 0
): Promise<GeneratedExamData> {
  const isReadingComp = materia.toLowerCase().includes('interpretação');
  
  const prompt = `
    Aja como um professor especialista em concursos públicos.
    Gere EXATAMENTE ${numQuestao} questões REAIS de concursos anteriores da matéria: "${materia}".
    
    ${isReadingComp ? `
    AVISO ESPECIAL PARA INTERPRETAÇÃO DE TEXTO:
    1. VOCÊ DEVE pesquisar um texto real que já foi utilizado em prova de concurso (cite autor e banca).
    2. Coloque esse texto INTEIRO no campo "passage".
    3. As questões devem ser elaboradas com base estrita nesse texto.
    ` : 'Campo "passage" deve ser nulo ou vazio.'}

    Padrão da banca: "${banca || 'Diversas'}".
    Modelo: ${modelo}.
  `;

  return executeGeneration(prompt, numQuestao, isReadingComp);
}

async function executeGeneration(prompt: string, numQuestao: number, useSearch: boolean): Promise<GeneratedExamData> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: useSearch ? [{googleSearch: {}}] : undefined,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          passage: { type: Type.STRING, description: "Texto base ou crônica que serve para as questões de interpretação." },
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

  try {
    const jsonStr = response.text?.trim();
    if (!jsonStr) return { questions: [] };
    const data = JSON.parse(jsonStr);
    return {
      passage: data.passage,
      questions: data.questions.slice(0, numQuestao)
    };
  } catch (error) {
    console.error("Erro ao processar JSON:", error);
    return { questions: [] };
  }
}

export async function generateStudyGuide(institution: string, state?: string): Promise<StudyGuide> {
  const prompt = `Crie um Guia de Estudo Resumido para o concurso: "${institution}" ${state ? `em ${state}` : ''}.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{googleSearch: {}}],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          institution: { type: Type.STRING },
          topics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                frequency: { type: Type.STRING },
                content: { type: Type.STRING },
                tips: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          generalAdvice: { type: Type.STRING }
        },
        required: ["title", "institution", "topics", "generalAdvice"]
      }
    }
  });

  try {
    const jsonStr = response.text?.trim();
    if (!jsonStr) throw new Error("A resposta da IA está vazia.");
    return JSON.parse(jsonStr) as StudyGuide;
  } catch (error) {
    console.error("Erro ao gerar material:", error);
    throw error;
  }
}

export async function generateStudyPlan(
  institution: string, 
  months: number, 
  daysPerWeek: number, 
  hoursPerDay: number
): Promise<StudyPlan> {
  const prompt = `Crie um Plano de Estudo Estratégico para o concurso: "${institution}".`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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

  try {
    const jsonStr = response.text?.trim();
    if (!jsonStr) throw new Error("A resposta da IA está vazia.");
    return JSON.parse(jsonStr) as StudyPlan;
  } catch (error) {
    console.error("Erro ao gerar plano:", error);
    throw error;
  }
}

export async function fetchPredictedConcursos(): Promise<PredictedConcurso[]> {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const prompt = `Liste os 12 concursos MAIS AGUARDADOS em ${currentYear} e ${nextYear}. Retorne apenas concursos reais com status atualizado (autorizado, previsto, ou com comissão formada).`;
  
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
    if (!jsonStr) return [];
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
}

export async function fetchConcursosSugestoes(modalidade: Modalidade): Promise<string[]> {
  const currentYear = new Date().getFullYear();
  const prompt = `Liste os 20 concursos mais famosos da modalidade ${modalidade} no Brasil em ${currentYear}.`;
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
    if (!jsonStr) return [];
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
}
