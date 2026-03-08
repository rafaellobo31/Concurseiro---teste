
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StudyPlan, UserPlan } from '../types';
import { generateStudyPlan } from '../services/geminiService';
import PricingModal from './PricingModal';

interface StudyMaterialProps {
  userPlan: UserPlan;
  onUpgrade: () => void;
  onSavePlan?: (plan: StudyPlan) => void;
  initialInstitution?: string;
  isLoggedIn?: boolean;
}

const MATERIAS_SUGESTOES = [
  'Receita Federal', 'Polícia Federal (PF)', 'Polícia Rodoviária Federal (PRF)', 
  'INSS', 'Banco do Brasil', 'Caixa Econômica Federal', 'Petrobras', 'Correios', 
  'IBGE', 'Banco Central (Bacen)', 'TCU', 'CGU', 'Senado Federal', 'Câmara dos Deputados',
  'Tribunal de Justiça (TJ)', 'Polícia Civil (PC)', 'Polícia Militar (PM)', 
  'Secretaria da Fazenda (SEFAZ)', 'Ministério Público Estadual (MP)', 
  'DETRAN', 'Corpo de Bombeiros (CBM)', 'Defensoria Pública Estadual'
];

const StudyMaterial: React.FC<StudyMaterialProps> = ({ userPlan, onUpgrade, onSavePlan, initialInstitution = '', isLoggedIn }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isNotFound, setIsNotFound] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [institution, setInstitution] = useState(initialInstitution);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [planDuration, setPlanDuration] = useState(6);
  const [planDays, setPlanDays] = useState(5);
  const [planHours, setPlanHours] = useState(4);
  
  const currentYear = new Date().getFullYear();
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialInstitution) {
      setInstitution(initialInstitution);
    }
  }, [initialInstitution]);

  const filteredAutocomplete = useMemo(() => {
    if (!institution) return [];
    return MATERIAS_SUGESTOES.filter(s => 
      s.toLowerCase().includes(institution.toLowerCase())
    );
  }, [institution]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    if (loading) {
      setProgress(0);
      interval = window.setInterval(() => {
        setProgress(prev => {
          if (prev < 40) return prev + 4; 
          if (prev < 85) return prev + 1; 
          if (prev < 98) return prev + 0.3; 
          return prev;
        });
      }, 200);
    }
    return () => { if (interval !== undefined) clearInterval(interval); };
  }, [loading]);

  const handleGeneratePlan = async () => {
    if (!institution) return;
    if (!userPlan.isPro) { setShowPaywall(true); return; }
    
    setLoading(true);
    setIsNotFound(false);
    setPlan(null);
    setIsSaved(false);
    setShowAutocomplete(false);
    
    try {
      const data = await generateStudyPlan(institution, planDuration, planDays, planHours);
      setPlan(data);
    } catch (e) {
      console.error(e);
      setIsNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (plan && onSavePlan && isLoggedIn) {
      onSavePlan(plan);
      setIsSaved(true);
    }
  };

  if (showPaywall && !userPlan.isPro) {
    return <div className="py-12"><PricingModal onUpgrade={() => { onUpgrade(); setShowPaywall(false); }} onClose={() => setShowPaywall(false)} /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight uppercase">Cronogramas de Elite</h2>
        <p className="text-slate-500 font-medium">Planejamento tático baseado em editais reais e sua disponibilidade de tempo.</p>
      </div>

      {!plan && !loading && (
        <div className="bg-white p-8 rounded-[2rem] border border-gray-200 shadow-xl mb-8 animate-in zoom-in duration-300">
          <div className="space-y-6">
            <div className="relative" ref={autocompleteRef}>
              <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Alvo do Planejamento</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Ex: Receita Federal, Polícia Federal, TJ-SP..."
                  className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-indigo-500 bg-white font-bold text-slate-900 placeholder:text-slate-400 transition-all text-base outline-none"
                  value={institution}
                  onChange={(e) => { setInstitution(e.target.value); setShowAutocomplete(true); }}
                  onFocus={() => setShowAutocomplete(true)}
                />
                <div className="absolute right-4 top-4 text-slate-200">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>
                </div>
              </div>
              
              {showAutocomplete && filteredAutocomplete.length > 0 && (
                <div className="absolute top-[85px] z-50 w-full bg-white border border-gray-100 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                  {filteredAutocomplete.map((s, i) => (
                    <div key={i} onClick={() => { setInstitution(s); setShowAutocomplete(false); }} className="p-4 hover:bg-indigo-50 cursor-pointer text-sm font-bold text-slate-700 border-b last:border-0 border-gray-50">{s}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meses até a Prova</label>
                <input 
                  type="number" 
                  min="1" 
                  value={planDuration} 
                  onChange={(e) => setPlanDuration(Number(e.target.value))} 
                  className="w-full p-4 rounded-xl border-2 border-gray-100 bg-white text-slate-900 font-black text-base focus:border-indigo-500 transition-all outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dias de Estudo / Semana</label>
                <input 
                  type="number" 
                  min="1" 
                  max="7" 
                  value={planDays} 
                  onChange={(e) => setPlanDays(Number(e.target.value))} 
                  className="w-full p-4 rounded-xl border-2 border-gray-100 bg-white text-slate-900 font-black text-base focus:border-indigo-500 transition-all outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas Líquidas / Dia</label>
                <input 
                  type="number" 
                  min="1" 
                  max="24" 
                  value={planHours} 
                  onChange={(e) => setPlanHours(Number(e.target.value))} 
                  className="w-full p-4 rounded-xl border-2 border-gray-100 bg-white text-slate-900 font-black text-base focus:border-indigo-500 transition-all outline-none" 
                />
              </div>
            </div>

            <button 
              onClick={handleGeneratePlan}
              disabled={loading || !institution}
              className="w-full bg-indigo-600 text-white px-8 py-5 rounded-xl font-black hover:bg-indigo-700 disabled:bg-gray-200 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 text-sm tracking-widest"
            >
              {!userPlan.isPro && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
              CRIAR CRONOGRAMA PERSONALIZADO {!userPlan.isPro && '(PRO)'}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white p-12 rounded-[2rem] border border-indigo-50 shadow-2xl text-center mb-8 animate-in zoom-in">
           <div className="w-full bg-gray-50 rounded-full h-3 mb-6 overflow-hidden p-0.5 border border-gray-100">
             <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
           </div>
           <p className="font-black text-indigo-600 animate-pulse text-xs uppercase tracking-[0.2em]">Sincronizando com as Tendências de {currentYear}...</p>
        </div>
      )}

      {plan && (
        <div className="bg-white rounded-[2rem] border border-gray-200 shadow-2xl overflow-hidden mb-10 animate-in fade-in slide-in-from-bottom-8">
          <div className="bg-gray-900 p-8 text-white flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <div>
              <h3 className="text-2xl font-black mb-1">{plan.title}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{plan.summary}</p>
            </div>
            <div className="flex gap-3">
              {isLoggedIn && (
                <button 
                  onClick={handleSave}
                  disabled={isSaved}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all border ${
                    isSaved 
                      ? 'bg-emerald-500 text-white border-emerald-500' 
                      : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                  } flex items-center gap-2`}
                >
                  {isSaved ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      SALVO
                    </>
                  ) : (
                    'SALVAR PLANO'
                  )}
                </button>
              )}
              <button 
                onClick={() => setPlan(null)} 
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl text-[10px] font-black transition-colors border border-white/10"
              >
                REINICIAR
              </button>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-slate-900">
              {plan.phases.map((phase, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col">
                   <span className="text-[10px] font-black text-indigo-600 uppercase mb-3 block tracking-widest">Fase {i+1}: {phase.name}</span>
                   <p className="font-bold text-slate-900 mb-2 leading-tight flex-1">{phase.objective}</p>
                   <p className="text-[10px] text-slate-400 font-bold mb-4 uppercase">{phase.duration}</p>
                   <div className="flex flex-wrap gap-1">
                     {phase.subjects.map((sub, idx) => <span key={idx} className="text-[9px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded border border-gray-100">{sub}</span>)}
                   </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                <h4 className="font-black text-amber-700 mb-6 text-[11px] uppercase tracking-widest flex items-center gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                   Assuntos Críticos (Prioridade)
                </h4>
                <div className="space-y-2">
                  {plan.criticalTopics.map((topic, i) => <div key={i} className="bg-white p-3 rounded-xl text-amber-900 text-xs font-bold shadow-sm flex items-center gap-3"><span className="w-5 h-5 bg-amber-200 text-amber-800 rounded flex items-center justify-center text-[9px] font-black">{i+1}</span> {topic}</div>)}
                </div>
              </div>
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <h4 className="font-black text-indigo-700 mb-6 text-[11px] uppercase tracking-widest flex items-center gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20"/><path d="m17 7-5-5-5 5"/><path d="m17 17-5 5-5-5"/></svg>
                   Sugestão de Rotina Diária
                </h4>
                <div className="space-y-3">
                  {plan.weeklyRoutine.map((step, i) => <div key={i} className="text-xs text-indigo-900 font-medium flex gap-3 bg-white/50 p-3 rounded-xl"><span className="text-indigo-600 font-black">→</span> {step}</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isNotFound && !loading && (
        <div className="text-center py-20 bg-white rounded-[2rem] border border-red-50 shadow-2xl max-w-lg mx-auto">
           <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
           </div>
           <h4 className="text-xl font-black text-slate-900 mb-2">Órgão não mapeado</h4>
           <p className="text-slate-400 mb-8 font-medium px-10 text-sm">Não localizamos dados de editais recentes para este termo. Tente ser mais específico (ex: "Receita Federal" em vez de "RFB").</p>
           <button onClick={() => { setIsNotFound(false); setInstitution(''); }} className="bg-gray-900 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest">Tentar Outro</button>
        </div>
      )}
    </div>
  );
};

export default StudyMaterial;
