
import React from 'react';

interface SubscriptionReturnProps {
  onBack: () => void;
}

const SubscriptionReturn: React.FC<SubscriptionReturnProps> = ({ onBack }) => {
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
