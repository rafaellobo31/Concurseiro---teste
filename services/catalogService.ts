
import { Nivel } from "../types";

const CATALOG_CACHE_KEY = 'cpro_catalog_cache_v1';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias

export interface CatalogLevel {
  nivel: Nivel | string;
  cargos: string[];
}

export interface ContestCatalog {
  concurso: string;
  hasLevels: boolean;
  levels: CatalogLevel[];
  notes?: string;
  timestamp: number;
}

// Mapa local preservado como fallback imediato para os mais comuns
const LOCAL_MAP: Record<string, Partial<Record<Nivel, string[]>>> = {
  'INSS': {
    [Nivel.TECNICO]: ['Técnico do Seguro Social'],
    [Nivel.SUPERIOR]: ['Analista do Seguro Social (Serviço Social)', 'Analista do Seguro Social (Administrativo)']
  },
  'Polícia Federal (PF)': {
    [Nivel.SUPERIOR]: ['Agente', 'Escrivão', 'Papiloscopista', 'Delegado', 'Perito']
  },
  'Banco do Brasil': {
    [Nivel.MEDIO]: ['Escriturário - Agente Comercial', 'Escriturário - Agente de Tecnologia']
  }
};

class CatalogService {
  private cache: Record<string, ContestCatalog> = {};

  constructor() {
    this.loadCache();
  }

  private loadCache() {
    try {
      const saved = localStorage.getItem(CATALOG_CACHE_KEY);
      if (saved) {
        this.cache = JSON.parse(saved);
      }
    } catch (e) {
      this.cache = {};
    }
  }

  private saveCache() {
    try {
      localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(this.cache));
    } catch (e) {}
  }

  private getLocalFallback(concurso: string): ContestCatalog | null {
    const key = Object.keys(LOCAL_MAP).find(k => 
      concurso.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(concurso.toLowerCase())
    );

    if (key) {
      const data = LOCAL_MAP[key];
      const levels: CatalogLevel[] = Object.entries(data).map(([nivel, cargos]) => ({
        nivel: nivel as Nivel,
        cargos: cargos || []
      }));

      return {
        concurso: key,
        hasLevels: levels.length > 0,
        levels,
        timestamp: Date.now()
      };
    }
    return null;
  }

  public async getCatalog(concurso: string): Promise<ContestCatalog> {
    if (!concurso || concurso.length < 2) {
      return { concurso, hasLevels: false, levels: [], timestamp: Date.now() };
    }

    const cacheKey = `catalog_${concurso.toLowerCase().replace(/\s+/g, '_')}`;
    const cached = this.cache[cacheKey];

    // 1. Prioridade: Cache com TTL
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached;
    }

    // 2. Prioridade: MAP Local
    const local = this.getLocalFallback(concurso);
    if (local) {
      this.cache[cacheKey] = local;
      this.saveCache();
      return local;
    }

    // 3. Prioridade: IA (Gemini)
    try {
      const catalog = await this.fetchFromIA(concurso);
      this.cache[cacheKey] = catalog;
      this.saveCache();
      return catalog;
    } catch (error) {
      console.error("Falha ao buscar catálogo via IA:", error);
      return { concurso, hasLevels: false, levels: [], timestamp: Date.now() };
    }
  }

  private async fetchFromIA(concurso: string): Promise<ContestCatalog> {
    const prompt = `Aja como um especialista em editais. Para o concurso "${concurso}", identifique se existem diferentes níveis de escolaridade (Médio, Técnico, Superior) e liste os cargos/áreas principais para cada nível.
    Se o concurso não possuir distinção clara de cargos ou níveis (ex: cargo único), retorne hasLevels=false.
    Responda APENAS um objeto JSON no seguinte formato:
    {
      "concurso": "${concurso}",
      "hasLevels": boolean,
      "levels": [
        { "nivel": "Medio" | "Tecnico" | "Superior", "cargos": ["Cargo A", "Cargo B"] }
      ]
    }`;

    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: "Retorne estritamente JSON. Não explique nada." }
      })
    });

    if (!response.ok) throw new Error("Erro na API de Catálogo");
    const data = await response.json();
    
    // Parsing flexível do texto retornado pela IA
    let text = data.text || "";
    text = text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const parsed = JSON.parse(text);

    return {
      ...parsed,
      timestamp: Date.now()
    };
  }
}

export const catalogService = new CatalogService();
