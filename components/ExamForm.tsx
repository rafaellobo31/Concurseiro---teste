
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Modalidade, ModeloQuestao } from '../types';

interface ExamFormProps {
  onGenerate: (modalidade: Modalidade, concurso: string, modelo: ModeloQuestao, numQuestao: number, banca: string, estado?: string, isFavOnly?: boolean) => void;
  onShowProWall: (feature: string) => void;
  isLoading: boolean;
  isPro?: boolean;
  hasFavorites?: boolean;
}

const ORGAOS_NACIONAL = [
  'Receita Federal', 'Polícia Federal (PF)', 'Polícia Rodoviária Federal (PRF)', 
  'INSS', 'Banco do Brasil', 'Caixa Econômica Federal', 'Petrobras', 'Correios', 
  'IBGE', 'Banco Central (Bacen)', 'TCU', 'CGU', 'Senado Federal', 'Câmara dos Deputados',
  'ABIN', 'TRE (Tribunal Regional Eleitoral)', 'TRT (Tribunal Regional do Trabalho)'
];

const ORGAOS_ESTADUAL = [
  'Tribunal de Justiça (TJ)', 'Polícia Civil (PC)', 'Polícia Militar (PM)', 
  'Secretaria da Fazenda (SEFAZ)', 'Ministério Público Estadual (MP)', 
  'DETRAN', 'Corpo de Bombeiros (CBM)', 'Defensoria Pública Estadual',
  'Seduc (Secretaria de Educação)', 'Sesa (Secretaria de Saúde)'
];

