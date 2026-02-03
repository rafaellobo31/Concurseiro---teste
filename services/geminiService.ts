
import { Modalidade, ModeloQuestao, Question, StudyPlan, GroundingSource, ThermometerData, PredictedConcursosResponse } from "../types";
import { telemetry } from "./telemetry";

/**
 * Interface interna para padronizar respostas de geração
 */
interface GeneratedAIResponse {
  text: string;
  sources?: GroundingSource[];
}

/**
 * Proxy central para chamadas ao Backend.
 * Essencial para evitar exposição de chaves e erros de CORS no Vercel.
 */
async function callGeminiProxy(payload: { model: string, contents: any, config?: any }): Promise<any> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.error || `Erro de Rede: ${response.status}`;
    console.error(`[GeminiProxy] Falha: ${msg}`);
    throw new Error(msg);
  }

  return await response.json();
}

/**
 * Parser resiliente para extração de JSON de blocos de texto da IA.
 */
function parseFlexibleJSON(text: string | undefined): any {
  if (!text) return null;
  
  // 1. Limpeza agressiva de Markdown
  let cleanText = text.trim();
  cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
  cleanText = cleanText.replace(/^```\s*/, "").replace(/```\s*$/, "");

  // 2. Tentativa de parse direto
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.warn("[JSONParser] Falha no parse direto, tentando extração por Regex.");
    
    // 3. Fallback: Extração do primeiro objeto {} ou array [] encontrado no texto
    const match = cleanText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        console.error("[JSONParser] Falha crítica na extração por Regex:", e2);
      }
    }
  }
  return null;
}

/**
 * Extrai fontes de busca web (Grounding)
 */
function extractSources(data: any): GroundingSource[] | undefined {
  const sources: GroundingSource[] = [];
  const metadata = data.candidates?.[0]?.groundingMetadata;
  if (metadata?.groundingChunks) {
    metadata.groundingChunks.forEach((chunk: any) => {
      if (chunk.web?.uri) {
        sources.push({ title: chunk.web.title || "Referência Externa", uri: chunk.web.uri });
      }
    });
  }
  return sources.length > 0 ? sources : undefined;
}

/**
 * Executor genérico com retry e fallback de Grounding Search.
 * Se a busca do Google falhar (quota/região), tenta novamente sem ferramentas.
 */
async function executeWithFallback(
  prompt: string, 
  systemInstruction: string, 
  useSearch: boolean = false,
  model: string = 'gemini-3-flash-preview'
): Promise<GeneratedAIResponse> {
  try {
    const data = await callGeminiProxy({
      model,
      contents: prompt,
      config: {
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
        systemInstruction: systemInstruction + " Sua resposta deve ser exclusivamente um objeto JSON válido."
      }
    });

    return {
      text: data.text || "",
      sources: extractSources(data)
    };
  } catch (error: any) {
    // Se falhou com busca, tenta sem busca antes de desistir
    if (useSearch) {
      console.warn(`[GeminiService] Falha na busca web. Tentando fallback sem Grounding...`);
      return executeWithFallback(prompt, systemInstruction, false, model);
    }
    throw error;
  }
}

// --- Funções Exportadas ---

