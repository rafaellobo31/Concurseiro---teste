
export enum Modalidade {
  NACIONAL = 'Nacional',
  ESTADUAL = 'Estadual'
}

export enum ModeloQuestao {
  MULTIPLA_ESCOLHA = 'Múltipla Escolha',
  VERDADEIRO_FALSO = 'Verdadeiro / Falso'
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
  passage?: string; // Novo campo para texto base (Interpretação)
  modalidade?: Modalidade;
  concurso?: string;
  materia?: string;
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

export type AppView = 'home' | 'simulado' | 'material' | 'materias' | 'planos' | 'previstos' | 'perfil' | 'historico' | 'favoritos' | 'auth';

export interface UserPlan {
  isPro: boolean;
  tier: 'Free' | 'Pro' | 'Elite';
  proExpiry?: number;
}
