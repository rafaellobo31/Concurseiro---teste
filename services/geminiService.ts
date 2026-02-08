
import { Modalidade, ModeloQuestao, Question, StudyPlan, GroundingSource, ThermometerData, PredictedConcursosResponse, BoardDNAItem, UserStatisticsData } from "../types";
import { telemetry } from "./telemetry";

const CACHE_KEY = 'cpro_ia_cache_v2';

interface IACache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

class CacheManager {
  private cache: IACache = {};

  constructor() {
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      if (saved) this.cache = JSON.parse(saved);
    } catch (e) {
      this.cache = {};
    }
  }

  get(key: string) {
    const entry = this.cache[key];
    if (entry && Date.now() - entry.timestamp < 7 * 24 * 60 * 60 * 1000) {
      return entry.data;
    }
    return null;
  }

  set(key: string, data: any) {
    this.cache[key] = { data, timestamp: Date.now() };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
    } catch (e) {}
  }

  generateKey(...args: any[]) {
    return args.join('|').toLowerCase();
  }
}

export const iaCache = new CacheManager();

interface GeneratedAIResponse {
  text: string;
  sources?: GroundingSource[];
}

const SYSTEM_INSTRUCTION = `Você é um especialista absoluto em concursos brasileiros. Sua missão é DECODIFICAR a banca.
Aja com precisão cirúrgica. Siga rigorosamente o formato JSON solicitado.`;

