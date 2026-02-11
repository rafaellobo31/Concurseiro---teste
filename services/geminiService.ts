
import { Modalidade, ModeloQuestao, Question, StudyPlan, GroundingSource, ThermometerData, PredictedConcursosResponse, BoardDNAItem, Nivel } from "../types";
import { telemetry } from "./telemetry";

interface GeneratedAIResponse {
  text: string;
  sources?: GroundingSource[];
}

const SYSTEM_INSTRUCTION = `Você é um especialista absoluto em concursos públicos brasileiros, com foco profundo em ANÁLISE DE PADRÕES DE COBRANÇA DE BANCAS EXAMINADORAS.
Seu papel NÃO é explicar a matéria de forma didática tradicional. Seu papel é analisar COMO a banca pensa, COMO ela cobra e COMO ela induz o candidato ao erro.
Você deve agir como um decodificador da mente da banca, baseando-se em provas reais, recorrência estatística e forma de redação das questões.
Toda resposta deve ser estritamente em JSON válido.`;

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
  systemInstruction: string = SYSTEM_INSTRUCTION, 
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
  const prompt = `Realize uma análise profunda de DNA de cobrança para: "${concurso}"${banca ? ` banca: "${banca}"` : ""}.
  
  REGRAS PARA EXEMPLOS PRÁTICOS (DNA_BANCA):
  Os exemplos NÃO são simulados interativos. São questões RESOLVIDAS para estudo estratégico.
  Não use "options", não use radio buttons. Exiba o gabarito e a análise mental da banca.
  
  JSON esperado: { 
    "concurso": string, 
    "banca": string, 
    "analysis": string, 
    "subjects": Array<{
      "name": string, 
      "frequency": number, 
      "heatLevel": string, 
      "description": string,
      "strategicAnalysis": {
        "tema": string,
        "banca": string,
        "nivel_cobranca": "baixo | medio | alto",
        "frequencia_aproximada": string,
        "forma_como_a_banca_cobra": string[],
        "padroes_da_banca": string[],
        "pegadinhas_frequentes": string[],
        "erros_comuns_dos_candidatos": string[],
        "como_acertar_na_prova": string[],
        "exemplo_comentado": {
          "enunciado_resumido": string,
          "analise_da_banca": string,
          "por_que_os_candidatos_erram": string,
          "estrategia_para_acertar": string
        }
      }
    }>, 
    "topExamples": Array<{
      "id": string,
      "question": string,
      "correctAnswer": string,
      "justification": string,
      "bancaMindset": string,
      "armadilhaComum": string,
      "referenciaLegal": string,
      "ano": number,
      "banca": string
    }> 
  }.`;

  try {
    const res = await executeWithFallback(prompt, SYSTEM_INSTRUCTION, true);
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
  nivel: Nivel | string | undefined,
  cargoArea: string | undefined,
  modelo: ModeloQuestao,
  numQuestao: number,
  bancaPreferencia?: string,
  batchIndex: number = 0,
  estado?: string
): Promise<{ questions: Question[], passage?: string, sources?: GroundingSource[], diagnostic?: any }> {
  telemetry.logAICall('gemini-3-flash-preview', `Simulado Tático: ${concurso}`);
  
  const contextNivel = nivel ? `nível: ${nivel}` : '';
  const contextCargo = cargoArea ? `cargo/área: ${cargoArea}` : '';
  
  const prompt = `Gere EXATAMENTE ${numQuestao} questões reais (ou baseadas em padrões reais) para o concurso "${concurso}" banca "${bancaPreferencia || 'Diversas'}".
  Contexto adicional: ${contextNivel}, ${contextCargo}.
  
  REGRAS DE COMPLEXIDADE:
  - Se o cargo/área for "Geral" ou não especificado, use o padrão do edital mais recente.
  - Ajuste o nível de dificuldade técnica conforme o nível: ${nivel || 'Médio'}.
  
  JSON: { 
    "passage": string, 
    "questions": Array<{ 
      id, text, options, correctAnswer, banca, ano, recorrente, 
      explicacao, 
      boardMindset: "DNA técnico de como a banca formulou esta pegadinha específica" 
    }>, 
    "diagnostic": { "proTip": "Análise de onde os candidatos mais erram neste perfil de prova" } 
  }.`;
  
  try {
    const res = await executeWithFallback(prompt, SYSTEM_INSTRUCTION, true);
    const parsed = parseFlexibleJSON(res.text);
    return {
      passage: parsed?.passage,
      questions: Array.isArray(parsed?.questions) ? parsed.questions.slice(0, numQuestao) : [],
      sources: res.sources,
      diagnostic: parsed?.diagnostic
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
    const res = await executeWithFallback(prompt, SYSTEM_INSTRUCTION, true);
    const parsed = parseFlexibleJSON(res.text);
    return {
      questions: Array.isArray(parsed?.questions) ? parsed.questions.slice(0, numQuestao) : [],
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
    const res = await executeWithFallback(prompt, SYSTEM_INSTRUCTION, true);
    const plan = parseFlexibleJSON(res.text) as StudyPlan;
    if (plan) plan.sources = res.sources;
    return plan || { title: "Erro", summary: "", phases: [], criticalTopics: [], weeklyRoutine: [] };
  } catch (error) {
    throw error;
  }
}

export async function fetchPredictedConcursos(): Promise<PredictedConcursosResponse> {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  const prompt = `Aja como um Analista de Inteligência Sênior especializado em curadoria de editais. 
  Escaneie Diários Oficiais, portais governamentais e páginas de bancas organizadoras para listar concursos REAIS.
  
  REGRAS DE CURADORIA:
  1. TEMPORALIDADE: Apenas concursos de ${currentYear} e ${nextYear}.
  2. CLASSIFICAÇÃO: Somente "CONFIRMADO" (edital ou autorização oficial) ou "PREVISTO" (base documental ou nota técnica).
  3. FONTES: Somente links OFICIAIS (gov.br, portais de órgãos ou bancas). EXCLUA blogs, rumores e sites de notícias genéricos.
  4. VERACIDADE: Se não houver link oficial funcional ou base documental sólida, NÃO inclua o concurso.
  
  JSON: { 'predictions': Array<{ name, status: 'CONFIRMADO' | 'PREVISTO', banca, officialLink, year: number }> }`;
  
  try {
    const res = await executeWithFallback(prompt, SYSTEM_INSTRUCTION, true);
    const parsed = parseFlexibleJSON(res.text);
    
    return { 
      predictions: Array.isArray(parsed?.predictions) ? parsed.predictions : [], 
      sources: res.sources 
    };
  } catch (error) {
    console.error("[geminiService] Erro ao buscar previstos:", error);
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
