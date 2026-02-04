
import React, { useState, useEffect } from 'react';
import { telemetry, TelemetryLog } from '../services/telemetry';

interface AdminDashboardProps {
  isPro?: boolean;
  onUpgrade?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isPro = false, onUpgrade }) => {
  const [stats, setStats] = useState(telemetry.getStats());
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    setIsProduction(window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1'));
    const interval = setInterval(() => setStats(telemetry.getStats()), 5000);
    return () => clearInterval(interval);
  }, []);

  const KpiCard = ({ title, value, icon, color, subValue, premium }: any) => (
    <div className={`relative bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden transition-all ${premium && !isPro ? 'opacity-90' : ''}`}>
      {!isPro && premium && (
        <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-white/40 flex flex-col items-center justify-center p-4 text-center">
           <div className="bg-indigo-600 p-2 rounded-xl text-white mb-2 shadow-lg">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
           </div>
           <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-1">Recurso Elite</p>
           <button onClick={onUpgrade} className="text-[9px] font-bold text-indigo-600 underline">Liberar Análise</button>
        </div>
      )}
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${color} text-white`}>
          {icon}
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance</span>
      </div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
      {subValue && <p className="text-[10px] text-slate-400 font-bold mt-2">{subValue}</p>}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 animate-in fade-in duration-500">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              Centro de Inteligência Tática
            </span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Seu Painel de Performance</h2>
        </div>
        
        {!isPro && (
          <button 
            onClick={onUpgrade}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            DESBLOQUEAR MÉTODO DOS APROVADOS
          </button>
        )}
      </header>

      {/* Diagnóstico de Conversão */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <KpiCard 
          title="Simulados Concluídos" 
          value={stats.totalRequests} 
          color="bg-indigo-600"
          subValue="Volume de treino acumulado"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>} 
        />
        <KpiCard 
          title="Probabilidade de Nomeação" 
          value={isPro ? "82%" : "??%"} 
          color="bg-emerald-500"
          premium={true}
          subValue="Cálculo baseado em editais 2024"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20"/><path d="m17 7-5-5-5 5"/><path d="m17 17-5 5-5-5"/></svg>} 
        />
        <KpiCard 
          title="Gap para Aprovados" 
          value={isPro ? "-12%" : "??%"} 
          color="bg-rose-500"
          premium={true}
          subValue="Sua distância do Top 5%"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>} 
        />
        <KpiCard 
          title="Tempo Médio / Questão" 
          value={isPro ? "1:42s" : "??s"} 
          color="bg-amber-500"
          premium={true}
          subValue="Agilidade tática estimada"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tabela de Atividade */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Histórico de Batalha</h3>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">Tempo Real</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Status</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Simulado</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Acertos</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Data</th>
                </tr>
              </thead>
              <tbody>
                {stats.logs.slice(0, 8).map((log: TelemetryLog) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors border-b border-gray-50 last:border-0">
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                         <span className="text-[10px] font-bold text-slate-500 uppercase">Concluído</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{log.metadata.description || 'Simulado Geral'}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{log.metadata.model}</p>
                    </td>
                    <td className="p-5">
                      <p className="text-xs font-black text-indigo-600">--</p>
                    </td>
                    <td className="p-5">
                      <p className="text-[10px] text-slate-400 font-bold">{new Date(log.timestamp).toLocaleDateString('pt-BR')}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isPro && (
            <div className="p-8 bg-indigo-600 text-white text-center">
              <h4 className="font-black text-lg mb-2">Seu histórico completo está bloqueado.</h4>
              <p className="text-indigo-100 text-sm mb-6 max-w-md mx-auto">Candidatos aprovados usam o histórico para identificar padrões de erro e ajustar a rota de estudos.</p>
              <button onClick={onUpgrade} className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">
                ATIVAR ANALYTICS ELITE
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Diagnóstico */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Diagnóstico de Nomeação</h4>
            <p className="text-xl font-black mb-6 leading-tight">Você foi bem, mas ainda não o suficiente para garantir a aprovação.</p>
            <div className="space-y-4 mb-8">
               <div className="flex items-center gap-3">
                 <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                 <p className="text-xs text-slate-300 font-medium">Nível atual: <span className="text-white font-black">Intermediário 1</span></p>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                 <p className="text-xs text-slate-300 font-medium">Fraqueza detectada: <span className="text-white font-black">Direito Administrativo</span></p>
               </div>
            </div>
            <p className="text-[11px] text-slate-400 italic mb-8">"Candidatos aprovados costumam ter desempenho 15% maior nestas matérias táticas."</p>
            <button onClick={onUpgrade} className="w-full bg-indigo-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">
              QUER ESTUDAR COMO QUEM PASSA?
            </button>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl"></div>
          </div>

          <div className={`bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl ${!isPro ? 'opacity-50 grayscale' : ''}`}>
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Gráfico de Evolução</h4>
             <div className="h-40 flex items-end gap-2 px-2">
                {[40, 65, 55, 80, 75, 90, 85].map((h, i) => (
                  <div key={i} className="flex-1 bg-indigo-100 rounded-t-lg transition-all hover:bg-indigo-600" style={{ height: `${h}%` }}></div>
                ))}
             </div>
             {!isPro && <p className="text-[9px] font-black text-center mt-4 text-indigo-600 uppercase">Desbloqueie para ver sua curva de aprendizado</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
