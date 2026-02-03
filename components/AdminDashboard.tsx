
import React, { useState, useEffect } from 'react';
import { telemetry, TelemetryLog } from '../services/telemetry';
import { GoogleGenAI } from "@google/genai";

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState(telemetry.getStats());
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(telemetry.getStats());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const testConnection = async () => {
    setTestStatus('loading');
    setErrorMessage('');
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API_KEY não encontrada no process.env.");
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'responda "ok"'
      });
      
      if (response.text) {
        setTestStatus('success');
      } else {
        throw new Error("Resposta vazia da IA.");
      }
    } catch (e: any) {
      console.error(e);
      setTestStatus('error');
      setErrorMessage(e.message || "Erro desconhecido na conexão.");
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
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Painel do Proprietário</h2>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={testConnection}
             disabled={testStatus === 'loading'}
             className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${
               testStatus === 'success' ? 'bg-emerald-500 text-white' :
               testStatus === 'error' ? 'bg-red-500 text-white' :
               'bg-indigo-600 text-white'
             }`}
           >
             {testStatus === 'loading' ? 'Testando...' : 
              testStatus === 'success' ? 'Conexão OK!' : 
              testStatus === 'error' ? 'Erro de Conexão' : 'Testar Gemini API'}
           </button>
           <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
             Exportar CSV
           </button>
        </div>
      </header>

      {errorMessage && (
        <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">
          Falha no diagnóstico: {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <KpiCard 
          title="Faturamento Bruto" 
          value={`R$ ${stats.totalRevenue.toFixed(2)}`} 
          color="bg-emerald-500"
          subValue="Receita total convertida"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} 
        />
        <KpiCard 
          title="Custo da IA (API)" 
          value={`$ ${stats.totalCost.toFixed(4)}`} 
          color="bg-red-500"
          subValue="Consumo estimado Gemini"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v10.17c1.13.5 2 1.63 2 2.83 0 1.66-1.34 3-3 3s-3-1.34-3-3c0-1.2.87-2.33 2-2.83V4c0-1.1.9-2 2-2z"/></svg>} 
        />
        <KpiCard 
          title="Solicitações IA" 
          value={stats.totalRequests} 
          color="bg-indigo-600"
          subValue="Simulados e Planos gerados"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>} 
        />
        <KpiCard 
          title="Novos Alunos" 
          value={stats.registrations} 
          color="bg-amber-500"
          subValue="Base total de usuários"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} 
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Logs de Atividade Recentes</h3>
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">Últimas 50 ações</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Evento</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Detalhes</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100">Custo/Valor</th>
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
                    <p className="text-xs font-bold text-slate-700">{log.metadata.description || log.metadata.plan || 'Novo Usuário'}</p>
                    {log.metadata.model && <p className="text-[9px] text-slate-400 font-medium">Modelo: {log.metadata.model}</p>}
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
          {stats.logs.length === 0 && (
            <div className="p-20 text-center">
              <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Nenhuma atividade registrada ainda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
