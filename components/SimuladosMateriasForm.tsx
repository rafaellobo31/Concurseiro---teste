
import React, { useState } from 'react';
import { ModeloQuestao } from '../types';

interface SimuladosMateriasFormProps {
  onGenerate: (materia: string, modelo: ModeloQuestao, numQuestao: number, banca: string) => void;
  onShowProWall: (feature: string) => void;
  isLoading: boolean;
  isPro?: boolean;
}

const MATERIAS = [
  'Interpretação de Texto',
  'Português',
  'Matemática',
  'Raciocínio Lógico',
  'Geografia',
  'Informática',
  'Direito Administrativo',
  'Direito Constitucional',
  'Direito Penal',
  'Direito Processual Penal',
  'Direito Civil',
  'Direito Tributário',
  'Administração Pública',
  'Contabilidade Geral',
  'Economia'
];

const SimuladosMateriasForm: React.FC<SimuladosMateriasFormProps> = ({ onGenerate, onShowProWall, isLoading, isPro = false }) => {
  const [materia, setMateria] = useState(MATERIAS[0]);
  const [numQuestao, setNumQuestao] = useState(3);
  const [modelo, setModelo] = useState<ModeloQuestao>(ModeloQuestao.MULTIPLA_ESCOLHA);
  const [banca, setBanca] = useState('');

  const handleNumChange = (val: number) => {
    if (!isPro && val > 20) {
      onShowProWall("gerar simulados completos por matéria com até 50 questões");
      return;
    }
    setNumQuestao(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(materia, modelo, numQuestao, banca);
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-2xl max-w-3xl mx-auto mb-12 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-4 mb-8 border-b border-gray-50 pb-6">
        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">Treino por Disciplina</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Foque nos seus pontos fracos</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Matéria Principal</label>
            <select 
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-indigo-500 bg-white font-bold text-slate-900 appearance-none cursor-pointer outline-none transition-all shadow-sm"
            >
              {MATERIAS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex justify-between">
              Quantidade 
              {!isPro && <span className="text-amber-500 font-black">Grátis: 20</span>}
            </label>
            <select 
              value={numQuestao}
              onChange={(e) => handleNumChange(parseInt(e.target.value))}
              className={`w-full p-4 rounded-2xl border-2 bg-white transition-all text-slate-900 font-bold appearance-none cursor-pointer outline-none shadow-sm ${
                !isPro && numQuestao > 20 ? 'border-amber-200' : 'border-gray-100 focus:border-indigo-500'
              }`}
            >
              <option value={3}>3 Questões (Rápido)</option>
              <option value={10}>10 Questões</option>
              <option value={20}>20 Questões</option>
              <option value={50}>50 Questões</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Modelo de Resposta</label>
            <select 
              value={modelo}
              onChange={(e) => setModelo(e.target.value as ModeloQuestao)}
              className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-indigo-500 bg-white font-bold text-slate-900 appearance-none cursor-pointer outline-none transition-all shadow-sm"
            >
              {Object.values(ModeloQuestao).map((mod) => (
                <option key={mod} value={mod}>{mod}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Banca de Referência</label>
            <input
              type="text"
              value={banca}
              onChange={(e) => setBanca(e.target.value)}
              placeholder="Ex: FGV, Cebraspe, FCC..."
              className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-indigo-500 bg-white font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-base shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              GERANDO QUESTÕES...
            </>
          ) : (
            `INICIAR SIMULADO DE ${materia.toUpperCase()}`
          )}
        </button>
      </form>
    </div>
  );
};

export default SimuladosMateriasForm;
