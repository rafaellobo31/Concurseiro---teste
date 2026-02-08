
import { User, ExamResult, Question, StudyPlan, BoardErrorAnalysis, UserStatisticsData, SubjectStat } from '../types';
import { normalizeAnswer, resolveToCanonical } from '../utils';

const DB_KEY = 'concurseiro_pro_db_v1';

class Database {
  private static instance: Database;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private initialize() {
    if (!localStorage.getItem(DB_KEY)) {
      localStorage.setItem(DB_KEY, JSON.stringify([]));
    }
  }

  private getUsers(): User[] {
    try {
      const data = localStorage.getItem(DB_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Erro ao ler banco de dados:", error);
      return [];
    }
  }

  private saveUsers(users: User[]) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(users));
    } catch (error) {
      console.error("Erro ao salvar no banco de dados:", error);
    }
  }

  public register(user: User): boolean {
    const users = this.getUsers();
    if (users.find(u => u.email.toLowerCase() === user.email.toLowerCase())) {
      return false;
    }

    const newUser: User = {
      ...user,
      email: user.email.toLowerCase(),
      favorites: user.favorites || [],
      history: user.history || [],
      savedPlans: user.savedPlans || []
    };

    users.push(newUser);
    this.saveUsers(users);
    return true;
  }

  public getUserByEmail(email: string): User | undefined {
    const users = this.getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public updateUser(email: string, updates: Partial<User>) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      if (users[index].proExpiry && users[index].proExpiry < Date.now()) {
        users[index].isPro = false;
      }
      this.saveUsers(users);
      return true;
    }
    return false;
  }

  public addExamToHistory(email: string, result: ExamResult) {
    const user = this.getUserByEmail(email);
    if (user) {
      const history = [result, ...user.history];
      return this.updateUser(email, { history });
    }
    return false;
  }

  public saveStudyPlan(email: string, plan: StudyPlan) {
    const user = this.getUserByEmail(email);
    if (user && user.isPro) {
      const planWithId = { 
        ...plan, 
        id: plan.id || Math.random().toString(36).substr(2, 9),
        date: plan.date || Date.now()
      };
      const savedPlans = [planWithId, ...(user.savedPlans || [])];
      return this.updateUser(email, { savedPlans });
    }
    return false;
  }

  public removeStudyPlan(email: string, planId: string) {
    const user = this.getUserByEmail(email);
    if (user) {
      const savedPlans = (user.savedPlans || []).filter(p => p.id !== planId);
      return this.updateUser(email, { savedPlans });
    }
    return false;
  }

  public toggleFavorite(email: string, question: Question): { success: boolean, isFavorite: boolean } {
    const user = this.getUserByEmail(email);
    if (!user || !user.isPro) return { success: false, isFavorite: false };
    
    const isAlreadyFav = user.favorites.some(q => q.id === question.id);
    let favorites = [];
    
    if (isAlreadyFav) {
      favorites = user.favorites.filter(q => q.id !== question.id);
    } else {
      favorites = [...user.favorites, question];
    }
    
    const updated = this.updateUser(email, { favorites });
    return { success: updated, isFavorite: !isAlreadyFav };
  }

  public validateCredentials(email: string, pass: string): User | null {
    const user = this.getUserByEmail(email);
    if (user && user.passwordHash === pass) {
      return user;
    }
    return null;
  }

  public getUserStats(email: string): UserStatisticsData | null {
    const user = this.getUserByEmail(email);
    if (!user || user.history.length === 0) return null;

    let totalQuestions = 0;
    let totalHits = 0;
    const subjectStats: Record<string, { total: number, hits: number }> = {};
    const bancaStats: Record<string, { total: number, hits: number }> = {};
    const evolution: { date: string, percentage: number }[] = [];

    // Processar do mais antigo para o mais novo para a evolução
    [...user.history].reverse().forEach(exam => {
      let examHits = 0;
      exam.questions.forEach(q => {
        totalQuestions++;
        const uAns = normalizeAnswer(exam.userAnswers[q.id]);
        const cAns = resolveToCanonical(q.correctAnswer || '', q.options);
        const isHit = uAns === cAns && uAns !== '';

        if (isHit) {
          totalHits++;
          examHits++;
        }

        // Stats por disciplina (Heurística)
        const subj = exam.title.replace('Simulado: ', '') || 'Geral';
        if (!subjectStats[subj]) subjectStats[subj] = { total: 0, hits: 0 };
        subjectStats[subj].total++;
        if (isHit) subjectStats[subj].hits++;

        // Stats por banca
        const banca = (q.banca || 'Diversas').toUpperCase();
        if (!bancaStats[banca]) bancaStats[banca] = { total: 0, hits: 0 };
        bancaStats[banca].total++;
        if (isHit) bancaStats[banca].hits++;
      });

      evolution.push({
        date: new Date(exam.date).toLocaleDateString('pt-BR'),
        percentage: Math.round((examHits / exam.questions.length) * 100)
      });
    });

    const subjects: SubjectStat[] = Object.entries(subjectStats).map(([name, data]) => {
      const percentage = Math.round((data.hits / data.total) * 100);
      let status: SubjectStat['status'] = 'Atenção';
      if (percentage < 40) status = 'Crítico';
      else if (percentage >= 70 && percentage < 85) status = 'Bom';
      else if (percentage >= 85) status = 'Excelente';

      return { name, total: data.total, hits: data.hits, percentage, status };
    }).sort((a, b) => a.percentage - b.percentage);

    const bancas = Object.entries(bancaStats).map(([name, data]) => ({
      name,
      percentage: Math.round((data.hits / data.total) * 100)
    })).sort((a, b) => b.percentage - a.percentage);

    return {
      totalQuestions,
      totalHits,
      overallPercentage: Math.round((totalHits / totalQuestions) * 100),
      evolution: evolution.slice(-10), // Últimos 10 simulados
      subjects,
      bancas
    };
  }

  public getBoardErrorMap(email: string): BoardErrorAnalysis[] {
    const user = this.getUserByEmail(email);
    if (!user || user.history.length === 0) return [];

    const stats: Record<string, { total: number, errors: number, subjects: Record<string, number> }> = {};

    user.history.forEach(exam => {
      exam.questions.forEach(q => {
        const banca = (q.banca || 'Diversas').toUpperCase();
        if (!stats[banca]) stats[banca] = { total: 0, errors: 0, subjects: {} };
        
        stats[banca].total++;
        
        const uAns = normalizeAnswer(exam.userAnswers[q.id]);
        const cAns = resolveToCanonical(q.correctAnswer || '', q.options);
        const isError = uAns !== cAns && uAns !== '';

        if (isError) {
          stats[banca].errors++;
          const subject = exam.title.replace('Simulado: ', '') || 'Geral';
          stats[banca].subjects[subject] = (stats[banca].subjects[subject] || 0) + 1;
        }
      });
    });

    return Object.entries(stats).map(([banca, data]) => ({
      banca,
      totalQuestions: data.total,
      errors: data.errors,
      errorRate: Math.round((data.errors / data.total) * 100),
      mostMissedSubjects: Object.entries(data.subjects)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([s]) => s)
    })).sort((a, b) => b.errorRate - a.errorRate);
  }
}

export const db = Database.getInstance();
