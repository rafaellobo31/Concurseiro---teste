
import React, { useEffect, useState } from 'react';

interface PricingModalProps {
  onUpgrade: () => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}

const PricingModal: React.FC<PricingModalProps> = ({ onUpgrade, onClose }) => {
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [mpInstance, setMpInstance] = useState<any>(null);
  
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  // Credenciais Oficiais fornecidas
  const PUBLIC_KEY = "APP_USR-ed0b44e8-05bd-49eb-91ac-70cf362bf6c6";

  useEffect(() => {
    if (window.MercadoPago) {
      try {
        const mp = new window.MercadoPago(PUBLIC_KEY, {
          locale: 'pt-BR'
        });
        setMpInstance(mp);
        setIsSdkReady(true);
      } catch (error) {
        console.error("Erro ao inicializar SDK Mercado Pago:", error);
      }
    }
  }, []);

  const handlePayment = () => {
    if (!isSdkReady) {
      alert("O módulo de pagamento está sendo inicializado. Por favor, tente novamente em instantes.");
      return;
    }
    
    console.log("Iniciando Checkout Pro Oficial com Public Key:", PUBLIC_KEY);
    onUpgrade();
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden max-w-4xl mx-auto animate-in zoom-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Lado Esquerdo - Benefícios Premium Revisados */}
        <div className="p-10 bg-[#009EE3] text-white flex flex-col justify-center relative overflow-hidden">
          {/* Elemento decorativo de fundo */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-90">Acesso Premium Ativado</span>
            </div>
            
            <h2 className="text-3xl font-black mb-4 leading-tight">Prepare-se para o Topo.</h2>
            <p className="text-blue-100 mb-10 font-medium leading-relaxed">
              Vença a concorrência com ferramentas de elite. Libere o poder total da IA aplicada a concursos.
            </p>
            
            <ul className="space-y-5">
              {[
                'Simulados de Órgãos Ilimitados (+50 questões)',
                'Cronogramas Táticos Gerados por IA',
                'Treino de Revisão (Questões Favoritas)',
                'Interpretação de Texto com Provas Reais',
                'Radar de Oportunidades em Tempo Real'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-bold group">
                  <div className="bg-white rounded-full p-1 mt-0.5 shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="text-[#009EE3]" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span className="flex-1 opacity-95">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-12 pt-8 border-t border-white/10 flex items-center gap-4">
               <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-[#009EE3] bg-blue-400 flex items-center justify-center text-[10px] font-bold">A</div>
                  <div className="w-8 h-8 rounded-full border-2 border-[#009EE3] bg-blue-500 flex items-center justify-center text-[10px] font-bold">B</div>
                  <div className="w-8 h-8 rounded-full border-2 border-[#009EE3] bg-blue-600 flex items-center justify-center text-[10px] font-bold">C</div>
               </div>
               <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest leading-tight">Junte-se a centenas de <br/>futuros aprovados.</p>
            </div>
          </div>
        </div>

        {/* Lado Direito - Pagamento */}
        <div className="p-10 flex flex-col justify-center bg-white">
          <div className="flex justify-center mb-8">
             <img src="https://logodownload.org/wp-content/uploads/2019/06/mercado-pago-logo-0.png" alt="Mercado Pago" className="h-8" />
          </div>
          
          <div className="text-center mb-10">
            <div className="inline-block bg-blue-50 text-blue-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-6 border border-blue-100 shadow-sm animate-pulse">
              Plano Trimestral: 3 Meses de Acesso
            </div>
            
            <div className="flex items-center justify-center gap-1">
              <span className="text-gray-400 text-lg font-bold">R$</span>
              <span className="text-6xl font-black text-gray-900 tracking-tighter">47</span>
              <div className="flex flex-col items-start ml-1">
                <span className="text-gray-400 font-bold text-xl leading-none">,90</span>
                <span className="text-gray-300 font-bold text-[10px] uppercase">único</span>
              </div>
            </div>
            
            <p className="text-gray-400 text-[11px] mt-6 font-medium leading-relaxed max-w-[240px] mx-auto">
              Pagamento único via Mercado Pago.<br/>
              Acesso total liberado por 90 dias.
            </p>
          </div>

          <button 
            onClick={handlePayment}
            className="w-full bg-[#009EE3] text-white py-5 rounded-2xl font-black text-lg shadow-2xl shadow-blue-100 hover:bg-[#0086c3] transition-all active:scale-95 mb-6 flex items-center justify-center gap-3"
          >
            {isSdkReady ? (
              <>
                ASSINAR PREMIUM
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </>
            ) : 'INICIALIZANDO...'}
          </button>
          
          {onClose && (
            <button onClick={onClose} className="text-gray-400 font-black text-[10px] hover:text-indigo-600 transition-colors uppercase tracking-[0.2em] text-center w-full">
              Continuar com a Versão Grátis
            </button>
          )}

          <div className="mt-12 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3">
             <div className="text-blue-500 mt-1 shrink-0">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
             </div>
             <div>
               <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Pagamento Seguro</h5>
               <p className="text-[10px] text-slate-500 font-medium leading-tight">
                 Seus dados estão protegidos pela infraestrutura oficial do Mercado Pago.
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;
