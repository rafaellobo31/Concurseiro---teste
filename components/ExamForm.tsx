
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Modalidade, ModeloQuestao, Nivel } from '../types';
import { catalogService, ContestCatalog } from '../services/catalogService';

interface ExamFormProps {
  onGenerate: (modalidade: Modalidade, concurso: string, nivel: Nivel | string, cargoArea: string, modelo: ModeloQuestao, numQuestao: number, banca: string, estado?: string, isFavOnly?: boolean) => void;
  onShowProWall: (feature: string) => void;
  isLoading: boolean;
  isPro?: boolean;
  hasFavorites?: boolean;
}

const ORGAOS_NACIONAL = [
  'Receita Federal', 'Polícia Federal (PF)', 'Polícia Rodoviária Federal (PRF)', 
  'INSS', 'Banco do Brasil', 'Caixa Econômica Federal', 'Petrobras', 'Correios', 
  'IBGE', 'Banco Central (Bacen)', 'TCU', 'CGU', 'Senado Federal', 'Câmara dos Deputados',
  'TRE (Tribunal Regional Eleitoral)', 'TRT (Tribunal Regional do Trabalho)'
];

const ORGAOS_ESTADUAL = [
  'Tribunal de Justiça (TJ)', 'Polícia Civil (PC)', 'Polícia Militar (PM)', 
  'Secretaria da Fazenda (SEFAZ)', 'Ministério Público Estadual (MP)', 
  'DETRAN', 'Corpo de Bombeiros (CBM)'
];

