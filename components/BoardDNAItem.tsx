
import React from 'react';
import { BoardDNAItem as BoardDNAItemType } from '../types';

interface BoardDNAItemProps {
  item: BoardDNAItemType;
  isPro: boolean;
  onUpgrade?: () => void;
}

const BoardDNAItem: React.FC<BoardDNAItemProps> = ({ item, isPro, onUpgrade }) => {
  return (
    <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border-2 border-indigo-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
      {/* Badge de Identificação */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          </div>
          <div>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">Caso Prático de Banca</span>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">{item.banca} • {item.ano}</span>
          </div>
        </div>
        <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
          Gabarito: {item.correctAnswer}
        </div>
      </div>

      {/* Enunciado (Não interativo) */}
      <div className="mb-8">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Questão Aplicada:</h4>
        <p className="text-slate-800 font-medium text-lg md:text-xl leading-relaxed exam-font bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
          {item.question}
        </p>
      </div>

      {/* Justificativa Pedagógica */}
      <div className="mb-8">
        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 ml-1">Por que esta é a correta?</h4>
        <div className="bg-emerald-50/30 p-6 rounded-3xl border border-emerald-100">
          <p className="text-slate-700 text-sm md:text-base font-medium leading-relaxed italic">
            "{item.justification}"
          </p>
          {item.referenciaLegal && (
            <p className="mt-4 text-[10px] font-black text-emerald-700 uppercase tracking-widest">
              Base Legal: {item.referenciaLegal}
            </p>
          )}
        </div>
      </div>

      {/* Mindset da Banca - Conteúdo Estratégico */}
      <div className="relative">
        {!isPro && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6 bg-white/60 backdrop-blur-[12px] rounded-[2rem] border border-white/50 shadow-xl">
             <div className="bg-indigo-600 p-3 rounded-2xl text-white mb-4 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
             </div>
             <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4">🔓 DNA DE ERRO DA BANCA EXCLUSIVO PRO</p>
             <button 
               onClick={onUpgrade}
               className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
             >
               Desbloquear Análise
             </button>
          </div>
        )}

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!isPro ? 'select-none blur-[14px]' : ''}`}>
          <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
             <div className="relative z-10">
               <h5 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                 Mindset da Banca
               </h5>
               <p className="text-slate-300 text-[12px] font-bold leading-relaxed">
                 {item.bancaMindset}
               </p>
             </div>
             <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          </div>

          <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 shadow-sm">
             <h5 className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
               Armadilha Comum
             </h5>
             <p className="text-rose-900 text-[12px] font-bold leading-relaxed">
               {item.armadilhaComum}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardDNAItem;
