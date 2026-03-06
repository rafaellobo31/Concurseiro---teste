
import React from 'react';
import { ExamResult } from '../types';

interface HistoryViewProps {
  history: ExamResult[];
}

const HistoryView: React.FC<HistoryViewProps> = ({ history }) => {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <h2 className="text-3xl font-black text-gray-900 mb-8">Seu Desempenho</h2>
      
      {history.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 text-center">
          <p className="text-gray-400 font-bold uppercase tracking-widest">Nenhum simulado realizado ainda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map(item => (
            <div key={item.id} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">{new Date(item.date).toLocaleDateString('pt-BR')}</p>
                <h4 className="text-lg font-bold text-gray-900">{item.title}</h4>
                <p className="text-sm text-gray-500 font-medium">{item.total} questões realizadas</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-gray-900">{item.score}<span className="text-gray-300">/{item.total}</span></p>
                <div className="w-24 h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div className="bg-indigo-600 h-full" style={{ width: `${(item.score / item.total) * 100}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
