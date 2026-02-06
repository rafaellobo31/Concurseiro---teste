
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PredictedConcurso, GroundingSource } from '../types';
import { fetchPredictedConcursos } from '../services/geminiService';

interface PredictedConcursosProps {
  onStudy: (name: string) => void;
}

const PredictedConcursos: React.FC<PredictedConcursosProps> = ({ onStudy }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [sources, setSources] = useState<GroundingSource[] | undefined>(undefined);
  
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  // Função interna de validação de curadoria
  const validateCuratedConcurso = (p: any): boolean => {
    if (!p.name || !p.status || !p.officialLink) return false;
    
    // Filtro Temporal Rigoroso
    const pYear = parseInt(p.year);
    if (isNaN(pYear) || (pYear !== currentYear && pYear !== nextYear)) return false;
    
    // Filtro de Fontes (Heurística de Confiabilidade)
    const link = p.officialLink.toLowerCase();
    const isReliable = 
      link.includes('.gov.br') || 
      link.includes('.org.br') || 
      link.includes('pciconcursos.com.br') || // Exceção por ser base de dados técnica
      link.includes('fgv.br') || 
      link.includes('cebraspe.org.br') ||
      link.includes('vunesp.com.br') ||
      link.includes('concursosfcc.com.br');

    // Descartar links que pareçam posts de blogs genéricos ou marketing
    const isSuspicious = 
      link.includes('/blog/') || 
      link.includes('/noticias/') || 
      link.includes('rumores');

    return isReliable && !isSuspicious;
  };

  const loadPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPredictedConcursos();
      
      if (data && Array.isArray(data.predictions)) {
        // Aplica curadoria sênior antes de atualizar o estado
        const curated = data.predictions.filter(validateCuratedConcurso);
        setPredictions(curated);
        setSources(data.sources);
      } else {
        setPredictions([]);
      }
    } catch (e: any) {
      console.error("[Radar] Falha ao carregar:", e);
      setError(e.message || "Não foi possível conectar ao Radar de Oportunidades.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPredictions();
  }, [loadPredictions]);

  return (
    <div className="max-w-6xl mx-auto px-4 animate-in fade-in duration-500">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-indigo-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Curadoria Sênior Verificada
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight uppercase">Radar de Oportunidades</h2>
        <p className="text-gray-600 max-w-2xl mx-auto font-medium">Exibindo exclusivamente editais confirmados ou previstos com base documental em <span className="text-indigo-600 font-bold">{currentYear}/{nextYear}</span>.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center gap-6">
           <div className="relative">
             <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-600"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
             </div>
           </div>
           <p className="text-indigo-600 font-black text-xs uppercase tracking-[0.2em] animate-pulse">Autenticando Fontes Oficiais...</p>
        </div>
      ) : error ? (
        <div className="py-20 text-center bg-white rounded-[2rem] border border-rose-100 shadow-xl max-w-2xl mx-auto px-10">
           <div className="bg-rose-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
           </div>
           <h3 className="text-xl font-black text-slate-900 mb-2">Instabilidade Técnica</h3>
           <p className="text-slate-500 font-medium mb-8 leading-relaxed">Não foi possível validar as fontes de editais no momento. Tente novamente em instantes.</p>
           <button 
             onClick={loadPredictions}
             className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
           >
             REAUTENTICAR RADAR
           </button>
        </div>
      ) : predictions.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[2rem] border border-gray-100 shadow-xl max-w-2xl mx-auto px-10">
           <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
           </div>
           <h3 className="text-xl font-black text-slate-900 mb-2">Aguardando Validação Documental</h3>
           <p className="text-slate-500 font-medium mb-8 leading-relaxed">Nossa curadoria ainda não encontrou concursos para {currentYear}/{nextYear} que atendam aos requisitos de veracidade oficial hoje.</p>
           <button 
             onClick={loadPredictions}
             className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition-all"
           >
             FORÇAR VARREDURA
           </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {predictions.map((p, idx) => (
              <div key={`${p.name}-${idx}`} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      p.status === 'CONFIRMADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.status}
                    </span>
                    <span className="text-[10px] font-black text-slate-300 group-hover:text-indigo-600 transition-colors">
                      {p.year}
                    </span>
                  </div>
                  <h4 className="font-black text-gray-900 mb-2 leading-tight text-lg">{p.name}</h4>
                  <p className="text-xs text-gray-400 font-bold mb-6 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7h18"/><path d="M3 12h18"/><path d="M3 17h18"/></svg>
                    Banca: <span className="text-gray-600">{p.banca || 'Definição iminente'}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onStudy(p.name)}
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                  >
                    ESTUDAR TÁTICA
                  </button>
                  <a 
                    href={p.officialLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 transition-all"
                    title="Acessar Fonte Oficial Verificada"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {sources && Array.isArray(sources) && sources.length > 0 && (
            <div className="mt-12 bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Base de Grounding Verificada (Grounding Chunks)</h4>
              </div>
              <div className="flex flex-wrap gap-3">
                {sources.map((source, i) => (
                  <a 
                    key={`${source.uri}-${i}`} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 text-[10px] font-bold text-slate-300 hover:bg-white/10 hover:border-indigo-500/30 transition-all"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    {source.title && source.title.length > 50 ? source.title.substring(0, 50) + '...' : source.title || "Documento Verificado"}
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      
      <div className="mt-16 bg-slate-50 p-10 rounded-[3rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="flex items-center gap-6">
            <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl">
               <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <h5 className="font-black text-slate-900 text-lg">Curadoria Institucional</h5>
              <p className="text-sm text-slate-500 font-medium max-w-md">O Radar descarta automaticamente rumores e sites de marketing. Exibimos apenas dados com fundamentação em Diários Oficiais.</p>
            </div>
         </div>
         <button onClick={loadPredictions} className="whitespace-nowrap bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
           Sincronizar Fontes
         </button>
      </div>
    </div>
  );
};

export default PredictedConcursos;
