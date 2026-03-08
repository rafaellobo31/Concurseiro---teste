
import React from 'react';
import { Exam, UserPlan } from '../types';

interface UserAnalysisViewProps {
  exam: Exam | null;
  diagnostic: any;
  userPlan: UserPlan;
  onUpgrade: () => void;
  onBack: () => void;
  score: number;
}

const UserAnalysisView: React.FC<UserAnalysisViewProps> = ({ exam, diagnostic, userPlan, onUpgrade, onBack, score }) => {
  if (!exam) return null;

  const total = exam.questions.length;
  const percentage = Math.round((score / total) * 100);
  const isPro = userPlan.isPro;

  // Simulação de benchmarking baseado no desempenho
  const approvedAvg = 78; // Média fictícia de aprovados
  const gap = approvedAvg - percentage;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-in fade-in duration-700">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              Relatório Tático Individual
            </span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Análise de Performance</h2>
        </div>
        <button 
          onClick={onBack}
          className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
          Voltar ao Simulado
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lado Esquerdo - Score Geral (FREE) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Aproveitamento Geral</p>
            <div className="relative inline-block mb-6">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-50" />
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * percentage) / 100} className="text-indigo-600 transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-3xl font-black text-slate-900">{percentage}%</span>
              </div>
            </div>
            <p className="text-sm font-bold text-slate-600 mb-2">{score} acertos de {total}</p>
            <div className="bg-slate-50 rounded-xl p-3 text-[11px] font-black text-slate-500 uppercase tracking-tight">
              Nível: {diagnostic?.difficultyLevel || 'Intermediário'}
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Benchmark IA</h4>
            <p className="text-lg font-black mb-4 leading-tight">
              {gap > 0 
                ? `Você está ${gap}% abaixo da média dos aprovados.` 
                : 'Excelente! Seu desempenho é compatível com a nomeação.'}
            </p>
            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
              Candidatos que passam neste concurso costumam atingir <span className="text-white font-black">{approvedAvg}%</span> de acertos nesta banca.
            </p>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full" style={{ width: `${percentage}%` }}></div>
            </div>
          </div>
        </div>

        {/* Lado Direito - Diagnóstico Profundo (Gatilhada PRO) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden relative">
            <div className="p-8 border-b border-gray-50 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Diagnóstico Tático</h3>
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">IA Analysis</span>
            </div>
            
            <div className="p-8 space-y-8 relative">
              {/* Seção Aberta (Free) */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Destaques da Prova</h4>
                <p className="text-slate-600 font-medium leading-relaxed">
                  {diagnostic?.proTip || "Analisamos seu padrão de respostas. Você demonstra segurança em temas de base, mas a banca costuma cobrar exceções que foram seu ponto de erro."}
                </p>
              </div>

              {/* Seção Bloqueada (Gatilho) */}
              <div className="relative pt-8 border-t border-gray-50">
                {!isPro && (
                  <div className="absolute inset-0 z-20 backdrop-blur-md bg-white/40 flex flex-col items-center justify-center p-8 text-center rounded-b-[2.5rem]">
                    <div className="bg-indigo-600 p-4 rounded-3xl text-white mb-6 shadow-2xl">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <h5 className="text-2xl font-black text-slate-900 mb-2">Desbloqueie o Próximo Nível</h5>
                    <p className="text-slate-500 font-medium mb-8 max-w-sm">Veja a análise detalhada por banca, tempo médio vs aprovados e seu mapa de calor de erros.</p>
                    <button 
                      onClick={onUpgrade}
                      className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                      ATIVAR ANÁLISE COMPLETA
                    </button>
                  </div>
                )}
                
                <div className={`space-y-8 ${!isPro ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Tempo de Decisão</p>
                      <p className="text-2xl font-black text-indigo-900">{diagnostic?.estimatedTimePerQuestion || '2:30'} <span className="text-xs font-medium text-indigo-400">/ quest</span></p>
                      <p className="text-[10px] text-indigo-500 font-bold mt-2">Aprovados: 1:45 / quest</p>
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Previsão de Nomeação</p>
                      <p className="text-2xl font-black text-emerald-900">7.5 <span className="text-xs font-medium text-emerald-400">meses</span></p>
                      <p className="text-[10px] text-emerald-500 font-bold mt-2">Mantendo este ritmo de treino</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Mapa de Calor por Disciplina</h4>
                    <div className="space-y-3">
                       {[
                         { name: 'Direito Administrativo', score: 85, color: 'bg-emerald-500' },
                         { name: 'Direito Constitucional', score: 40, color: 'bg-rose-500' },
                         { name: 'Português', score: 65, color: 'bg-amber-500' }
                       ].map((m, i) => (
                         <div key={i} className="flex items-center gap-4">
                           <p className="text-xs font-bold text-slate-700 w-32 truncate">{m.name}</p>
                           <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                             <div className={`h-full ${m.color}`} style={{ width: `${m.score}%` }}></div>
                           </div>
                           <p className="text-[10px] font-black text-slate-400 w-8">{m.score}%</p>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-3xl p-8 border border-amber-100 flex flex-col md:flex-row items-center gap-6">
             <div className="bg-amber-500 text-white p-4 rounded-2xl shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
             </div>
             <div>
               <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight mb-1">Próximo Passo Recomendado</h4>
               <p className="text-xs text-amber-700 font-medium leading-relaxed">
                 Foque em revisão por questões da disciplina <span className="font-black">Direito Constitucional</span>. Seu erro recorrente está no tema "Controle de Constitucionalidade".
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAnalysisView;
