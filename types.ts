
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

export interface StudyTopic {
  title: string;
  frequency: string;
  content: string;
  tips: string[];
}

export interface StudyGuide {
  title: string;
  institution: string;
  topics: StudyTopic[];
  generalAdvice: string;
}

export interface PredictedConcurso {
  name: string;
  banca: string;
  officialLink: string;
  status: string;
}

export interface ThermometerData {
  concurso: string;
  banca: string;
  subjects: {
    name: string;
    frequency: number; // 0-100
    heatLevel: 'High' | 'Medium' | 'Low';
    description: string;
  }[];
  analysis: string;
  topQuestions?: Question[];
}

export type AppView = 'home' | 'simulado' | 'material' | 'materias' | 'planos' | 'previstos' | 'perfil' | 'historico' | 'favoritos' | 'auth' | 'termometro';

export interface UserPlan {
  isPro: boolean;
  tier: 'Free' | 'Pro' | 'Elite';
  proExpiry?: number;
}