export async function fetchThermometerData(concurso: string, banca?: string): Promise<ThermometerData | null> {
  telemetry.logAICall('gemini-3-flash-preview', `Termômetro: ${concurso}`);
  const prompt = `Analise as tendências para o concurso: "${concurso}"${banca ? ` banca: "${banca}"` : ""}. 
  Retorne um JSON: { "concurso": string, "banca": string, "analysis": string, "subjects": Array<{name, frequency, heatLevel, description}>, "topQuestions": Array<Question> }`;
  const instruction = "Você é um especialista em análise estatística de concursos brasileiros.";

  try {
    const res = await executeWithFallback(prompt, instruction, true);
    const parsed = parseFlexibleJSON(res.text) as ThermometerData;
    if (parsed) parsed.sources = res.sources;
    return parsed;
  } catch (error) {
    console.error("fetchThermometerData falhou:", error);
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
): Promise<{ questions: Question[], passage?: string, sources?: GroundingSource[] }> {
  telemetry.logAICall('gemini-3-flash-preview', `Simulado: ${concurso}`);
  const prompt = `Gere ${numQuestao} questões de concursos REAIS para "${concurso}" (${estado || 'Brasil'}). Banca: ${bancaPreferencia || 'Qualquer'}. Modelo: ${modelo}. 
  JSON: { "passage": string (opcional), "questions": Array<{id, text, options, correctAnswer, banca, ano, recorrente, explicacao}> }`;
  const instruction = "Gere questões com rigor técnico de bancas examinadoras.";

  try {
    const res = await executeWithFallback(prompt, instruction, true);
    const parsed = parseFlexibleJSON(res.text);
    if (!parsed || !parsed.questions) throw new Error("Estrutura de questões inválida.");
    
    return {
      passage: parsed.passage,
      questions: parsed.questions.slice(0, numQuestao),
      sources: res.sources
    };
  } catch (error) {
    console.error("generateExamQuestions falhou:", error);
    return { questions: [] };
  }
}

// Fixed missing passage in return type and prompt to resolve error in App.tsx
export async function generateSubjectQuestions(
  materia: string,
  modelo: ModeloQuestao,
  numQuestao: number,
  banca: string
): Promise<{ questions: Question[], passage?: string, sources?: GroundingSource[] }> {
  telemetry.logAICall('gemini-3-flash-preview', `Matéria: ${materia}`);
  const prompt = `Gere ${numQuestao} questões reais da matéria "${materia}" da banca "${banca || 'Diversas'}". Modelo: ${modelo}.
  JSON: { "passage": string (opcional), "questions": Array<Question> }`;
  const instruction = "Seja fiel aos padrões das bancas citadas.";

  try {
    const res = await executeWithFallback(prompt, instruction, true);
    const parsed = parseFlexibleJSON(res.text);
    return {
      passage: parsed?.passage,
      questions: parsed?.questions?.slice(0, numQuestao) || [],
      sources: res.sources
    };
  } catch (error) {
    console.error("generateSubjectQuestions falhou:", error);
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
  const prompt = `Cronograma para "${institution}". Duração: ${months} meses, ${daysPerWeek} dias/semana, ${hoursPerDay}h/dia. 
  JSON: { "title": string, "summary": string, "phases": Array, "criticalTopics": Array, "weeklyRoutine": Array }`;
  const instruction = "Crie um plano pedagógico focado em alto rendimento.";

  try {
    const res = await executeWithFallback(prompt, instruction, true);
    const plan = parseFlexibleJSON(res.text) as StudyPlan;
    if (plan) plan.sources = res.sources;
    return plan || { title: "Falha na geração", summary: "", phases: [], criticalTopics: [], weeklyRoutine: [] };
  } catch (error) {
    console.error("generateStudyPlan falhou:", error);
    throw error;
  }
}

export async function fetchPredictedConcursos(): Promise<PredictedConcursosResponse> {
  const prompt = "Liste 12 concursos reais confirmados ou autorizados no Brasil para 2024/2025. JSON: { 'predictions': Array<{name, banca, officialLink, status}> }";
  
  try {
    const res = await executeWithFallback(prompt, "Você é um radar de notícias de concursos.", true);
    const parsed = parseFlexibleJSON(res.text);
    return {
      predictions: parsed?.predictions || [],
      sources: res.sources
    };
  } catch (error) {
    console.error("fetchPredictedConcursos falhou:", error);
    return { predictions: [] };
  }
}

export async function fetchConcursosSugestoes(modalidade: Modalidade): Promise<string[]> {
  const prompt = `Liste 20 nomes de concursos da modalidade ${modalidade} em um array JSON de strings.`;
  try {
    const res = await executeWithFallback(prompt, "Responda apenas com o JSON.", false);
    return parseFlexibleJSON(res.text) || [];
  } catch (error) {
    return [];
  }
}
