
import { User, ExamResult, Question, StudyPlan } from '../types';

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

  /**
   * Registra um novo usuário no banco.
   */
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

  /**
   * Busca um usuário pelo e-mail (ID único).
   */
  public getUserByEmail(email: string): User | undefined {
    const users = this.getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  /**
   * Atualiza dados de um usuário existente.
   */
  public updateUser(email: string, updates: Partial<User>) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      
      // Lógica de expiração PRO automática no banco
      if (users[index].proExpiry && users[index].proExpiry < Date.now()) {
        users[index].isPro = false;
      }
      
      this.saveUsers(users);
      return true;
    }
    return false;
  }

  /**
   * Gerenciamento de Histórico de Simulados.
   */
  public addExamToHistory(email: string, result: ExamResult) {
    const user = this.getUserByEmail(email);
    if (user) {
      const history = [result, ...user.history];
      return this.updateUser(email, { history });
    }
    return false;
  }

  /**
   * Persistência de Cronogramas IA.
   */
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

  /**
   * Gerenciamento de Biblioteca de Favoritos.
   */
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

  /**
   * Validação de Credenciais.
   */
  public async validateCredentials(email: string, pass: string): Promise<User | null> {
    const user = this.getUserByEmail(email);
    if (!user) return null;
    
    // Import dinâmico para evitar dependência circular se houver
    const { hashPassword } = await import('../utils');
    const hashed = await hashPassword(pass);
    
    if (user.passwordHash === hashed || user.passwordHash === pass) { // Mantém compatibilidade com senhas antigas não hashadas
      return user;
    }
    return null;
  }
}

// Exporta como Singleton
export const db = Database.getInstance();