const BANCAS_POPULARES = [
  'FGV', 'Cebraspe', 'FCC', 'Vunesp', 'Idecan', 'IBFC', 'Cesgranrio', 
  'Consulplan', 'Instituto AOCP', 'Fadesp', 'Quadrix', 'Fundatec'
];

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const ExamForm: React.FC<ExamFormProps> = ({ onGenerate, onShowProWall, isLoading, isPro = false, hasFavorites = false }) => {
  const [modalidade, setModalidade] = useState<Modalidade>(Modalidade.NACIONAL);
  const [concurso, setConcurso] = useState('');
  const [nivel, setNivel] = useState<Nivel | string>('');
  const [cargoArea, setCargoArea] = useState('Geral');
  const [banca, setBanca] = useState('');
  const [estado, setEstado] = useState('');
  const [numQuestao, setNumQuestao] = useState(10);
  const [modelo, setModelo] = useState<ModeloQuestao>(ModeloQuestao.MULTIPLA_ESCOLHA);
  
  // Estados do Catálogo Dinâmico
  const [catalog, setCatalog] = useState<ContestCatalog | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [showOrgAutocomplete, setShowOrgAutocomplete] = useState(false);
  const [showBancaAutocomplete, setShowBancaAutocomplete] = useState(false);
  
  const orgRef = useRef<HTMLDivElement>(null);
  const bancaRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

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

  // Função robusta para carregar o catálogo com timeout e proteção de race condition
  const loadCatalog = async (name: string) => {
    if (!name || name.length < 2) {
      setCatalog(null);
      setNivel('');
      setCargoArea('Geral');
      setCatalogError(null);
      return;
    }

    const currentId = ++requestIdRef.current;
    
    // Reset imediato do estado para evitar dados do concurso anterior
    setIsLoadingCatalog(true);
    setCatalogError(null);
    setCatalog(null);
    setNivel('');
    setCargoArea('Geral');

    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), 8000)
    );

    try {
      const data = await Promise.race([
        catalogService.getCatalog(name),
        timeoutPromise
      ]) as ContestCatalog;

      // Proteção de Race Condition: Ignora se houve uma nova requisição iniciada
      if (currentId !== requestIdRef.current) return;

      if (data && data.hasLevels && data.levels.length > 0) {
        setCatalog(data);
        setNivel(data.levels[0].nivel);
      } else {
        // Fallback: Concurso sem níveis detectados
        setCatalog({ ...data, hasLevels: false });
        setNivel('');
        setCargoArea('Geral');
      }
    } catch (e) {
      if (currentId !== requestIdRef.current) return;
      
      console.warn("[Catalog] Falha ou Timeout:", e);
      setCatalogError("Não foi possível carregar cargos agora. Continuando com modo Geral.");
      setCatalog({ concurso: name, hasLevels: false, levels: [], timestamp: Date.now() });
      setNivel('');
      setCargoArea('Geral');
    } finally {
      if (currentId === requestIdRef.current) {
        setIsLoadingCatalog(false);
      }
    }
  };

  const handleSelectConcurso = (name: string) => {
    setConcurso(name);
    setShowOrgAutocomplete(false);
    loadCatalog(name);
  };

  const cargoOptions = useMemo(() => {
    if (!catalog || !catalog.hasLevels || !nivel) return ['Geral'];
    const levelData = catalog.levels.find(l => l.nivel === nivel);
    return levelData ? ['Geral', ...levelData.cargos] : ['Geral'];
  }, [catalog, nivel]);

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
    setNivel('');
    setCargoArea('Geral');
    setCatalog(null);
    setCatalogError(null);
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
              <div className="relative">
                <input 
                  type="text" 
                  placeholder={modalidade === Modalidade.NACIONAL ? "Ex: Receita Federal, INSS, Banco do Brasil..." : "Ex: TJ, Polícia Civil, SEFAZ..."}
                  className={`w-full p-4 pr-12 rounded-2xl border-2 bg-white font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 outline-none transition-all shadow-sm ${isLoadingCatalog ? 'border-indigo-100' : 'border-gray-100'}`}
                  value={concurso} 
                  onChange={e => { setConcurso(e.target.value); setShowOrgAutocomplete(true); }}
                  onFocus={() => { setShowOrgAutocomplete(true); setShowBancaAutocomplete(false); }}
                  onBlur={() => {
                    // Só dispara o carregamento no blur se o autocomplete não estiver sendo usado
                    setTimeout(() => {
                      if (!showOrgAutocomplete) loadCatalog(concurso);
                    }, 200);
                  }}
                />
                {isLoadingCatalog && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              
              {showOrgAutocomplete && filteredOrgSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto ring-1 ring-black ring-opacity-5">
                  {filteredOrgSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectConcurso(s)}
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
                  className="w-full p-4 rounded-2xl border-2 bg-white font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-sm border-gray-100"
                >
                  <option value="">Selecione</option>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            )}
          </div>

          {catalogError && (
             <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-amber-500"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">{catalogError}</p>
             </div>
          )}

          {catalog?.hasLevels && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nível de Escolaridade</label>
                <select 
                  value={nivel}
                  onChange={(e) => setNivel(e.target.value)}
                  className="w-full p-4 rounded-2xl border-2 bg-white font-black text-slate-900 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-sm border-gray-100"
                >
                  {catalog.levels.map(l => <option key={l.nivel} value={l.nivel}>{l.nivel}</option>)}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Área / Cargo Específico</label>
                <select 
                  value={cargoArea}
                  onChange={(e) => setCargoArea(e.target.value)}
                  className="w-full p-4 rounded-2xl border-2 bg-white font-black text-slate-900 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-sm border-gray-100"
                >
                  {cargoOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 relative" ref={bancaRef}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Banca Examinadora</label>
              <input 
                type="text" 
                placeholder="Ex: FGV, Cebraspe, FCC..." 
                className="w-full p-4 rounded-2xl border-2 bg-white font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 outline-none transition-all shadow-sm border-gray-100"
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo de Resposta</label>
              <select 
                value={modelo} 
                onChange={e => setModelo(e.target.value as ModeloQuestao)} 
                className="w-full p-4 rounded-2xl border-2 bg-white font-black text-slate-900 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-sm border-gray-100"
              >
                {Object.values(ModeloQuestao).map((mod) => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                Nº de Questões
                {!isPro && <span className="text-amber-500 font-black">Máx Free: 20</span>}
              </label>
              <select 
                value={numQuestao} 
                onChange={e => handleNumQuestaoChange(Number(e.target.value))} 
                className={`w-full p-4 rounded-2xl border-2 bg-white font-black text-slate-900 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-sm ${!isPro && numQuestao > 20 ? 'border-amber-200' : 'border-gray-100'}`}
              >
                <option value={3}>3 Questões (Rápido)</option>
                <option value={10}>10 Questões (Padrão)</option>
                <option value={20}>20 Questões (Intensivo)</option>
                <option value={50}>50 Questões (Simulado Real)</option>
              </select>
            </div>
          </div>

          <button 
            onClick={() => onGenerate(modalidade, concurso, nivel, cargoArea, modelo, numQuestao, banca, estado)}
            disabled={isLoading || !concurso || (modalidade === Modalidade.ESTADUAL && !estado)}
            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-base shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                GERANDO SIMULADO TÁTICO...
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
            <h4 className="text-sm font-black text-amber-900 mb-2 uppercase tracking-tight">Revisão Tática</h4>
            <p className="text-xs text-amber-700 font-medium mb-6 leading-relaxed">Refaça apenas as questões que você favoritou anteriormente.</p>
            <button 
                onClick={() => isPro ? onGenerate(modalidade, "", "", "Geral", modelo, 0, "", undefined, true) : onShowProWall("acessar e treinar suas questões favoritadas")}
                disabled={isPro && !hasFavorites}
                className="w-full bg-amber-500 text-white py-4 rounded-xl font-black text-xs shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {!isPro && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
              INICIAR REVISÃO
            </button>
          </div>

          <div className="bg-indigo-50/50 rounded-[2rem] p-6 border border-indigo-100/50 text-center">
             <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Dica C-PRO</p>
             <p className="text-[11px] text-indigo-800 font-medium italic">"Qualidade supera quantidade. Analise o gabarito comentado de cada questão."</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamForm;
