
import React, { useState, useEffect } from 'react';
import { UserStatisticsData, UserPlan } from '../types';
import { db } from '../services/db';
import { fetchIntelligentRecommendations } from '../services/geminiService';

interface UserStatisticsProps {
  email: string;
  userPlan: UserPlan;
  onUpgrade: () => void;
}

const UserStatistics: React.FC<UserStatisticsProps> = ({ email, userPlan, onUpgrade }) => {
  const [stats, setStats] = useState<UserStatisticsData | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    const data = db.getUserStats(email);
    setStats(data);
  }, [email]);

  const handleGetRecommendations = async () => {
    if (!stats) return;
    if (!userPlan.isPro) {
      onUpgrade();
      return;
    }
    
    setLoadingAI(true);
    try {
      const recommendation = await fetchIntelligentRecommendations(stats);
      setStats(prev => prev ? { ...prev, aiRecommendations: recommendation } : null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAI(null);
    }
  };

  if (!stats) {
    return (
      <div className="text-center py-24 bg-white rounded-[3rem] border border-gray-100 shadow-xl animate-in fade-in">
        <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-300">
           <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase">Base Estatística Vazia</h3>
        <p className="text-slate-400 font-medium max-w-sm mx-auto text-sm px-4">
          Realize seus primeiros simulados para que possamos traçar seu perfil de aprovação e evolução.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="mb-10">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2 uppercase">Estatísticas Inteligentes</h2>
        <p className="text-slate-500 font-medium italic">Sua evolução tática traduzida em dados e orientação real.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total de Questões</p>
           <h3 className="text-4xl font-black text-slate-900">{stats.totalQuestions}</h3>
           <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-tight">Resolvidas desde o início</p>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Aproveitamento Geral</p>
           <div className="flex items-end gap-3">
             <h3 className="text-4xl font-black text-white">{stats.overallPercentage}%</h3>
             <div className="mb-1.5 w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: `${stats.overallPercentage}%` }}></div>
             </div>
           </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Acertos Totais</p>
           <h3 className="text-4xl font-black text-emerald-600">{stats.totalHits}</h3>
           <p className="text-[10px] text-emerald-500/60 font-black mt-2 uppercase tracking-tight">Caminho para a nomeação</p>
        </div>
      </div>

      {/* Evolution Chart (Custom SVG Bar Chart) */}
      <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-600"><path d="m19 20-4-4-4 4-4-4-4 4"/><path d="m19 4-4 4-4-4-4 4-4-4"/></svg>
           Evolução dos Últimos Simulados (%)
        </h4>
        <div className="flex items-end justify-between h-48 gap-4 px-4">
           {stats.evolution.map((point, i) => (
             <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                <div className="relative w-full">
                   <div 
                     className="bg-indigo-600/10 rounded-t-xl group-hover:bg-indigo-600 transition-all duration-500 w-full" 
                     style={{ height: `${point.percentage}%` }}
                   >
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white text-[9px] px-2 py-1 rounded font-black">
                       {point.percentage}%
                     </div>
                   </div>
                </div>
                <span className="text-[8px] font-black text-slate-400 uppercase truncate w-full text-center">{point.date.slice(0, 5)}</span>
             </div>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Disciplinas */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Desempenho por Disciplina</h4>
          <div className="space-y-6">
            {stats.subjects.map((s, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight">
                  <span className="text-slate-900 truncate w-40">{s.name}</span>
                  <span className={`px-2 py-0.5 rounded ${
                    s.status === 'Excelente' ? 'bg-emerald-50 text-emerald-600' :
                    s.status === 'Bom' ? 'bg-indigo-50 text-indigo-600' :
                    s.status === 'Atenção' ? 'bg-amber-50 text-amber-600' :
                    'bg-rose-50 text-rose-600'
                  }`}>{s.status} • {s.percentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                   <div className={`h-full ${
                     s.status === 'Excelente' ? 'bg-emerald-500' :
                     s.status === 'Bom' ? 'bg-indigo-500' :
                     s.status === 'Atenção' ? 'bg-amber-500' :
                     'bg-rose-500'
                   }`} style={{ width: `${s.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bancas */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Perfil por Banca Examinadora</h4>
           <div className="grid grid-cols-2 gap-4">
             {stats.bancas.map((b, i) => (
               <div key={i} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{b.name}</p>
                 <p className="text-2xl font-black text-slate-900">{b.percentage}%</p>
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* Mentoria IA */}
      <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
           <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Mentoria de Elite (Recomendações IA)
           </h4>
           
           {stats.aiRecommendations ? (
             <p className="text-slate-300 font-medium leading-relaxed italic border-l-4 border-indigo-500 pl-6 text-sm animate-in fade-in">
                "{stats.aiRecommendations}"
             </p>
           ) : (
             <div className="text-center md:text-left">
                <p className="text-slate-400 text-sm font-medium mb-8">
                  Nossa IA analisará seu histórico completo para sugerir onde focar seu esforço nas próximas 24h.
                </p>
                <button 
                  onClick={handleGetRecommendations}
                  disabled={loadingAI === true}
                  className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto md:mx-0"
                >
                  {loadingAI ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      PROCESSANDO PERFIL...
                    </>
                  ) : (
                    <>
                      {!userPlan.isPro && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                      GERAR ORIENTAÇÃO TÁTICA {!userPlan.isPro && '(PRO)'}
                    </>
                  )}
                </button>
             </div>
           )}
        </div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl -mr-40 -mb-40"></div>
      </div>
    </div>
  );
};

export default UserStatistics;
