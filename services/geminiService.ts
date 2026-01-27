
import { GoogleGenAI, Type } from "@google/genai";
import { Modalidade, ModeloQuestao, Question, PredictedConcurso, StudyPlan, GroundingSource, ThermometerData } from "../types";

/**
 * Inicializa o cliente Google GenAI de forma segura.
 */
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("C-PRO Warning: API_KEY não encontrada. Verifique as variáveis de ambiente.");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

interface GeneratedExamData {
  questions: Question[];
  passage?: string;
  sources?: GroundingSource[];
}

/**
 * Extrator de JSON ultra-resiliente.
 */
function extractJSON(text: string | undefined) {
  if (!text || typeof text !== 'string') return null;
  
  const cleanText = text.trim();
  
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    const markdownMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      try {
        return JSON.parse(markdownMatch[1]);
      } catch (e2) {}
    }

    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    const firstBracket = cleanText.indexOf('[');
    const lastBracket = cleanText.lastIndexOf(']');

    const start = (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) ? firstBracket : firstBrace;
    const end = (lastBracket !== -1 && (lastBrace === -1 || lastBracket > lastBrace)) ? lastBracket : lastBrace;

    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleanText.substring(start, end + 1));
      } catch (e3) {
        console.error("Falha ao parsear substring extraída:", e3);
      }
    }
  }
  return null;
}

export async function fetchThermometerData(concurso: string, banca?: string): Promise<ThermometerData | null> {
  const ai = getAI();
  const prompt = `Analise os últimos 5 anos de provas para o concurso: "${concurso}"${banca ? ` e especificamente para a banca: "${banca}"` : ""}. 
  Identifique os assuntos que mais caíram.
  Retorne um JSON com a banca predominante, uma lista de assuntos com nome, frequência (0-100), nível de calor (High, Medium, Low) e uma breve descrição do que focar, uma análise geral tática, e inclua também 3 questões REAIS e EXEMPLARES que costumam se repetir muito nesses exames.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            concurso: { type: Type.STRING },
            banca: { type: Type.STRING },
            subjects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  frequency: { type: Type.NUMBER },
                  heatLevel: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                  description: { type: Type.STRING }
                },
                required: ["name", "frequency", "heatLevel", "description"]
              }
            },
            analysis: { type: Type.STRING },
            topQuestions: {
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
                required: ["id", "text", "correctAnswer", "banca", "ano", "explicacao"]
              }
            }
          },
          required: ["concurso", "banca", "subjects", "analysis", "topQuestions"]
        }
      }
    });

    return extractJSON(response.text) as ThermometerData;
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
  const queryBusca = `${concurso} ${estado || ''} provas anteriores banca ${bancaPreferencia || 'oficial'}`;
  
  const prompt = `
    PESQUISE AGORA: "${queryBusca}" e o último edital.
    TAREFA: Gere EXATAMENTE ${numQuestao} questões de concursos REAIS para "${concurso}".
    REQUISITOS:
    - Banca: ${bancaPreferencia || 'Padronizada para este órgão'}.
    - Modelo: ${modelo}.
    - Se não encontrar questões literais na busca, use os temas do edital encontrados para criar questões INÉDITAS no perfil exato da banca.
  `;

  return executeGeneration(prompt, numQuestao, true, 'gemini-3-flash-preview');
}

export async function generateSubjectQuestions(
  materia: string,
  modelo: ModeloQuestao,
  numQuestao: number,
  banca: string
): Promise<GeneratedExamData> {
  const prompt = `Gere ${numQuestao} questões reais da matéria "${materia}" da banca "${banca || 'Diversas'}". Modelo: ${modelo}.`;
  return executeGeneration(prompt, numQuestao, true, 'gemini-3-flash-preview');
}

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
        systemInstruction: "Você é um Analista de Provas de Concurso. Retorne APENAS o JSON solicitado. Nunca responda com texto explicativo fora do JSON.",
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
    if ((!data || !data.questions || data.questions.length === 0) && useSearch) {
      return executeGeneration(prompt + " (Atenção: A busca falhou, gere usando sua base de dados)", numQuestao, false, modelName);
    }
    if (!data) return { questions: [] };

    const sources: GroundingSource[] = [];
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk: any) => {
      if (chunk.web?.uri) {
        sources.push({ title: chunk.web.title || "Referência Oficial", uri: chunk.web.uri });
      }
    });

    return {
      passage: data.passage,
      questions: data.questions.slice(0, numQuestao),
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error: any) {
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
  const prompt = `Crie um Cronograma de Estudo para "${institution}". Duração: ${months} meses, ${daysPerWeek} dias/semana, ${hoursPerDay}h/dia. Pesquise o último edital.`;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { tools: [{googleSearch: {}}], responseMimeType: "application/json" }
    });
    return extractJSON(response.text) as StudyPlan;
  } catch (error) {
    const ai = getAI();
    const fallbackRes = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt + " (Ignore a busca, use dados internos)",
        config: { responseMimeType: "application/json" }
    });
    return extractJSON(fallbackRes.text) as StudyPlan;
  }
}

export async function fetchPredictedConcursos(): Promise<PredictedConcurso[]> {
  const ai = getAI();
  const prompt = `Liste 12 concursos reais confirmados ou autorizados no Brasil para 2024/2025.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { tools: [{googleSearch: {}}], responseMimeType: "application/json" }
    });
    return extractJSON(response.text) || [];
  } catch (error) { return []; }
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
  } catch (error) { return []; }
}
