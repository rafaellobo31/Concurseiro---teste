
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ThermometerData, UserPlan, Modalidade, Question, ModeloQuestao } from '../types';
import { fetchThermometerData } from '../services/geminiService';
import QuestionItem from './QuestionItem';

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
  const [showQuestions, setShowQuestions] = useState(false);
  
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
    setShowQuestions(false);
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
        <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight uppercase">Analisador de DNA da Banca</h2>
        <p className="text-slate-500 font-medium italic">Não estude apenas o que cai. Entenda <span className="text-indigo-600 font-black">como</span> eles querem te enganar.</p>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl mb-12 relative z-[60]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 relative" ref={autocompleteRef}>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Concurso Alvo</label>
            <input 
              type="text" 
              className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-indigo-500 bg-white font-bold text-slate-900 outline-none"
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
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Banca Examinadora</label>
            <input 
              type="text" 
              className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-indigo-500 bg-white font-bold text-slate-900 outline-none"
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
              className="w-full h-[62px] bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all"
            >
              {loading ? 'ANALISANDO...' : 'MAPEAR'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-indigo-50 shadow-xl mb-12 animate-pulse">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="font-black text-indigo-600 text-[10px] uppercase tracking-[0.2em]">Escaneando Padrões Mentais da {banca || 'Banca'}...</p>
        </div>
      )}

      {data && (
        <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                  <div>
                    <span className="bg-indigo-600 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 inline-block">Mapeamento Tático IA</span>
                    <h3 className="text-3xl font-black mb-1">{data.concurso}</h3>
                    <p className="text-indigo-300 font-bold text-xs uppercase tracking-widest">Board Profile: {data.banca}</p>
                  </div>
                </div>
                <p className="text-slate-300 font-medium leading-relaxed italic border-l-4 border-indigo-500 pl-6 mb-2 text-lg">
                  "{data.analysis}"
                </p>
             </div>
             <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.subjects.map((subject, idx) => (
              <div key={idx} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl hover:border-indigo-200 transition-all relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <h4 className="text-lg font-black text-slate-900 mb-1">{subject.name}</h4>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-2">
                       <div className="h-full bg-indigo-600" style={{ width: `${subject.frequency}%` }}></div>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recorrência: {subject.frequency}%</span>
                  </div>
                </div>

                {!userPlan.isPro ? (
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-3">DNA da Banca (Bloqueado)</p>
                    <button 
                      onClick={onUpgrade}
                      className="w-full py-2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl"
                    >
                      VER PADRÕES DE COBRANÇA
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase rounded">Foco: {subject.psychology?.pattern}</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Pegadinhas Semânticas:</p>
                      <div className="flex flex-wrap gap-1">
                        {subject.psychology?.semanticTriggers.map((t, i) => (
                          <span key={i} className="px-2 py-1 bg-rose-50 text-rose-600 text-[8px] font-bold rounded-lg border border-rose-100">"{t}"</span>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                       <p className="text-[9px] font-black text-amber-600 uppercase mb-1">Dica Tática:</p>
                       <p className="text-[10px] text-amber-800 font-medium leading-tight">{subject.psychology?.tacticalAdvice}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {data.topQuestions && (
            <div className="space-y-6">
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                Questões que Ilustram o Perfil da Banca
              </h4>
              <div className="grid gap-6">
                {data.topQuestions.map((q, idx) => (
                  <QuestionItem 
                    key={idx}
                    question={q}
                    index={idx}
                    modelo={q.options ? ModeloQuestao.MULTIPLA_ESCOLHA : ModeloQuestao.VERDADEIRO_FALSO}
                    selectedAnswer={null}
                    onSelect={() => {}}
                    isCorrected={true}
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
