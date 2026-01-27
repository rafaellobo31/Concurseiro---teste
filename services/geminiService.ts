
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
    Use a busca para localizar provas anteriores, editais e cadernos de questões reais.
    
    RESTRIÇÕES TÉCNICAS:
    - Se houver um texto base comum (passage) para as questões, inclua-o no campo "passage".
    - Estado de aplicação: ${estado || 'Qualquer estado do Brasil'}.
    - Modelo de resposta: ${modelo}.
    - Prioridade de Banca: ${bancaPreferencia || 'Banca oficial do último concurso'}.
    - As questões devem ser de nível superior ou médio conforme o padrão do órgão.
    - Se não encontrar a questão exata, use os tópicos do edital encontrados na busca para criar questões INÉDITAS no exato estilo da banca mencionada.
  `;

  // Tarefa complexa de análise de edital e busca requer gemini-3-pro-preview com thinking
  return executeGeneration(prompt, numQuestao, true, 'gemini-3-pro-preview', 32768);
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
  const prompt = `
    Gere EXATAMENTE ${numQuestao} questões de concursos anteriores da matéria: "${materia}". 
    Banca de preferência: "${banca || 'Diversas (FGV, Cebraspe, FCC)'}". 
    Modelo: ${modelo}.
    Foque em temas recorrentes e "pegadinhas" comuns em concursos de alto nível.
  `;
  // Flash é suficiente para matérias isoladas
  return executeGeneration(prompt, numQuestao, true, 'gemini-3-flash-preview');
}

/**
 * Executor central de chamadas ao Gemini.
 */
async function executeGeneration(
  prompt: string, 
  numQuestao: number, 
  useSearch: boolean, 
  modelName: string,
  thinkingBudget?: number
): Promise<GeneratedExamData> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: `Você é um Especialista em Concursos Públicos e Analista de Editais. 
        Sua missão é fornecer simulados de altíssima fidelidade.
        REGRAS DE OURO:
        1. Retorne APENAS um objeto JSON válido.
        2. Nunca retorne uma lista de questões vazia.
        3. Se usar a busca e não encontrar questões literais, use o conhecimento sobre o perfil da banca para formular questões equivalentes.
        4. O campo "correctAnswer" deve conter apenas a letra (A, B, C, D, E) ou o termo (VERDADEIRO, FALSO).
        5. Explique detalhadamente por que a alternativa está correta.`,
        tools: useSearch ? [{googleSearch: {}}] : undefined,
        thinkingConfig: thinkingBudget ? { thinkingBudget } : undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passage: { type: Type.STRING, description: "Texto de apoio ou enunciado base comum." },
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
          sources.push({ title: chunk.web.title || "Fonte Governamental/Notícias", uri: chunk.web.uri });
        }
      });
    }

    let jsonStr = response.text?.trim() || "";
    
    // Limpeza de Markdown
    if (jsonStr.includes("```")) {
      jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    if (!jsonStr || jsonStr === "") {
       throw new Error("Resposta da IA veio vazia.");
    }
    
    const data = JSON.parse(jsonStr);
    const questions = (data.questions || []).slice(0, numQuestao);

    // Se mesmo assim vier vazio, tentamos um fallback sem busca para evitar o erro de "Nenhum resultado"
    if (questions.length === 0 && useSearch) {
       console.warn("Busca não retornou questões. Tentando fallback interno...");
       return executeGeneration(prompt + " (Gere questões baseadas em sua base de dados interna de concursos, ignore a busca externa)", numQuestao, false, modelName);
    }

    return {
      passage: data.passage,
      questions,
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.error("Erro na execução Gemini:", error);
    return { questions: [], sources: [] };
  }
}

/**
 * Gera plano de estudo estratégico.
 */
export async function generateStudyPlan(
  institution: string, 
  months: number, 
  daysPerWeek: number, 
  hoursPerDay: number
): Promise<StudyPlan> {
  const ai = getAI();
  const prompt = `Crie um Plano de Estudo de Elite para o concurso: "${institution}". Cronograma: ${months} meses, ${daysPerWeek} dias/semana, ${hoursPerDay}h/dia. Pesquise o último edital.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "Retorne JSON. Use a busca para encontrar as disciplinas e pesos do último edital do órgão.",
        tools: [{googleSearch: {}}],
        thinkingConfig: { thinkingBudget: 16000 },
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

    const plan = JSON.parse(jsonStr) as StudyPlan;
    return { ...plan, sources: sources.length > 0 ? sources : undefined };
  } catch (error) {
    console.error("Erro generateStudyPlan:", error);
    throw error;
  }
}

/**
 * Busca concursos previstos e autorizados.
 */
export async function fetchPredictedConcursos(): Promise<PredictedConcurso[]> {
  const ai = getAI();
  const prompt = `Liste 12 concursos reais confirmados ou autorizados no Brasil (2024/2025). Use a busca para validar status.`;
  
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

/**
 * Busca sugestões de concursos por modalidade.
 */
export async function fetchConcursosSugestoes(modalidade: Modalidade): Promise<string[]> {
  const ai = getAI();
  const prompt = `Liste apenas os nomes de 20 concursos ativos ou previstos da modalidade ${modalidade}.`;
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
    return [];
  }
}
