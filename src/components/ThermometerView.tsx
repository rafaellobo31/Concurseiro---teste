
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ThermometerData, UserPlan, Modalidade, Question, ModeloQuestao, BoardDNAItem as BoardDNAItemType } from '../types';
import { fetchThermometerData } from '../services/geminiService';
import BoardDNAItem from './BoardDNAItem';

interface ThermometerViewProps {
  userPlan: UserPlan;
  onUpgrade: () => void;
  onGenerateExam: (concurso: string, subjects: string[], banca: string) => void;
  onShowProWall: (feature: string) => void;
}

const ORGAOS_NACIONAL = [
  'Receita Federal', 'Polícia Federal (PF)', 'Polícia Rodoviária Federal (PRF)', 
  'INSS', 'Banco do Brasil', 'Caixa Econômica Federal', 'Petrobras', 'Correios', 
  'IBGE', 'Banco Central (Bacen)', 'TCU', 'CGU', 'Senado Federal', 'Câmara dos Deputados'
];

const ORGAOS_ESTADUAL = [
  'Tribunal de Justiça (TJ)', 'Polícia Civil (PC)', 'Polícia Militar (PM)', 
  'Secretaria da Fazenda (SEFAZ)', 'Ministério Público Estadual (MP)', 'DETRAN'
];

const BANCAS_SUGESTOES = ['FGV', 'Cebraspe', 'FCC', 'Vunesp', 'Idecan', 'IBFC', 'Cesgranrio'];

