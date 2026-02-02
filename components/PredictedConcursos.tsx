
import React, { useState, useEffect } from 'react';
import { PredictedConcurso, GroundingSource } from '../types';
import { fetchPredictedConcursos } from '../services/geminiService';

interface PredictedConcursosProps {
  onStudy: (name: string) => void;
}

const PredictedConcursos: React.FC<PredictedConcursosProps> = ({ onStudy }) => {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<PredictedConcurso[]>([]);
  const [sources, setSources] = useState<GroundingSource[] | undefined>(undefined);
  
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const data = await fetchPredictedConcursos();
      setPredictions(data.predictions);
      setSources(data.sources);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 animate-in fade-in duration-500">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight uppercase">Radar de Oportunidades</h2>
        <p className="text-gray-600 max-w-2xl mx-auto font-medium">Nossa IA monitora editais, autorizações e tendências em tempo real para você sair na frente.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center gap-6">
           <div className="relative">
             <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-600"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
             </div>
           </div>
           <p className="text-indigo-600 font-black text-xs uppercase tracking-[0.2em] animate-pulse">Sincronizando com Diários Oficiais e Fontes de Notícias...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {predictions.map((p, idx) => (
              <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      p.status.toLowerCase().includes('autorizado') ? 'bg-green-100 text-green-700' : 
                      p.status.toLowerCase().includes('edital') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {p.status}
                    </span>
                    <div className="bg-gray-50 p-2 rounded-xl text-gray-300 group-hover:text-indigo-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                    </div>
                  </div>
                  <h4 className="font-black text-gray-900 mb-2 leading-tight text-lg">{p.name}</h4>
                  <p className="text-xs text-gray-400 font-bold mb-6 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7h18"/><path d="M3 12h18"/><path d="M3 17h18"/></svg>
                    Banca: <span className="text-gray-600">{p.banca}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onStudy(p.name)}
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                  >
                    PREPARAR AGORA
                  </button>
                  <a 
                    href={p.officialLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 transition-all"
                    title="Ver Notícia Original"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Added grounding sources display to satisfy Search Grounding requirements */}
          {sources && sources.length > 0 && (
            <div className="mt-12 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Fontes de Grounding (Referências Web)</h4>
              <div className="flex flex-wrap gap-2">
                {sources.map((source, i) => (
                  <a 
                    key={i} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-100 text-[10px] font-bold text-indigo-600 hover:border-indigo-200 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    {source.title.length > 40 ? source.title.substring(0, 40) + '...' : source.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      
      <div className="mt-16 bg-indigo-50 p-8 rounded-[2rem] border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-5">
            <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl">
               <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
            </div>
            <div>
              <h5 className="font-black text-indigo-900">Dica de Especialista</h5>
              <p className="text-sm text-indigo-700 font-medium">Concursos previstos são as melhores oportunidades para quem estuda o pré-edital. Comece pela base teórica hoje mesmo.</p>
            </div>
         </div>
         <button onClick={loadPredictions} className="whitespace-nowrap bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
           Atualizar Radar
         </button>
      </div>
    </div>
  );
};

export default PredictedConcursos;
