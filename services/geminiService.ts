
import { Modalidade, ModeloQuestao, Question, StudyPlan, GroundingSource, ThermometerData, PredictedConcursosResponse } from "../types";
import { telemetry } from "./telemetry";

interface GeneratedAIResponse {
  text: string;
  sources?: GroundingSource[];
}

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

function parseFlexibleJSON(text: string | undefined): any {
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
        console.error("[JSONParser] Falha crítica:", e2);
      }
    }
  }
  return null;
}

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
    if (useSearch) {
      return executeWithFallback(prompt, systemInstruction, false, model);
    }
    throw error;
  }
}

export async function fetchThermometerData(concurso: string, banca?: string): Promise<ThermometerData | null> {
  telemetry.logAICall('gemini-3-flash-preview', `Termômetro Tático: ${concurso}`);
  const prompt = `Analise o DNA de cobrança para: "${concurso}"${banca ? ` banca: "${banca}"` : ""}. 
  Não foque apenas no edital, mas em COMO a banca cobra.
  JSON esperado: { 
    "concurso": string, 
    "banca": string, 
    "analysis": string, 
    "subjects": Array<{
      "name": string, 
      "frequency": number, 
      "heatLevel": string, 
      "description": string,
      "psychology": {
        "pattern": "Literal" | "Doctrinal" | "Jurisprudential" | "Mixed",
        "commonTraps": Array<string>,
        "semanticTriggers": Array<string>,
        "candidateMistakes": Array<string>,
        "tacticalAdvice": string
      }
    }>, 
    "topQuestions": Array<Question> 
  }.
  Cada Question deve ter 'boardMindset' explicando o gatilho da questão.`;
  
  const instruction = "Você é um Analista de Inteligência de Concursos. Seu objetivo é dissecar os padrões mentais das bancas examinadoras brasileiras.";

  try {
    const res = await executeWithFallback(prompt, instruction, true);
    const parsed = parseFlexibleJSON(res.text) as ThermometerData;
    if (parsed) parsed.sources = res.sources;
    return parsed;
  } catch (error) {
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
): Promise<{ questions: Question[], passage?: string, sources?: GroundingSource[], diagnostic?: any }> {
  telemetry.logAICall('gemini-3-flash-preview', `Simulado Tático: ${concurso}`);
  const prompt = `Gere ${numQuestao} questões simulando fielmente o estilo da banca "${bancaPreferencia || 'Diversas'}" para o concurso "${concurso}". 
  JSON: { 
    "passage": string, 
    "questions": Array<{ id, text, options, correctAnswer, banca, ano, recorrente, explicacao, boardMindset }>, 
    "diagnostic": { "proTip": "Dica de como a banca inverte conceitos neste tema." } 
  }.
  IMPORTANTE: 'explicacao' deve focar na fundamentação e 'boardMindset' no estilo de cobrança.`;
  
  try {
    const res = await executeWithFallback(prompt, "Crie questões que usem as pegadinhas semânticas típicas da banca informada.", true);
    const parsed = parseFlexibleJSON(res.text);
    return {
      passage: parsed.passage,
      questions: parsed.questions?.slice(0, numQuestao) || [],
      sources: res.sources,
      diagnostic: parsed.diagnostic
    };
  } catch (error) {
    return { questions: [] };
  }
}

export async function generateSubjectQuestions(
  materia: string,
  modelo: ModeloQuestao,
  numQuestao: number,
  banca: string
): Promise<{ questions: Question[], passage?: string, sources?: GroundingSource[], diagnostic?: any }> {
  const prompt = `Gere ${numQuestao} questões de "${materia}" estilo "${banca}". 
  JSON: { "questions": Array<{ id, text, options, correctAnswer, banca, ano, recorrente, explicacao, boardMindset }> }.`;

  try {
    const res = await executeWithFallback(prompt, "Foque nos padrões mentais de cobrança da disciplina.", true);
    const parsed = parseFlexibleJSON(res.text);
    return {
      questions: parsed?.questions?.slice(0, numQuestao) || [],
      sources: res.sources,
      diagnostic: parsed?.diagnostic
    };
  } catch (error) {
    return { questions: [] };
  }
}

export async function generateStudyPlan(
  institution: string, 
  months: number, 
  daysPerWeek: number, 
  hoursPerDay: number
): Promise<StudyPlan> {
  const prompt = `Cronograma estratégico para "${institution}". JSON: { "title": string, "summary": string, "phases": Array, "criticalTopics": Array, "weeklyRoutine": Array }`;
  try {
    const res = await executeWithFallback(prompt, "Planejamento focado em vencer os padrões da banca.", true);
    const plan = parseFlexibleJSON(res.text) as StudyPlan;
    if (plan) plan.sources = res.sources;
    return plan || { title: "Erro", summary: "", phases: [], criticalTopics: [], weeklyRoutine: [] };
  } catch (error) {
    throw error;
  }
}

export async function fetchPredictedConcursos(): Promise<PredictedConcursosResponse> {
  const prompt = "12 concursos confirmados 2024/2025. JSON: { 'predictions': Array }";
  try {
    const res = await executeWithFallback(prompt, "Radar de editais.", true);
    const parsed = parseFlexibleJSON(res.text);
    return { predictions: parsed?.predictions || [], sources: res.sources };
  } catch (error) {
    return { predictions: [] };
  }
}

export async function fetchConcursosSugestoes(modalidade: Modalidade): Promise<string[]> {
  try {
    const res = await executeWithFallback(`20 nomes de concursos ${modalidade}. JSON array de strings.`, "Apenas JSON.", false);
    return parseFlexibleJSON(res.text) || [];
  } catch (error) {
    return [];
  }
}
