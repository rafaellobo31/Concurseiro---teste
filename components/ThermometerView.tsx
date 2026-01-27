
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ThermometerData, UserPlan, Modalidade, ModeloQuestao, Question } from '../types';
import { fetchThermometerData } from '../services/geminiService';
import QuestionItem from './QuestionItem';

interface ThermometerViewProps {
  userPlan: UserPlan;
  onUpgrade: () => void;
  onGenerateExam: (concurso: string, subjects: string[], banca: string) => void;
  onShowProWall: (feature: string) => void;
}

const CONCURSOS_SUGESTOES = [
  'Receita Federal', 'Polícia Federal', 'Polícia Rodoviária Federal', 'INSS', 
  'Banco do Brasil', 'Caixa Econômica', 'Petrobras', 'Correios', 'TCU', 'CGU',
  'TJ-SP', 'TJ-RJ', 'PC-SP', 'PC-MG', 'SEFAZ-SP', 'DETRAN-DF'
];

const BANCAS_SUGESTOES = [
  'FGV', 'Cebraspe', 'FCC', 'Vunesp', 'Idecan', 'IBFC', 'Cesgranrio'
];

const ThermometerView: React.FC<ThermometerViewProps> = ({ userPlan, onUpgrade, onGenerateExam, onShowProWall }) => {
  const [loading, setLoading] = useState(false);
  const [concurso, setConcurso] = useState('');
  const [banca, setBanca] = useState('');
  const [data, setData] = useState<ThermometerData | null>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showBancaAutocomplete, setShowBancaAutocomplete] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const bancaRef = useRef<HTMLDivElement>(null);

  const filteredAutocomplete = useMemo(() => {
    if (!concurso) return [];
    return CONCURSOS_SUGESTOES.filter(s => s.toLowerCase().includes(concurso.toLowerCase()));
  }, [concurso]);

  const filteredBancaAutocomplete = useMemo(() => {
    if (!banca) return [];
    return BANCAS_SUGESTOES.filter(s => s.toLowerCase().includes(banca.toLowerCase()));
  }, [banca]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
      if (bancaRef.current && !bancaRef.current.contains(e.target as Node)) {
        setShowBancaAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAnalyze = async () => {
    if (!concurso) return;
    if (!userPlan.isPro) {
      onShowProWall("acessar o Termômetro de Questões para análise de recorrência tática");
      return;
    }
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

  const handleGenerateSimuladoAction = () => {
    if (!data) return;
    const topSubjects = data.subjects
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3)
      .map(s => s.name);
    
    // Chama a função do pai que gerará o simulado e trocará a aba
    onGenerateExam(data.concurso, topSubjects, data.banca);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-in fade-in duration-700">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight uppercase">Termômetro de Questões</h2>
        <p className="text-slate-500 font-medium">Análise de calor por assunto: descubra o que <span className="text-indigo-600 font-black">realmente</span> cai na sua prova.</p>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl mb-12 relative">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 relative" ref={autocompleteRef}>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Órgão ou Concurso</label>
            <input 
              type="text" 
              placeholder="Ex: Receita Federal, TJ-SP, PF..."
              className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-indigo-500 bg-white font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-sm"
              value={concurso}
              onChange={(e) => { setConcurso(e.target.value); setShowAutocomplete(true); }}
              onFocus={() => { setShowAutocomplete(true); setShowBancaAutocomplete(false); }}
            />
            {showAutocomplete && filteredAutocomplete.length > 0 && (
              <div className="absolute z-[100] w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black ring-opacity-5 max-h-60 overflow-y-auto">
                {filteredAutocomplete.map((s, i) => (
                  <button key={i} onClick={() => { setConcurso(s); setShowAutocomplete(false); }} className="w-full text-left p-4 hover:bg-indigo-50 text-slate-700 font-bold text-sm border-b last:border-0 border-gray-50 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="md:col-span-4 relative" ref={bancaRef}>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Banca (Opcional)</label>
            <input 
              type="text" 
              placeholder="Ex: FGV, Cebraspe..."
              className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-indigo-500 bg-white font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-sm"
              value={banca}
              onChange={(e) => { setBanca(e.target.value); setShowBancaAutocomplete(true); }}
              onFocus={() => { setShowBancaAutocomplete(true); setShowAutocomplete(false); }}
            />
            {showBancaAutocomplete && filteredBancaAutocomplete.length > 0 && (
              <div className="absolute z-[100] w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black ring-opacity-5 max-h-60 overflow-y-auto">
                {filteredBancaAutocomplete.map((s, i) => (
                  <button key={i} onClick={() => { setBanca(s); setShowBancaAutocomplete(false); }} className="w-full text-left p-4 hover:bg-indigo-50 text-slate-700 font-bold text-sm border-b last:border-0 border-gray-50 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2 md:pt-6">
            <button 
              onClick={handleAnalyze}
              disabled={loading || !concurso}
              className="w-full h-[62px] bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'MAPEAR'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-indigo-50 shadow-xl mb-12 animate-pulse">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="font-black text-indigo-600 text-[10px] uppercase tracking-[0.2em]">Varrendo base de dados de concursos...</p>
        </div>
      )}

      {data && (
        <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                  <div>
                    <span className="bg-indigo-600 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 inline-block">Mapeamento Tático</span>
                    <h3 className="text-3xl font-black mb-1">{data.concurso}</h3>
                    <p className="text-indigo-300 font-bold text-xs uppercase tracking-widest">Foco sugerido na banca: {data.banca}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => setShowQuestions(!showQuestions)}
                      className="bg-white/10 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/10 hover:bg-white/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                      {showQuestions ? 'OCULTAR QUESTÕES' : 'QUESTÕES RECORRENTES'}
                    </button>
                    <button 
                      onClick={handleGenerateSimuladoAction}
                      className="bg-white text-indigo-600 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2"
                    >
                      CRIAR SIMULADO TOP ASSUNTOS
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </button>
                  </div>
                </div>
                <p className="text-slate-300 font-medium leading-relaxed italic border-l-4 border-indigo-500 pl-6 mb-2 text-lg">
                  "{data.analysis}"
                </p>
             </div>
             <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          </div>

          {showQuestions && data.topQuestions && data.topQuestions.length > 0 && (
            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                 <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Questões de Alta Recorrência</h4>
              </div>
              <div className="grid gap-6">
                {data.topQuestions.map((q, idx) => (
                  <QuestionItem 
                    key={q.id || idx} 
                    question={q} 
                    index={idx} 
                    modelo={q.options ? ModeloQuestao.MULTIPLA_ESCOLHA : ModeloQuestao.VERDADEIRO_FALSO} 
                    selectedAnswer={null} 
                    onSelect={() => {}} 
                    isCorrected={true}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.subjects.map((subject, idx) => (
              <div key={idx} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl hover:border-indigo-200 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                       <span className={`w-3 h-3 rounded-full ${
                         subject.heatLevel === 'High' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse' : 
                         subject.heatLevel === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                       }`}></span>
                       <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{subject.name}</h4>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden p-0.5 mb-1">
                       <div className={`h-full rounded-full transition-all duration-1000 ${
                         subject.heatLevel === 'High' ? 'bg-red-500' : 
                         subject.heatLevel === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                       }`} style={{ width: `${subject.frequency}%` }}></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{subject.frequency}% de frequência histórica</span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest ml-4 shrink-0 ${
                    subject.heatLevel === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : 
                    subject.heatLevel === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                    'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  }`}>
                    {subject.heatLevel === 'High' ? 'Crítico' : subject.heatLevel === 'Medium' ? 'Atenção' : 'Base'}
                  </div>
                </div>
                <p className="text-slate-500 text-sm font-medium leading-relaxed italic">
                  {subject.description}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 text-center">
             <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
             </div>
             <p className="text-indigo-900 font-black text-sm mb-1 uppercase tracking-tight">Dica de Performance Tática</p>
             <p className="text-indigo-700 font-medium text-xs leading-relaxed max-w-lg mx-auto italic">
               "Identificar as questões de alta recorrência permite que você treine o 'olhar' da banca. Muitas vezes, o que muda é apenas o enunciado, mas a lógica de cobrança permanece idêntica."
             </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThermometerView;