const ThermometerView: React.FC<ThermometerViewProps> = ({ userPlan, onUpgrade, onGenerateExam, onShowProWall }) => {
  const [loading, setLoading] = useState(false);
  const [concurso, setConcurso] = useState('');
  const [banca, setBanca] = useState('');
  const [modalidade, setModalidade] = useState<Modalidade>(Modalidade.NACIONAL);
  const [data, setData] = useState<ThermometerData | null>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showBancaAutocomplete, setShowBancaAutocomplete] = useState(false);
  
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const bancaRef = useRef<HTMLDivElement>(null);

  const currentList = useMemo(() => modalidade === Modalidade.NACIONAL ? ORGAOS_NACIONAL : ORGAOS_ESTADUAL, [modalidade]);

  const filteredAutocomplete = useMemo(() => {
    if (!concurso) return currentList;
    return currentList.filter(s => s.toLowerCase().includes(concurso.toLowerCase()));
  }, [concurso, currentList]);

  const filteredBancaAutocomplete = useMemo(() => {
    if (!banca) return BANCAS_SUGESTOES;
    return BANCAS_SUGESTOES.filter(s => s.toLowerCase().includes(banca.toLowerCase()));
  }, [banca]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) setShowAutocomplete(false);
      if (bancaRef.current && !bancaRef.current.contains(e.target as Node)) setShowBancaAutocomplete(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAnalyze = async () => {
    if (!concurso) return;
    setLoading(true);
    setData(null);
    try {
      const res = await fetchThermometerData(concurso, banca);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-in fade-in duration-700">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight uppercase">Analista de Perfil de Banca</h2>
        <p className="text-slate-500 font-medium italic">Como a banca <span className="text-indigo-600 font-black">pensa cada artigo</span>, não apenas o que está no edital.</p>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl mb-12 relative z-[60]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 relative" ref={autocompleteRef}>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Órgão / Concurso</label>
            <input 
              type="text" 
              placeholder="Digite o concurso..."
              className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-indigo-500 bg-white font-bold text-slate-900 outline-none transition-all shadow-sm"
              value={concurso}
              onChange={(e) => { setConcurso(e.target.value); setShowAutocomplete(true); }}
            />
            {showAutocomplete && (
              <div className="absolute z-[100] w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                {filteredAutocomplete.map((s, i) => (
                  <button key={i} onClick={() => { setConcurso(s); setShowAutocomplete(false); }} className="w-full text-left p-4 hover:bg-indigo-50 text-slate-700 font-bold border-b last:border-0">{s}</button>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-4 relative" ref={bancaRef}>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Banca Alvo</label>
            <input 
              type="text" 
              placeholder="FGV, Cebraspe..."
              className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-indigo-500 bg-white font-bold text-slate-900 outline-none transition-all shadow-sm"
              value={banca}
              onChange={(e) => { setBanca(e.target.value); setShowBancaAutocomplete(true); }}
            />
            {showBancaAutocomplete && (
              <div className="absolute z-[100] w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                {filteredBancaAutocomplete.map((s, i) => (
                  <button key={i} onClick={() => { setBanca(s); setShowBancaAutocomplete(false); }} className="w-full text-left p-4 hover:bg-indigo-50 text-slate-700 font-bold border-b last:border-0">{s}</button>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-2 md:pt-6">
            <button 
              onClick={handleAnalyze}
              disabled={loading || !concurso}
              className="w-full h-[62px] bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
            >
              {loading ? 'ANALISANDO...' : 'DECODIFICAR'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-indigo-50 shadow-xl mb-12 animate-pulse">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="font-black text-indigo-600 text-[10px] uppercase tracking-[0.2em]">Escaneando a Mente da {banca || 'Banca'}...</p>
        </div>
      )}

      {data && (
        <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                  <div>
                    <span className="bg-indigo-600 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 inline-block">Mapeamento Genético IA</span>
                    <h3 className="text-3xl font-black mb-1">{data.concurso}</h3>
                    <p className="text-indigo-300 font-bold text-xs uppercase tracking-widest">DNA de Prova: {data.banca}</p>
                  </div>
                </div>
                <p className="text-slate-300 font-medium leading-relaxed italic border-l-4 border-indigo-500 pl-6 mb-2 text-lg">
                  "{data.analysis}"
                </p>
             </div>
             <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {data.subjects.map((subject, idx) => (
              <div key={idx} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl hover:border-indigo-200 transition-all relative overflow-hidden group">
                <div className="flex justify-between items-start mb-6 border-b border-gray-50 pb-4">
                  <div className="flex-1">
                    <h4 className="text-xl font-black text-slate-900 mb-1">{subject.name}</h4>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                      subject.heatLevel === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      Nível de Cobrança: {subject.strategicAnalysis?.nivel_cobranca || subject.heatLevel}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[24px] font-black text-indigo-600">{subject.frequency}%</span>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Frequência</p>
                  </div>
                </div>

                {!userPlan.isPro ? (
                  <div className="mt-4 p-8 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 text-center">
                    <div className="bg-indigo-600/10 p-4 rounded-3xl w-fit mx-auto mb-4">
                       <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-600"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <p className="text-[11px] font-black text-slate-900 uppercase mb-4">DNA de Cobrança Bloqueado</p>
                    <button 
                      onClick={onUpgrade}
                      className="w-full py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-black transition-all"
                    >
                      VER PADRÕES E PEGADINHAS
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-6 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                        <p className="text-[9px] font-black text-rose-600 uppercase mb-2">Pegadinhas Comuns:</p>
                        <ul className="space-y-1">
                          {subject.strategicAnalysis?.pegadinhas_frequentes.map((p, i) => (
                            <li key={i} className="text-[11px] text-rose-800 font-bold flex gap-2">
                              <span className="shrink-0">•</span> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <p className="text-[9px] font-black text-amber-600 uppercase mb-2">Padrões da Banca:</p>
                        <ul className="space-y-1">
                          {subject.strategicAnalysis?.padroes_da_banca.map((p, i) => (
                            <li key={i} className="text-[11px] text-amber-800 font-bold flex gap-2">
                              <span className="shrink-0">•</span> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                       <p className="text-[9px] font-black text-indigo-600 uppercase mb-2">Estratégia para Acertar:</p>
                       <p className="text-[12px] text-indigo-900 font-bold leading-relaxed">
                         {subject.strategicAnalysis?.como_acertar_na_prova[0] || "Foque na literalidade dos incisos X e Y, pois a banca costuma inverter o 'deverá' por 'poderá'."}
                       </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {data.topExamples && data.topExamples.length > 0 && (
            <div className="space-y-6">
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                Exemplos Práticos de DNA de Banca
              </h4>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest -mt-4 mb-4">Questões resolvidas com análise tática</p>
              <div className="grid gap-8">
                {data.topExamples.map((item, idx) => (
                  <BoardDNAItem 
                    key={item.id || idx}
                    item={item}
                    isPro={userPlan.isPro}
                    onUpgrade={onUpgrade}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThermometerView;