async function callGeminiProxy(payload: { model: string, contents: any, config?: any }): Promise<any> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro de Rede: ${response.status}`);
  }

  return await response.json();
}

function parseFlexibleJSON(text: string | undefined): any {
  if (!text) return null;
  let cleanText = text.trim();
  cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
  try { return JSON.parse(cleanText); } catch (e) {
    const match = cleanText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) try { return JSON.parse(match[0]); } catch (e2) {}
  }
  return null;
}

async function executeWithFallback(
  prompt: string, 
  systemInstruction: string = SYSTEM_INSTRUCTION, 
  useSearch: boolean = false,
  model: string = 'gemini-3-flash-preview'
): Promise<GeneratedAIResponse> {
  const data = await callGeminiProxy({
    model,
    contents: prompt,
    config: {
      tools: useSearch ? [{ googleSearch: {} }] : undefined,
      systemInstruction: systemInstruction + " Responda exclusivamente em JSON."
    }
  });

  return {
    text: data.text || "",
    sources: data.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
      title: c.web?.title || "Fonte",
      uri: c.web?.uri
    })).filter((s: any) => s.uri)
  };
}

export async function fetchIntelligentRecommendations(stats: UserStatisticsData): Promise<string> {
  const cacheKey = iaCache.generateKey('stats_recommendations', stats.totalQuestions, stats.overallPercentage);
  const cached = iaCache.get(cacheKey);
  if (cached) return cached;

  telemetry.logAICall('gemini-3-flash-preview', 'Recomendações Estatísticas');
  const prompt = `Analise estas estatísticas de um aluno de concursos e forneça uma recomendação PRÁTICA e TÁTICA de estudo.
  Status Geral: ${stats.overallPercentage}% de acertos em ${stats.totalQuestions} questões.
  Disciplinas Críticas: ${stats.subjects.filter(s => s.status === 'Crítico').map(s => s.name).join(', ')}.
  Disciplinas Boas: ${stats.subjects.filter(s => s.status === 'Bom').map(s => s.name).join(', ')}.
  Banca com maior dificuldade: ${stats.bancas.length > 0 ? stats.bancas[stats.bancas.length - 1].name : 'N/A'}.
  JSON: { "recommendation": "Texto direto e mentor com orientações de estudo" }`;

  const res = await executeWithFallback(prompt);
  const parsed = parseFlexibleJSON(res.text);
  const text = parsed?.recommendation || "Continue focado na resolução de questões das bancas principais.";
  iaCache.set(cacheKey, text);
  return text;
}

export async function generateExamSkeleton(
  modalidade: Modalidade,
  concurso: string,
  modelo: ModeloQuestao,
  numQuestao: number,
  banca: string,
  estado?: string
): Promise<{ questions: Question[], passage?: string, sources?: GroundingSource[], diagnostic?: any }> {
  const cacheKey = iaCache.generateKey('skeleton', modalidade, concurso, modelo, numQuestao, banca, estado);
  const cached = iaCache.get(cacheKey);
  if (cached) return cached;

  telemetry.logAICall('gemini-3-flash-preview', `Fase 1 Skeleton: ${concurso}`);
  const prompt = `Gere ${numQuestao} questões de concurso para "${concurso}" banca "${banca}". 
  JSON: { "passage": string, "questions": Array<{ id, text, options: string[], banca, ano, recorrente: boolean }>, "diagnostic": { "proTip": string, "difficultyLevel": string } }.
  NÃO gere gabarito nem explicações nesta fase.`;

  const res = await executeWithFallback(prompt, "Gerador ultra-rápido de enunciados.");
  const parsed = parseFlexibleJSON(res.text);
  const result = {
    passage: parsed?.passage,
    questions: Array.isArray(parsed?.questions) ? parsed.questions.slice(0, numQuestao) : [],
    sources: res.sources,
    diagnostic: parsed?.diagnostic
  };

  if (result.questions.length > 0) iaCache.set(cacheKey, result);
  return result;
}

export async function fetchQuestionsDetails(questions: Question[], isPro: boolean): Promise<Record<string, Partial<Question>>> {
  const detailsToFetch = questions.filter(q => !q.correctAnswer);
  if (detailsToFetch.length === 0) return {};

  const batchKey = iaCache.generateKey('details', ...detailsToFetch.map(q => q.id));
  const cached = iaCache.get(batchKey);
  if (cached) return cached;

  telemetry.logAICall('gemini-3-flash-preview', `Fase 2 Details: ${questions.length} q`);
  const prompt = `Para estas questões de concurso, forneça o gabarito e a explicação técnica.
  ${isPro ? 'Inclua o Mindset da Banca (como ela cobra esse tema).' : 'Explicação resumida.'}
  Questões: ${JSON.stringify(detailsToFetch.map(q => ({ id: q.id, text: q.text })))}
  JSON: { "details": { "ID": { "correctAnswer": string, "explicacao": string, "boardMindset": string } } }`;

  const res = await executeWithFallback(prompt, "Analista sênior de gabaritos.");
  const parsed = parseFlexibleJSON(res.text);
  const details = parsed?.details || {};
  iaCache.set(batchKey, details);
  return details;
}

export async function fetchBancaTacticalAnalysis(banca: string, missedSubjects: string[]): Promise<any> {
  const cacheKey = iaCache.generateKey('banca_tactical', banca, ...missedSubjects);
  const cached = iaCache.get(cacheKey);
  if (cached) return cached;

  telemetry.logAICall('gemini-3-flash-preview', `Análise Tática Banca: ${banca}`);
  const prompt = `Analise o perfil de cobrança da banca "${banca}" focado nos assuntos onde o candidato mais errou: ${missedSubjects.join(', ')}.
  JSON: { "mindset": "Descrição técnica de como a banca pensa e redige questões destes temas", "traps": ["Bullet 1 de armadilha", "Bullet 2"] }`;

  const res = await executeWithFallback(prompt);
  const parsed = parseFlexibleJSON(res.text);
  if (parsed) iaCache.set(cacheKey, parsed);
  return parsed;
}

export async function generateExamQuestions(
  modalidade: Modalidade,
  concurso: string,
  modelo: ModeloQuestao,
  numQuestao: number,
  bancaPreferencia?: string,
  batchIndex: number = 0,
  estado?: string
) {
  return generateExamSkeleton(modalidade, concurso, modelo, numQuestao, bancaPreferencia || 'Diversas', estado);
}

export async function generateSubjectQuestions(
  materia: string,
  modelo: ModeloQuestao,
  numQuestao: number,
  banca: string
): Promise<{ questions: Question[], sources?: GroundingSource[], diagnostic?: any }> {
  const cacheKey = iaCache.generateKey('skeleton_subject', materia, modelo, numQuestao, banca);
  const cached = iaCache.get(cacheKey);
  if (cached) return cached;

  const prompt = `Gere ${numQuestao} questões de "${materia}" banca "${banca}". 
  JSON: { "questions": Array<{ id, text, options: string[], banca, ano, recorrente: boolean }>, "diagnostic": { "proTip": string, "difficultyLevel": string } }.`;

  const res = await executeWithFallback(prompt);
  const parsed = parseFlexibleJSON(res.text);
  const result = {
    questions: Array.isArray(parsed?.questions) ? parsed.questions.slice(0, numQuestao) : [],
    sources: res.sources,
    diagnostic: parsed?.diagnostic
  };

  if (result.questions.length > 0) iaCache.set(cacheKey, result);
  return result;
}

export async function fetchThermometerData(concurso: string, banca?: string): Promise<ThermometerData | null> {
  const cacheKey = iaCache.generateKey('thermometer', concurso, banca);
  const cached = iaCache.get(cacheKey);
  if (cached) return cached;

  const prompt = `Analise DNA de cobrança para: "${concurso}"${banca ? ` banca: "${banca}"` : ""}.
  JSON: { "concurso", "banca", "analysis", "subjects": Array, "topExamples": Array }`;

  const res = await executeWithFallback(prompt, SYSTEM_INSTRUCTION, true);
  const parsed = parseFlexibleJSON(res.text);
  if (parsed) {
    parsed.sources = res.sources;
    iaCache.set(cacheKey, parsed);
  }
  return parsed;
}

export async function generateStudyPlan(institution: string, months: number, daysPerWeek: number, hoursPerDay: number): Promise<StudyPlan> {
  const cacheKey = iaCache.generateKey('studyplan', institution, months, daysPerWeek, hoursPerDay);
  const cached = iaCache.get(cacheKey);
  if (cached) return cached;

  const prompt = `Cronograma para "${institution}". JSON: { "title", "summary", "phases", "criticalTopics", "weeklyRoutine" }`;
  const res = await executeWithFallback(prompt, SYSTEM_INSTRUCTION, true);
  const plan = parseFlexibleJSON(res.text);
  if (plan) {
    plan.sources = res.sources;
    iaCache.set(cacheKey, plan);
  }
  return plan;
}

export async function fetchPredictedConcursos(): Promise<PredictedConcursosResponse> {
  const cacheKey = iaCache.generateKey('predicted_radar');
  const cached = iaCache.get(cacheKey);
  if (cached) return cached;

  const prompt = `Radar de concursos 2024/2025. JSON: { 'predictions': Array<{ name, status, banca, officialLink, year }> }`;
  const res = await executeWithFallback(prompt, SYSTEM_INSTRUCTION, true);
  const parsed = parseFlexibleJSON(res.text);
  const result = { predictions: Array.isArray(parsed?.predictions) ? parsed.predictions : [], sources: res.sources };
  
  if (result.predictions.length > 0) iaCache.set(cacheKey, result);
  return result;
}

export async function fetchConcursosSugestoes(modalidade: Modalidade): Promise<string[]> {
  const res = await executeWithFallback(`20 nomes de concursos ${modalidade}. JSON array de strings.`, "Apenas JSON.", false);
  return parseFlexibleJSON(res.text) || [];
}