const BANCAS_POPULARES = [
  'FGV', 'Cebraspe', 'FCC', 'Vunesp', 'Idecan', 'IBFC', 'Cesgranrio', 
  'Consulplan', 'Instituto AOCP', 'Fadesp', 'Quadrix', 'Fundatec', 
  'FAUEL', 'IESES', 'COPESE', 'COVEST'
];

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const ExamForm: React.FC<ExamFormProps> = ({ onGenerate, onShowProWall, isLoading, isPro = false, hasFavorites = false }) => {
  const [modalidade, setModalidade] = useState<Modalidade>(Modalidade.NACIONAL);
  const [concurso, setConcurso] = useState('');
  const [banca, setBanca] = useState('');
  const [estado, setEstado] = useState('');
  const [numQuestao, setNumQuestao] = useState(3);
  const [modelo, setModelo] = useState<ModeloQuestao>(ModeloQuestao.MULTIPLA_ESCOLHA);
  
  const [showOrgAutocomplete, setShowOrgAutocomplete] = useState(false);
  const [showBancaAutocomplete, setShowBancaAutocomplete] = useState(false);
  
  const orgRef = useRef<HTMLDivElement>(null);
  const bancaRef = useRef<HTMLDivElement>(null);

  const currentOrgSuggestions = useMemo(() => {
    return modalidade === Modalidade.NACIONAL ? ORGAOS_NACIONAL : ORGAOS_ESTADUAL;
  }, [modalidade]);

  const filteredOrgSuggestions = useMemo(() => {
    if (!concurso || concurso.length < 1) return [];
    return currentOrgSuggestions.filter(s => 
      s.toLowerCase().includes(concurso.toLowerCase())
    ).slice(0, 6);
  }, [concurso, currentOrgSuggestions]);

  const filteredBancaSuggestions = useMemo(() => {
    if (!banca || banca.length < 1) return [];
    return BANCAS_POPULARES.filter(s => 
      s.toLowerCase().includes(banca.toLowerCase())
    ).slice(0, 6);
  }, [banca]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (orgRef.current && !orgRef.current.contains(e.target as Node)) setShowOrgAutocomplete(false);
      if (bancaRef.current && !bancaRef.current.contains(e.target as Node)) setShowBancaAutocomplete(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModalidadeChange = (m: Modalidade) => {
    setModalidade(m);
    setConcurso('');
    if (m === Modalidade.NACIONAL) setEstado('');
  };

  const handleNumQuestaoChange = (val: number) => {
    if (!isPro && val > 20) {
      onShowProWall("gerar simulados com até 50 questões e análise detalhada");
      return;
    }
    setNumQuestao(val);
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-2xl space-y-8 animate-in zoom-in duration-300">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Novo Simulado</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Geração baseada em questões reais</p>
            </div>
            <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
              <button 
                onClick={() => handleModalidadeChange(Modalidade.NACIONAL)} 
                className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${modalidade === Modalidade.NACIONAL ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Nacional
              </button>
              <button 
                onClick={() => handleModalidadeChange(Modalidade.ESTADUAL)} 
                className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${modalidade === Modalidade.ESTADUAL ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Estadual
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className={`relative ${modalidade === Modalidade.ESTADUAL ? 'md:col-span-9' : 'md:col-span-12'}`} ref={orgRef}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Órgão / Concurso</label>
              <input 
                type="text" 
                placeholder={modalidade === Modalidade.NACIONAL ? "Ex: Receita Federal, PF, Bacen..." : "Ex: TJ, Polícia Civil, SEFAZ..."}
                className="w-full p-4 rounded-2xl border-2 bg-white font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 outline-none transition-all shadow-sm"
                value={concurso} 
                onChange={e => { setConcurso(e.target.value); setShowOrgAutocomplete(true); }}
                onFocus={() => { setShowOrgAutocomplete(true); setShowBancaAutocomplete(false); }}
              />
              
              {showOrgAutocomplete && filteredOrgSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto ring-1 ring-black ring-opacity-5">
                  {filteredOrgSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setConcurso(s); setShowOrgAutocomplete(false); }}
                      className="w-full text-left p-4 hover:bg-indigo-50 text-slate-700 font-bold text-sm border-b last:border-0 border-gray-50 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {modalidade === Modalidade.ESTADUAL && (
              <div className="md:col-span-3 animate-in slide-in-from-right-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Estado (UF)</label>
                <select 
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full p-4 rounded-2xl border-2 bg-white font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">Selecione</option>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 relative" ref={bancaRef}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Banca Examinadora</label>
              <input 
                type="text" 
                placeholder="Ex: FGV, Cebraspe, FCC..." 
                className="w-full p-4 rounded-2xl border-2 bg-white font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 outline-none transition-all shadow-sm"
                value={banca}
                onChange={e => { setBanca(e.target.value); setShowBancaAutocomplete(true); }}
                onFocus={() => { setShowBancaAutocomplete(true); setShowOrgAutocomplete(false); }}
              />
              
              {showBancaAutocomplete && filteredBancaSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto ring-1 ring-black ring-opacity-5">
                  {filteredBancaSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setBanca(s); setShowBancaAutocomplete(false); }}
                      className="w-full text-left p-4 hover:bg-indigo-50 text-slate-700 font-bold text-sm border-b last:border-0 border-gray-50 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo de Questão</label>
              <select 
                value={modelo} 
                onChange={e => setModelo(e.target.value as ModeloQuestao)} 
                className="w-full p-4 rounded-2xl border-2 bg-white font-black text-slate-900 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
              >
                {Object.values(ModeloQuestao).map((mod) => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                Nº de Questões
                {!isPro && <span className="text-amber-500 font-black">Grátis: 20</span>}
              </label>
              <select 
                value={numQuestao} 
                onChange={e => handleNumQuestaoChange(Number(e.target.value))} 
                className={`w-full p-4 rounded-2xl border-2 bg-white font-black text-slate-900 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-sm ${!isPro && numQuestao > 20 ? 'border-amber-200' : ''}`}
              >
                <option value={3}>3 Questões (Rápido)</option>
                <option value={10}>10 Questões (Padrão)</option>
                <option value={20}>20 Questões (Intensivo)</option>
                <option value={50}>50 Questões (Simulado Real)</option>
              </select>
            </div>
          </div>

          <button 
            onClick={() => onGenerate(modalidade, concurso, modelo, numQuestao, banca, estado)}
            disabled={isLoading || !concurso || (modalidade === Modalidade.ESTADUAL && !estado)}
            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-base shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                PROCESSANDO QUESTÕES...
              </>
            ) : (
              'GERAR SIMULADO AGORA'
            )}
          </button>
        </div>

        <div className="lg:w-72 space-y-4">
          <div className="bg-amber-50 rounded-[2rem] p-8 border border-amber-100 flex flex-col justify-center text-center">
            <div className="bg-amber-100 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <h4 className="text-sm font-black text-amber-900 mb-2 uppercase tracking-tight">Questões Salvas</h4>
            <p className="text-xs text-amber-700 font-medium mb-6 leading-relaxed">Refaça apenas as questões que você favoritou anteriormente.</p>
            <button 
                onClick={() => isPro ? onGenerate(modalidade, "", modelo, 0, "", undefined, true) : onShowProWall("acessar e treinar suas questões favoritadas")}
                disabled={isPro && !hasFavorites}
                className="w-full bg-amber-500 text-white py-4 rounded-xl font-black text-xs shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {!isPro && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
              INICIAR TREINO
            </button>
          </div>

          <div className="bg-indigo-50/50 rounded-[2rem] p-6 border border-indigo-100/50 text-center">
             <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Dica C-PRO</p>
             <p className="text-[11px] text-indigo-800 font-medium italic">"A constância é o segredo da aprovação. Realize ao menos 10 questões por dia."</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamForm;
