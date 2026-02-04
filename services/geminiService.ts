
import { Modalidade, ModeloQuestao, Question, StudyPlan, GroundingSource, ThermometerData, PredictedConcursosResponse } from "../types";
import { telemetry } from "./telemetry";

/**
 * Interface interna para padronizar respostas de geração com metadados de diagnóstico
 */
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
  telemetry.logAICall('gemini-3-flash-preview', `Termômetro: ${concurso}`);
  const prompt = `Analise as tendências para o concurso: "${concurso}"${banca ? ` banca: "${banca}"` : ""}. 
  JSON: { "concurso": string, "banca": string, "analysis": string, "subjects": Array<{name, frequency, heatLevel, description}>, "topQuestions": Array<Question>, "diagnostic": { "avgTime": string, "level": string, "competitionWarning": string } }`;
  const instruction = "Especialista em concursos brasileiros. Forneça análises táticas de alto nível.";

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
  telemetry.logAICall('gemini-3-flash-preview', `Simulado: ${concurso}`);
  const prompt = `Gere ${numQuestao} questões reais para "${concurso}". Banca: ${bancaPreferencia || 'Diversas'}. Modelo: ${modelo}. 
  JSON: { "passage": string, "questions": Array<Question>, "diagnostic": { "estimatedTimePerQuestion": "2:30", "difficultyLevel": "Intermediário", "proTip": "Candidatos aprovados em ${bancaPreferencia} focam em jurisprudência neste tema." } }`;
  
  try {
    const res = await executeWithFallback(prompt, "Crie simulados que desafiem o nível de aprovação.", true);
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
  const prompt = `Gere ${numQuestao} questões de "${materia}" da banca "${banca}". 
  JSON: { "questions": Array<Question>, "diagnostic": { "level": "Avançado", "avgScoreRequired": "85%" } }`;

  try {
    const res = await executeWithFallback(prompt, "Foque na recorrência tática da disciplina.", true);
    const parsed = parseFlexibleJSON(res.text);
    return {
      passage: parsed?.passage,
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
  const prompt = `Cronograma para "${institution}". ${months} meses, ${daysPerWeek} dias/semana, ${hoursPerDay}h/dia. 
  JSON: { "title": string, "summary": string, "phases": Array, "criticalTopics": Array, "weeklyRoutine": Array, "proComparison": "Alunos de elite costumam dedicar 20% mais tempo à revisão que este plano." }`;

  try {
    const res = await executeWithFallback(prompt, "Plano pedagógico de alta performance.", true);
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
