
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

export interface Question {
  id: string;
  text: string;
  options?: string[];
  correctAnswer: string;
  banca: string;
  ano: number;
  recorrente: boolean;
  explicacao: string;
  boardMindset?: string; // Como a banca pensou esta questão
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

export interface StudyPhase {
  name: string;
  duration: string;
  objective: string;
  subjects: string[];
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

export interface BoardPsychology {
  pattern: 'Literal' | 'Doctrinal' | 'Jurisprudential' | 'Mixed';
  commonTraps: string[];
  semanticTriggers: string[];
  candidateMistakes: string[];
  tacticalAdvice: string;
}

export interface ThermometerData {
  concurso: string;
  banca: string;
  subjects: {
    name: string;
    frequency: number;
    heatLevel: 'High' | 'Medium' | 'Low';
    description: string;
    psychology?: BoardPsychology; // Dados exclusivos PRO
  }[];
  analysis: string;
  topQuestions?: Question[];
  sources?: GroundingSource[];
}

// Fix: Added missing PredictedConcurso interface used in PredictedConcursos component
export interface PredictedConcurso {
  name: string;
  status: string;
  banca: string;
  officialLink: string;
}

// Fix: Added missing PredictedConcursosResponse interface used in geminiService
export interface PredictedConcursosResponse {
  predictions: PredictedConcurso[];
  sources?: GroundingSource[];
}

export type AppView = 'home' | 'simulado' | 'material' | 'materias' | 'planos' | 'previstos' | 'perfil' | 'historico' | 'favoritos' | 'auth' | 'termometro' | 'user_analysis';

export interface UserPlan {
  isPro: boolean;
  tier: 'Free' | 'Pro' | 'Elite';
  proExpiry?: number;
}

export type ViewMode = 'desktop' | 'mobile';
