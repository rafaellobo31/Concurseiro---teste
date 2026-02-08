
import React, { useState, useEffect } from 'react';
import { BoardErrorAnalysis, UserPlan } from '../types';
import { db } from '../services/db';
import { fetchBancaTacticalAnalysis } from '../services/geminiService';

interface BoardErrorMapProps {
  email: string;
  userPlan: UserPlan;
  onUpgrade: () => void;
}

const BoardErrorMap: React.FC<BoardErrorMapProps> = ({ email, userPlan, onUpgrade }) => {
  const [errorMap, setErrorMap] = useState<BoardErrorAnalysis[]>([]);
  const [expandedBanca, setExpandedBanca] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null);

  useEffect(() => {
    setErrorMap(db.getBoardErrorMap(email));
  }, [email]);

  const handleFetchTactical = async (banca: string, subjects: string[]) => {
    if (!userPlan.isPro) {
      onUpgrade();
      return;
    }
    
    setLoadingAnalysis(banca);
    try {
      const analysis = await fetchBancaTacticalAnalysis(banca, subjects);
      setErrorMap(prev => prev.map(item => 
        item.banca === banca ? { ...item, aiTacticalAnalysis: analysis } : item
      ));
      setExpandedBanca(banca);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAnalysis(null);
    }
  };

  if (errorMap.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 animate-in fade-in">
        <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20"/><path d="m17 7-5-5-5 5"/><path d="m17 17-5 5-5-5"/></svg>
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2 uppercase">Mapa em Branco</h3>
        <p className="text-slate-400 font-medium max-w-sm mx-auto text-sm px-4">
          Realize alguns simulados para que nossa IA mapeie seu perfil de erro por banca examinadora.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">Mapa de Erros por Banca</h2>
        <p className="text-slate-500 font-medium italic">Entenda como cada examinadora tenta te induzir ao erro nos seus pontos fracos.</p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {errorMap.map((item) => (
          <div key={item.banca} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden group hover:border-indigo-200 transition-all">
            <div className="p-8 md:p-10">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl text-white shadow-lg ${item.errorRate > 50 ? 'bg-rose-600' : 'bg-indigo-600'}`}>
                       <h4 className="text-xl font-black">{item.banca}</h4>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Taxa de Erro Acumulada</p>
                      <div className="flex items-center gap-3">
                         <span className={`text-2xl font-black ${item.errorRate > 50 ? 'text-rose-600' : 'text-indigo-600'}`}>{item.errorRate}%</span>
                         <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${item.errorRate > 50 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${item.errorRate}%` }}></div>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.mostMissedSubjects.map((s, i) => (
                      <span key={i} className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border border-slate-100">
                        {s}
                      </span>
                    ))}
                  </div>
               </div>

               {item.aiTacticalAnalysis ? (
                 <div className="space-y-8 animate-in slide-in-from-top-4">
                    <div className="p-8 bg-slate-900 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
                       <div className="relative z-10">
                          <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                             Mindset de Cobrança (DNA da Banca)
                          </h5>
                          <p className="text-slate-300 font-medium leading-relaxed italic border-l-4 border-indigo-500 pl-6 text-sm">
                            "{item.aiTacticalAnalysis.mindset}"
                          </p>
                       </div>
                    </div>

                    <div className="bg-rose-50 p-8 rounded-[2rem] border border-rose-100">
                       <h5 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          Armadilhas Frequentes Identificadas
                       </h5>
                       <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {item.aiTacticalAnalysis.traps.map((trap, i) => (
                            <li key={i} className="bg-white p-4 rounded-2xl border border-rose-100 text-rose-900 text-xs font-bold flex items-start gap-3 shadow-sm">
                               <span className="shrink-0 text-rose-500">•</span>
                               {trap}
                            </li>
                          ))}
                       </ul>
                    </div>
                 </div>
               ) : (
                 <div className="flex justify-center">
                    <button 
                      onClick={() => handleFetchTactical(item.banca, item.mostMissedSubjects)}
                      disabled={loadingAnalysis === item.banca}
                      className="group relative bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition-all overflow-hidden flex items-center gap-3"
                    >
                      {loadingAnalysis === item.banca ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          DECODIFICANDO PADRÃO...
                        </>
                      ) : (
                        <>
                          {!userPlan.isPro && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                          VER ANÁLISE TÁTICA DA BANCA {!userPlan.isPro && '(PRO)'}
                        </>
                      )}
                    </button>
                 </div>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoardErrorMap;
