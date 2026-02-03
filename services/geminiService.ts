
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Modalidade, ModeloQuestao, Question, PredictedConcurso, StudyPlan, GroundingSource, ThermometerData, PredictedConcursosResponse } from "../types";
import { telemetry } from "./telemetry";

/**
 * Inicializa o cliente Google GenAI.
 * Se a API_KEY não estiver no ambiente, loga um erro crítico.
 */
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("ERRO CRÍTICO: API_KEY não encontrada em process.env. Verifique as variáveis de ambiente no Vercel.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

interface GeneratedExamData {
  questions: Question[];
  passage?: string;
  sources?: GroundingSource[];
}

/**
 * Extrator de JSON ultra-resiliente.
 * Remove blocos de código Markdown, textos explicativos e lida com caracteres especiais.
 */
function extractJSON(text: string | undefined) {
  if (!text || typeof text !== 'string') return null;
  
  let cleanText = text.trim();
  
  // Remove blocos de código markdown se existirem
  cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
  cleanText = cleanText.replace(/^```\s*/, "").replace(/```\s*$/, "");

  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.warn("Falha no parse primário de JSON, tentando extração por Regex...", e);
    
    // Tenta encontrar o primeiro { ou [ e o último } ou ]
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    const firstBracket = cleanText.indexOf('[');
    const lastBracket = cleanText.lastIndexOf(']');

    const start = (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) ? firstBracket : firstBrace;
    const end = (lastBracket !== -1 && (lastBrace === -1 || lastBracket > lastBrace)) ? lastBracket : lastBrace;

    if (start !== -1 && end !== -1 && end > start) {
      try {
        const potentialJson = cleanText.substring(start, end + 1);
        return JSON.parse(potentialJson);
      } catch (e2) {
        console.error("Erro fatal ao tentar extrair JSON da resposta:", e2);
        console.debug("Texto bruto recebido:", cleanText);
      }
    }
  }
  return null;
}

/**
 * Extrai fontes de grounding (URLs) para conformidade com as regras da API.
 */
function extractSources(response: GenerateContentResponse): GroundingSource[] | undefined {
  const sources: GroundingSource[] = [];
  const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
  
  if (groundingMetadata?.groundingChunks) {
    groundingMetadata.groundingChunks.forEach((chunk: any) => {
      if (chunk.web?.uri) {
        sources.push({ 
          title: chunk.web.title || "Fonte de Pesquisa", 
          uri: chunk.web.uri 
        });
      }
    });
  }
  return sources.length > 0 ? sources : undefined;
}

export async function fetchThermometerData(concurso: string, banca?: string): Promise<ThermometerData | null> {
  const model = 'gemini-3-flash-preview';
  telemetry.logAICall(model, `Termômetro: ${concurso}`);
  
  const ai = getAI();
  const prompt = `Analise os últimos concursos para: "${concurso}"${banca ? ` banca: "${banca}"` : ""}. 
  Retorne um JSON estrito seguindo o schema. Foque em frequência de assuntos e 3 questões exemplares.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
        responseMimeType: "application/json",
        // Nota: O schema ajuda, mas o grounding de busca pode injetar texto fora do JSON
        systemInstruction: "Você é um Analista de Provas. Sua resposta deve ser exclusivamente um objeto JSON válido, sem texto adicional."
      }
    });

    const data = extractJSON(response.text) as ThermometerData;
    if (data) {
      data.sources = extractSources(response);
    }
    return data;
  } catch (error) {
    console.error("Erro na API Gemini (fetchThermometerData):", error);
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
  telemetry.logAICall('gemini-3-flash-preview', `Simulado: ${concurso}`);
  
  const prompt = `Gere ${numQuestao} questões de concursos REAIS para "${concurso}" (${estado || 'Brasil'}). Banca: ${bancaPreferencia || 'Qualquer'}. Modelo: ${modelo}.`;

  return executeGeneration(prompt, numQuestao, true, 'gemini-3-flash-preview');
}

export async function generateSubjectQuestions(
  materia: string,
  modelo: ModeloQuestao,
  numQuestao: number,
  banca: string
): Promise<GeneratedExamData> {
  telemetry.logAICall('gemini-3-flash-preview', `Matéria: ${materia}`);
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
        systemInstruction: "Responda apenas com JSON. Estrutura: { passage: string, questions: Array<{id, text, options, correctAnswer, banca, ano, recorrente, explicacao}> }",
        tools: useSearch ? [{googleSearch: {}}] : undefined,
        responseMimeType: "application/json"
      }
    });

    const data = extractJSON(response.text);
    
    // Fallback: Se falhou com busca, tenta sem busca (base de conhecimento interna)
    if ((!data || !data.questions || data.questions.length === 0) && useSearch) {
      console.warn("Falha na geração com busca, tentando fallback sem busca...");
      return executeGeneration(prompt, numQuestao, false, modelName);
    }

    if (!data) throw new Error("Não foi possível obter dados válidos da IA.");

    return {
      passage: data.passage,
      questions: data.questions.slice(0, numQuestao),
      sources: extractSources(response)
    };
  } catch (error: any) {
    console.error("Erro na execução da geração Gemini:", error);
    // Se for erro de segurança ou bloqueio, tenta um prompt mais simples
    return { questions: [] };
  }
}

export async function generateStudyPlan(
  institution: string, 
  months: number, 
  daysPerWeek: number, 
  hoursPerDay: number
): Promise<StudyPlan> {
  telemetry.logAICall('gemini-3-flash-preview', `Plano: ${institution}`);
  const prompt = `Crie um Cronograma de Estudo para "${institution}". Duração: ${months} meses, ${daysPerWeek} dias/semana, ${hoursPerDay}h/dia. Retorne JSON.`;
  
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        tools: [{googleSearch: {}}], 
        responseMimeType: "application/json" 
      }
    });
    const plan = extractJSON(response.text) as StudyPlan;
    if (plan) plan.sources = extractSources(response);
    return plan;
  } catch (error) {
    console.error("Erro ao gerar plano de estudos:", error);
    throw error;
  }
}

export async function fetchPredictedConcursos(): Promise<PredictedConcursosResponse> {
  const ai = getAI();
  const prompt = `Liste 12 concursos reais confirmados ou autorizados no Brasil para 2024/2025 em formato JSON: { predictions: Array<{name, banca, officialLink, status}> }`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { tools: [{googleSearch: {}}], responseMimeType: "application/json" }
    });
    const data = extractJSON(response.text);
    return {
      predictions: data?.predictions || [],
      sources: extractSources(response)
    };
  } catch (error) {
    console.error("Erro ao buscar concursos previstos:", error);
    return { predictions: [] };
  }
}

export async function fetchConcursosSugestoes(modalidade: Modalidade): Promise<string[]> {
  const ai = getAI();
  const prompt = `Nomes de 15 concursos de modalidade ${modalidade}. Responda apenas um array JSON de strings.`;
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
