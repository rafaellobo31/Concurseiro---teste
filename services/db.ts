
import { User, ExamResult, Question, StudyPlan } from '../types';

const DB_KEY = 'concurseiro_pro_db';

class Database {
  private getUsers(): User[] {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveUsers(users: User[]) {
    localStorage.setItem(DB_KEY, JSON.stringify(users));
  }

  public register(user: User): boolean {
    const users = this.getUsers();
    if (users.find(u => u.email === user.email)) return false;
    // Inicializa campos vazios se não fornecidos
    const newUser = {
      ...user,
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
    const user = users.find(u => u.email === email);
    if (user && !user.savedPlans) user.savedPlans = [];
    return user;
  }

  public updateUser(email: string, updates: Partial<User>) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.email === email);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      // Check PRO Expiry
      if (users[index].proExpiry && users[index].proExpiry < Date.now()) {
        users[index].isPro = false;
      }
      this.saveUsers(users);
    }
  }

  public addExamToHistory(email: string, result: ExamResult) {
    const user = this.getUserByEmail(email);
    if (user) {
      const history = [result, ...user.history];
      this.updateUser(email, { history });
    }
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
      this.updateUser(email, { savedPlans });
      return true;
    }
    return false;
  }

  public removeStudyPlan(email: string, planId: string) {
    const user = this.getUserByEmail(email);
    if (user) {
      const savedPlans = (user.savedPlans || []).filter(p => p.id !== planId);
      this.updateUser(email, { savedPlans });
    }
  }

  public toggleFavorite(email: string, question: Question): boolean {
    const user = this.getUserByEmail(email);
    if (!user || !user.isPro) return false;
    
    const isFav = user.favorites.some(q => q.id === question.id);
    let favorites = [];
    if (isFav) {
      favorites = user.favorites.filter(q => q.id !== question.id);
    } else {
      favorites = [...user.favorites, question];
    }
    this.updateUser(email, { favorites });
    return !isFav;
  }
}

export const db = new Database();
