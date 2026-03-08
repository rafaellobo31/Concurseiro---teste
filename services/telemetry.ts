
const TELEMETRY_KEY = 'cpro_telemetry_logs';

export interface TelemetryLog {
  id: string;
  timestamp: number;
  event: 'ai_request' | 'subscription' | 'user_registration' | 'login';
  metadata: {
    model?: string;
    tokensEstimated?: number;
    costEstimated?: number;
    plan?: string;
    value?: number;
    description?: string;
  };
}

class TelemetryService {
  private static instance: TelemetryService;

  private constructor() {}

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  private getLogs(): TelemetryLog[] {
    const logs = localStorage.getItem(TELEMETRY_KEY);
    return logs ? JSON.parse(logs) : [];
  }

  private saveLog(log: TelemetryLog) {
    const logs = this.getLogs();
    logs.push(log);
    // Em um cenário real, aqui faríamos um POST para sua API de relatórios
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(logs));
  }

  /**
   * Registra uma chamada de IA e estima o custo (base Gemini 3 Flash)
   */
  public logAICall(model: string, description: string) {
    // Estimativa conservadora de tokens para simulados (média de 4000 tokens entre entrada/saída)
    const tokens = 4000; 
    const pricePerToken = 0.0000003; // ~ $0.30 por 1M tokens
    const cost = tokens * pricePerToken;

    this.saveLog({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      event: 'ai_request',
      metadata: {
        model,
        tokensEstimated: tokens,
        costEstimated: cost,
        description
      }
    });
  }

  public logSubscription(plan: string, value: number) {
    this.saveLog({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      event: 'subscription',
      metadata: { plan, value }
    });
  }

  public logRegistration() {
    this.saveLog({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      event: 'user_registration',
      metadata: {}
    });
  }

  public getStats() {
    const logs = this.getLogs();
    return {
      totalRequests: logs.filter(l => l.event === 'ai_request').length,
      totalCost: logs.reduce((acc, l) => acc + (l.metadata.costEstimated || 0), 0),
      totalRevenue: logs.reduce((acc, l) => acc + (l.metadata.value || 0), 0),
      registrations: logs.filter(l => l.event === 'user_registration').length,
      logs: logs.reverse().slice(0, 50)
    };
  }
}

export const telemetry = TelemetryService.getInstance();
