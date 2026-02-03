
import React, { useState, useEffect } from 'react';
import { telemetry, TelemetryLog } from '../services/telemetry';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState(telemetry.getStats());
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProduction, setIsProduction] = useState(false);
  const [hasStudioBridge, setHasStudioBridge] = useState(false);

  useEffect(() => {
    // Detecta se estamos em produção no Vercel
    setIsProduction(window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1'));

    const checkBridge = async () => {
      try {
        const studio = (window as any).aistudio;
        const hasKey = studio ? await studio.hasSelectedApiKey() : false;
        setHasStudioBridge(hasKey);
      } catch (e) {
        setHasStudioBridge(false);
      }
    };
    
    checkBridge();
    const interval = setInterval(() => {
      setStats(telemetry.getStats());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenSelectKey = async () => {
    const studio = (window as any).aistudio;
    if (studio && studio.openSelectKey) {
      try {
        await studio.openSelectKey();
        setHasStudioBridge(true);
      } catch (e) {
        setErrorMessage("Não foi possível abrir o seletor do Google AI Studio.");
      }
    } else {
      setErrorMessage("Recurso disponível apenas no ambiente Google AI Studio.");
    }
  };

  const testConnection = async () => {
    setTestStatus('loading');
    setErrorMessage('');
    
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3-flash-preview',
          contents: 'Diga "Backend Online"',
          config: { systemInstruction: "Responda de forma ultra concisa." }
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Erro HTTP ${response.status}`);
      }

      if (data.text) {
        setTestStatus('success');
      } else {
        throw new Error("O backend respondeu, mas a IA retornou conteúdo vazio.");
      }
    } catch (e: any) {
      console.error("[AdminTest] Falha:", e);
      setTestStatus('error');
      setErrorMessage(e.message || "Erro desconhecido na comunicação com o proxy.");
    }
  };

  const KpiCard = ({ title, value, icon, color, subValue }: any) => (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${color} text-white`}>
          {icon}
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Real</span>
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
            <div className={`w-2 h-2 rounded-full animate-pulse ${testStatus === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              {isProduction ? 'Produção: Vercel Cloud' : 'Ambiente Local'}
            </span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Painel Administrativo</h2>
        </div>
        
        <div className="flex flex-wrap gap-4">
           {/* Bridge só aparece em contexto de Studio Local */}
           {!isProduction && !hasStudioBridge && (
             <button 
               onClick={handleOpenSelectKey}
               className="bg-amber-500 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L22 22m-5-5l.707-.707"/></svg>
               Ativar Bridge (Studio)
             </button>
           )}

           <button 
             onClick={testConnection}
             disabled={testStatus === 'loading'}
             className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${
               testStatus === 'success' ? 'bg-emerald-500 text-white' :
               testStatus === 'error' ? 'bg-red-500 text-white' :
               'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
             }`}
           >
             {testStatus === 'loading' ? 'Verificando Proxy...' : 
              testStatus === 'success' ? 'Backend Operacional' : 
              testStatus === 'error' ? 'Falha no Diagnóstico' : 'Testar Proxy Vercel'}
           </button>
        </div>
      </header>

      {errorMessage && (
        <div className="mb-8 p-6 bg-red-50 border-2 border-red-100 rounded-[2rem] text-red-600 text-xs font-bold">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 p-2 rounded-xl text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <p className="text-sm font-black mb-1">Erro de Conectividade</p>
              <p className="opacity-80 leading-relaxed">{errorMessage}</p>
              {isProduction && (
                <p className="mt-4 text-[10px] uppercase text-red-400">Dica: Verifique se a API_KEY está configurada no painel de Environment Variables do Vercel.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isProduction && (
        <div className="mb-8 p-6 bg-indigo-50 border border-indigo-100 rounded-[2rem] flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="bg-indigo-600 p-3 rounded-2xl text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
              <div>
                <h4 className="font-black text-indigo-900 text-sm">Arquitetura de Produção Ativa</h4>
                <p className="text-indigo-600 text-xs font-medium">As requisições estão sendo processadas via Vercel Edge Functions (/api/gemini).</p>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <KpiCard 
          title="Faturamento Bruto" 
          value={`R$ ${stats.totalRevenue.toFixed(2)}`} 
          color="bg-emerald-500"
          subValue="Receita total histórica"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} 
        />
        <KpiCard 
          title="Consumo de IA (Est.)" 
          value={`$ ${stats.totalCost.toFixed(4)}`} 
          color="bg-rose-500"
          subValue="Custo operacional do servidor"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v10.17c1.13.5 2 1.63 2 2.83 0 1.66-1.34 3-3 3s-3-1.34-3-3c0-1.2.87-2.33 2-2.83V4c0-1.1.9-2 2-2z"/></svg>} 
        />
        <KpiCard 
          title="Volume de Tráfego" 
          value={stats.totalRequests} 
          color="bg-indigo-600"
          subValue="Total de chamadas à IA"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>} 
        />
        <KpiCard 
          title="Conversão" 
          value={stats.registrations} 
          color="bg-amber-500"
          subValue="Alunos cadastrados"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} 
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Atividade Recente</h3>
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">Sincronizado</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Status</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Evento</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Métrica</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {stats.logs.map((log: TelemetryLog) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors border-b border-gray-50 last:border-0">
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${log.event === 'subscription' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                       <span className="text-[10px] font-bold text-slate-500">SUCESSO</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{log.event.replace('_', ' ')}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{log.metadata.description || log.metadata.plan || 'Interação de Sistema'}</p>
                  </td>
                  <td className="p-5">
                    <p className={`text-xs font-black ${log.event === 'subscription' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {log.metadata.value ? `+ R$ ${log.metadata.value.toFixed(2)}` : 
                       log.metadata.costEstimated ? `- $ ${log.metadata.costEstimated.toFixed(4)}` : '---'}
                    </p>
                  </td>
                  <td className="p-5">
                    <p className="text-[10px] text-slate-400 font-bold">{new Date(log.timestamp).toLocaleString('pt-BR')}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
