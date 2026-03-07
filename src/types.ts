
export enum Modalidade {
  NACIONAL = 'Nacional',
  ESTADUAL = 'Estadual',
  MUNICIPAL = 'Municipal'
}

export enum ModeloQuestao {
  MULTIPLA_ESCOLHA = 'Múltipla Escolha',
  VERDADEIRO_FALSO = 'Certo/Errado'
}

export enum Nivel {
  MEDIO = 'Médio',
  TECNICO = 'Técnico',
  SUPERIOR = 'Superior'
}

export type AppView = 'home' | 'simulado' | 'materias' | 'termometro' | 'material' | 'previstos' | 'perfil' | 'auth' | 'planos' | 'historico' | 'user_analysis' | 'assinatura_retorno' | 'admin';

export interface Question {
  id: string;
  text: string;
  options?: string[];
  correctAnswer: string;
  banca: string;
  ano: number;
  recorrente?: boolean;
  explicacao: string;
  boardMindset?: string;
}

export interface Exam {
  title: string;
  questions: Question[];
  passage?: string;
  modalidade?: Modalidade;
  concurso?: string;
  nivel?: Nivel;
  cargoArea?: string;
  banca?: string;
  estado?: string;
  materia?: string;
  sources?: GroundingSource[];
}

export interface UserPlan {
  isPro: boolean;
  tier: 'Free' | 'Pro';
  proExpiry?: number;
  plan_status?: string;
  plan_source?: string;
  plan_expires_at?: string;
}

export interface User {
  email: string;
  nickname: string;
  passwordHash: string;
  isPro: boolean;
  proExpiry?: number;
  plan_status?: string;
  plan_source?: string;
  plan_expires_at?: string;
  mp_preapproval_id?: string;
  mp_last_payment_id?: string;
  favorites: Question[];
  history: ExamResult[];
  savedPlans: StudyPlan[];
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

export interface StudyPlan {
  id?: string;
  date?: number;
  title: string;
  summary: string;
  phases: any[];
  criticalTopics: any[];
  weeklyRoutine: any[];
  sources?: GroundingSource[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export type ViewMode = 'desktop' | 'mobile';

export interface ThermometerData {
  concurso: string;
  banca: string;
  analysis: string;
  subjects: Array<{
    name: string;
    frequency: number;
    heatLevel: string;
    description: string;
    strategicAnalysis?: {
      nivel_cobranca: string;
      pegadinhas_frequentes: string[];
      padroes_da_banca: string[];
      como_acertar_na_prova: string[];
    };
  }>;
  topExamples: BoardDNAItem[];
  sources?: GroundingSource[];
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

export interface PredictedConcurso {
  name: string;
  status: 'CONFIRMADO' | 'PREVISTO';
  banca: string;
  officialLink: string;
  year: number;
}

export interface PredictedConcursosResponse {
  predictions: PredictedConcurso[];
  sources?: GroundingSource[];
}
