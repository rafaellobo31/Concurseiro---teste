
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
    if (!supabase) throw new Error('Supabase não configurado');
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
    if (!supabase) return [];
    
    // 1. Inserir todas as questões em lote
    const questoesToInsert = questions.map(q => ({
      simulado_id: simuladoId,
      texto: q.text
    }));

    const { data: insertedQuestoes, error: questaoError } = await supabase
      .from('questoes')
      .insert(questoesToInsert)
      .select();

    if (questaoError) throw questaoError;
    if (!insertedQuestoes) return [];

    // 2. Preparar todas as alternativas para inserção em lote
    const alternativasToInsert: any[] = [];
    const mapping: any[] = [];

    insertedQuestoes.forEach((questaoDb, index) => {
      const originalQuestion = questions[index];
      const opts = originalQuestion.options || [];
      
      opts.forEach((opt, optIndex) => {
        const letra = String.fromCharCode(65 + optIndex);
        alternativasToInsert.push({
          questao_id: questaoDb.id,
          letra: letra,
          texto: opt,
          correta: letra === originalQuestion.correctAnswer || opt === originalQuestion.correctAnswer
        });
      });

      mapping.push({
        questao: questaoDb,
        originalId: originalQuestion.id,
        alternativas: [] // Será preenchido depois
      });
    });

    // 3. Inserir todas as alternativas em lote
    const { data: insertedAlts, error: altError } = await supabase
      .from('alternativas')
      .insert(alternativasToInsert)
      .select();

    if (altError) throw altError;

    // 4. Reconstruir o mapeamento com as alternativas inseridas
    if (insertedAlts) {
      insertedAlts.forEach(alt => {
        const mapItem = mapping.find(m => m.questao.id === alt.questao_id);
        if (mapItem) {
          mapItem.alternativas.push(alt);
        }
      });
    }

    return mapping;
  },

  async saveResposta(userId: string, questaoId: string, alternativaId: string) {
    if (!supabase) return;
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
    if (!supabase) return;
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
