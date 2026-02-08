
export enum Modalidade {
  NACIONAL = 'Nacional',
  ESTADUAL = 'Estadual'
}

export enum ModeloQuestao {
  MULTIPLA_ESCOLHA = 'Múltipla Escolha',
  VERDADEIRO_FALSO = 'Verdadeiro / Falso'
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface BoardDNAItem {
  id: string;
  question: string;
  correctAnswer: string;
  justification: string;
  bancaMindset: string;
  armadilhaComum: string;
  referenciaLegal: string;
  ano: number;
  banca: string;
}

export interface BoardAnalysis {
  tema: string;
  banca: string;
  nivel_cobranca: 'baixo' | 'medio' | 'alto';
  frequencia_aproximada: string;
  forma_como_a_banca_cobra: string[];
  padroes_da_banca: string[];
  pegadinhas_frequentes: string[];
  erros_comuns_dos_candidatos: string[];
  como_acertar_na_prova: string[];
  exemplo_comentado: {
    enunciado_resumido: string;
    analise_da_banca: string;
    por_que_os_candidatos_erram: string;
    estrategia_para_acertar: string;
  };
}

export interface Question {
  id: string;
  text: string;
  options?: string[];
  correctAnswer?: string;
  banca: string;
  ano: number;
  recorrente: boolean;
  explicacao?: string;
  boardMindset?: string;
}

export interface ExamResult {
  id: string;
  date: number;
  title: string;
  score: number;
  total: number;
  questions: Question[];
  userAnswers: Record<string, string>;
}

export interface BoardErrorAnalysis {
  banca: string;
  totalQuestions: number;
  errors: number;
  errorRate: number;
  mostMissedSubjects: string[];
  aiTacticalAnalysis?: {
    mindset: string;
    traps: string[];
  };
}

export interface SubjectStat {
  name: string;
  total: number;
  hits: number;
  percentage: number;
  status: 'Crítico' | 'Atenção' | 'Bom' | 'Excelente';
}

export interface UserStatisticsData {
  totalQuestions: number;
  totalHits: number;
  overallPercentage: number;
  evolution: { date: string; percentage: number }[];
  subjects: SubjectStat[];
  bancas: { name: string; percentage: number }[];
  aiRecommendations?: string;
}

export interface StudyPlan {
  id?: string;
  date?: number;
  title: string;
  summary: string;
  phases: StudyPhase[];
  criticalTopics: string[];
  weeklyRoutine: string[];
  sources?: GroundingSource[];
}

export interface StudyPhase {
  name: string;
  duration: string;
  objective: string;
  subjects: string[];
}

export interface User {
  email: string;
  passwordHash: string;
  nickname: string;
  isPro: boolean;
  proExpiry?: number;
  favorites: Question[];
  history: ExamResult[];
  savedPlans: StudyPlan[];
}

export interface Exam {
  title: string;
  questions: Question[];
  passage?: string;
  modalidade?: Modalidade;
  concurso?: string;
  materia?: string;
  sources?: GroundingSource[];
}

export interface ThermometerData {
  concurso: string;
  banca: string;
  subjects: {
    name: string;
    frequency: number;
    heatLevel: 'High' | 'Medium' | 'Low';
    description: string;
    psychology?: any;
    strategicAnalysis?: BoardAnalysis;
  }[];
  analysis: string;
  topExamples?: BoardDNAItem[];
  sources?: GroundingSource[];
}

export interface PredictedConcurso {
  name: string;
  status: string;
  banca: string;
  officialLink: string;
  year?: number;
}

export interface PredictedConcursosResponse {
  predictions: PredictedConcurso[];
  sources?: GroundingSource[];
}

export type AppView = 'home' | 'simulado' | 'material' | 'materias' | 'planos' | 'previstos' | 'perfil' | 'historico' | 'favoritos' | 'auth' | 'termometro' | 'user_analysis' | 'error_map' | 'statistics';

export interface UserPlan {
  isPro: boolean;
  tier: 'Free' | 'Pro' | 'Elite';
  proExpiry?: number;
}

export type ViewMode = 'desktop' | 'mobile';
