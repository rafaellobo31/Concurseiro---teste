
import React, { useEffect, useState } from 'react';

interface SubscriptionReturnProps {
  onBack: () => void;
  currentUser: any;
  refreshUser: (id?: string) => Promise<void>;
}

const SubscriptionReturn: React.FC<SubscriptionReturnProps> = ({ onBack, currentUser, refreshUser }) => {
  const [isActivated, setIsActivated] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    if (currentUser?.isPro) {
      setIsActivated(true);
      return;
    }

    // Polling a cada 3s por 60s
    const interval = setInterval(() => {
      setSecondsElapsed(prev => {
        if (prev >= 60) {
          clearInterval(interval);
          return prev;
        }
        refreshUser();
        return prev + 3;
      });
    }, 3000);

    // Listener de visibilidade
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser?.isPro, refreshUser]);

  useEffect(() => {
    if (currentUser?.isPro) {
      setIsActivated(true);
    }
  }, [currentUser?.isPro]);

  if (isActivated) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white p-10 rounded-[2.5rem] border border-emerald-200 shadow-2xl text-center animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight uppercase">Plano ativado com sucesso!</h2>
        
        <p className="text-slate-500 font-medium mb-10 leading-relaxed">
          Parabéns! Seu acesso PRO foi liberado. Agora você tem acesso ilimitado a todos os recursos.
        </p>
        
        <button 
          onClick={onBack}
          className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-emerald-700 active:scale-95 transition-all"
        >
          Começar a Estudar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 bg-white p-10 rounded-[2.5rem] border border-gray-200 shadow-2xl text-center animate-in zoom-in duration-500">
      <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-8">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      
      <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight uppercase">Processando sua assinatura...</h2>
      
      <p className="text-slate-500 font-medium mb-10 leading-relaxed">
        Estamos aguardando a confirmação do Mercado Pago. <br/>
        <span className="text-xs text-slate-400 mt-2 block">Se em alguns segundos seu plano não atualizar, saia e entre novamente.</span>
      </p>
      
      <button 
        onClick={onBack}
        className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
      >
        Voltar para o app
      </button>
    </div>
  );
};

export default SubscriptionReturn;
