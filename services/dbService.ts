
import { supabase } from './supabaseClient';
import { Question } from '../types';

export interface DbSimulado {
  id: string;
  user_id: string;
  titulo: string;
  concurso?: string;
  nivel?: string;
  cargo_area?: string;
  banca?: string;
  estado?: string;
}

export interface DbQuestao {
  id: string;
  simulado_id: string;
  texto: string;
}

export interface DbAlternativa {
  id: string;
  questao_id: string;
  letra: string;
  texto: string;
  correta: boolean;
}

/**
 * Mapeamento tático para converter as questões da IA para o esquema do banco.
 */
export const dbService = {
  async createSimulado(userId: string, config: any) {
    const { data, error } = await supabase
      .from('simulados')
      .insert({
        user_id: userId,
        titulo: config.title || 'Simulado Gerado',
        concurso: config.concurso,
        nivel: config.nivel,
        cargo_area: config.cargoArea,
        banca: config.banca,
        estado: config.estado
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async insertQuestoesEAlternativas(simuladoId: string, questions: Question[]) {
    const results = [];

    for (const q of questions) {
      // Inserir Questão
      const { data: questaoData, error: questaoError } = await supabase
        .from('questoes')
        .insert({
          simulado_id: simuladoId,
          texto: q.text
        })
        .select()
        .single();

      if (questaoError) throw questaoError;

      // Inserir Alternativas
      const alternativasToInsert = (q.options || []).map((opt, index) => {
        const letra = String.fromCharCode(65 + index);
        return {
          questao_id: questaoData.id,
          letra: letra,
          texto: opt,
          correta: letra === q.correctAnswer || opt === q.correctAnswer
        };
      });

      const { data: altData, error: altError } = await supabase
        .from('alternativas')
        .insert(alternativasToInsert)
        .select();

      if (altError) throw altError;

      results.push({
        questao: questaoData,
        alternativas: altData,
        originalId: q.id // Mapeamento para o estado do React
      });
    }

    return results;
  },

  async saveResposta(userId: string, questaoId: string, alternativaId: string) {
    const { error } = await supabase
      .from('respostas_usuario')
      .upsert({
        user_id: userId,
        questao_id: questaoId,
        alternativa_id: alternativaId
      }, { onConflict: 'user_id,questao_id' });

    if (error) console.error('Erro ao salvar resposta no Supabase:', error);
  },

  async saveResultado(userId: string, simuladoId: string, total: number, acertos: number) {
    const { error } = await supabase
      .from('resultados')
      .insert({
        user_id: userId,
        simulado_id: simuladoId,
        total_questoes: total,
        acertos: acertos,
        erros: total - acertos
      });

    if (error) console.error('Erro ao salvar resultado no Supabase:', error);
  }
};
