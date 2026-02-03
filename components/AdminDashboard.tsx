
import React, { useState, useEffect } from 'react';
import { telemetry, TelemetryLog } from '../services/telemetry';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState(telemetry.getStats());
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasBridge, setHasBridge] = useState(false);

  useEffect(() => {
    const checkBridge = async () => {
      try {
        const studioKey = (window as any).aistudio ? await (window as any).aistudio.hasSelectedApiKey() : false;
        setHasBridge(studioKey);
      } catch (e) {
        setHasBridge(false);
      }
    };
    
    checkBridge();
    const interval = setInterval(() => {
      setStats(telemetry.getStats());
      checkBridge();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenSelectKey = async () => {
    const studio = (window as any).aistudio;
    if (studio && studio.openSelectKey) {
      try {
        await studio.openSelectKey();
        setHasBridge(true);
        setTestStatus('idle');
        setErrorMessage('');
      } catch (e) {
        console.error("Erro ao abrir seletor de chave:", e);
        setErrorMessage("Falha ao abrir o seletor de chave do Google.");
      }
    } else {
      setErrorMessage("O seletor de chave é um recurso do Google AI Studio. Em produção no Vercel, utilize variáveis de ambiente.");
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
          contents: 'responda apenas com a palavra "conectado"',
          config: { systemInstruction: "Seja conciso." }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (data.text) {
        setTestStatus('success');
      } else {
        throw new Error("Resposta da IA vazia.");
      }
    } catch (e: any) {
      console.error(e);
      setTestStatus('error');
      setErrorMessage(e.message || "Erro na conexão com a API Proxy.");
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
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Business Intelligence</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Painel Administrativo</h2>
        </div>
        <div className="flex flex-wrap gap-4">
           {!hasBridge && (
             <button 
               onClick={handleOpenSelectKey}
               className="bg-amber-500 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L22 22m-5-5l.707-.707"/></svg>
               Bridge AI Studio
             </button>
           )}

           <button 
             onClick={testConnection}
             disabled={testStatus === 'loading'}
             className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${
               testStatus === 'success' ? 'bg-emerald-500 text-white' :
               testStatus === 'error' ? 'bg-red-500 text-white' :
               'bg-indigo-600 text-white'
             }`}
           >
             {testStatus === 'loading' ? 'Testando Proxy...' : 
              testStatus === 'success' ? 'Backend OK!' : 
              testStatus === 'error' ? 'Falha no Proxy' : 'Testar Conexão Backend'}
           </button>
        </div>
      </header>

      {errorMessage && (
        <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Diagnóstico: {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <KpiCard 
          title="Faturamento Bruto" 
          value={`R$ ${stats.totalRevenue.toFixed(2)}`} 
          color="bg-emerald-500"
          subValue="Receita total simulada"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} 
        />
        <KpiCard 
          title="Custo da IA (API)" 
          value={`$ ${stats.totalCost.toFixed(4)}`} 
          color="bg-red-500"
          subValue="Gasto estimado do servidor"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v10.17c1.13.5 2 1.63 2 2.83 0 1.66-1.34 3-3 3s-3-1.34-3-3c0-1.2.87-2.33 2-2.83V4c0-1.1.9-2 2-2z"/></svg>} 
        />
        <KpiCard 
          title="Solicitações Backend" 
          value={stats.totalRequests} 
          color="bg-indigo-600"
          subValue="Volume de tráfego IA"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>} 
        />
        <KpiCard 
          title="Novos Alunos" 
          value={stats.registrations} 
          color="bg-amber-500"
          subValue="Cadastros realizados"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} 
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Logs de Atividade</h3>
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">Sessão Atual</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Evento</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Detalhes</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Valor/Custo</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Horário</th>
              </tr>
            </thead>
            <tbody>
              {stats.logs.map((log: TelemetryLog) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors border-b border-gray-50 last:border-0">
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      log.event === 'ai_request' ? 'bg-indigo-50 text-indigo-600' :
                      log.event === 'subscription' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {log.event.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-5">
                    <p className="text-xs font-bold text-slate-700">{log.metadata.description || log.metadata.plan || 'Ação Sistema'}</p>
                    {log.metadata.model && <p className="text-[9px] text-slate-400 font-medium">Model: {log.metadata.model}</p>}
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
