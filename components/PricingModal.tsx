
import React, { useState, useEffect } from 'react';
import { supabase, supabaseInit } from '../services/supabaseClient';

interface PricingModalProps {
  onUpgrade: () => void;
  onClose?: () => void;
}

type CheckoutStep = 'plan' | 'method' | 'card' | 'pix' | 'processing';

const PricingModal: React.FC<PricingModalProps> = ({ onUpgrade, onClose }) => {
  const [step, setStep] = useState<CheckoutStep>('plan');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');

  const handleSubscribe = async () => {
    if (!supabase || !supabaseInit.ok) return;
    
    setIsSubscribing(true);
    setSubscribeError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubscribeError('Você precisa estar logado para assinar.');
        setIsSubscribing(false);
        return;
      }

      const response = await fetch('/api/mp/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao iniciar assinatura');
      }

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (err: any) {
      console.error("Erro na assinatura:", err);
      setSubscribeError(err.message || 'Erro ao processar assinatura');
      setIsSubscribing(false);
    }
  };

  // Formatação automática do cartão
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    v = v.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(v.substring(0, 19));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2, 4);
    setExpiry(v.substring(0, 5));
  };

  const handleFinalize = () => {
    setStep('processing');
    setTimeout(() => {
      onUpgrade();
    }, 3000);
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-2xl overflow-hidden max-w-4xl mx-auto animate-in zoom-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
        
        {/* Lado Esquerdo - Resumo e Confiança (4 colunas) */}
        <div className="md:col-span-5 p-10 bg-slate-900 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="bg-indigo-600/20 p-3 rounded-2xl w-fit mb-8 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <h2 className="text-2xl font-black mb-2 tracking-tight">C-PRO ELITE</h2>
            <p className="text-slate-400 text-sm font-medium mb-8">Acesso total por 30 dias.</p>
            
            <div className="space-y-4 mb-12">
              <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                Simulados ilimitados (+50 questões)
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                Cronogramas táticos com IA
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                Termômetro de questões recorrentes
              </div>
            </div>
          </div>

          <div className="relative z-10 border-t border-white/10 pt-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total a pagar</span>
              <span className="text-indigo-400 text-xs font-black uppercase">Pagamento Único</span>
            </div>
            <div className="text-3xl font-black tracking-tighter">R$ 19,99</div>
          </div>
          
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl"></div>
        </div>

        {/* Lado Direito - Checkout Dinâmico (7 colunas) */}
        <div className="md:col-span-7 p-8 md:p-12 bg-white flex flex-col justify-center">
          
          {step === 'plan' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Escolha como pagar</h3>
              <div className="space-y-3 mb-8">
                <button 
                  onClick={handleSubscribe}
                  disabled={isSubscribing || !supabase || !supabaseInit.ok}
                  className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-indigo-600 bg-indigo-50/30 hover:bg-indigo-50 transition-all group relative overflow-hidden"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-900">Assinar PRO Mensal</p>
                      <p className="text-[10px] font-bold text-indigo-600">R$ 19,99 / mês via Mercado Pago</p>
                    </div>
                  </div>
                  {isSubscribing ? (
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-600"><path d="m9 18 6-6-6-6"/></svg>
                  )}
                </button>

                {(!supabase || !supabaseInit.ok) && (
                  <p className="text-[9px] text-rose-500 font-bold uppercase tracking-widest text-center mt-2">
                    Requer login para assinar
                  </p>
                )}
                
                {subscribeError && (
                   <p className="text-[9px] text-rose-500 font-bold uppercase tracking-widest text-center mt-2">
                    {subscribeError}
                  </p>
                )}
              </div>
              {onClose && (
                <button onClick={onClose} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">
                  Talvez mais tarde
                </button>
              )}
            </div>
          )}

          {step === 'card' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep('plan')} className="text-slate-400 hover:text-indigo-600 p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Dados do Cartão</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Número do Cartão</label>
                  <input 
                    type="text" 
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-indigo-600 bg-white font-bold text-slate-900 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Validade</label>
                    <input 
                      type="text" 
                      placeholder="MM/AA"
                      value={expiry}
                      onChange={handleExpiryChange}
                      className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-indigo-600 bg-white font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">CVV</label>
                    <input 
                      type="text" 
                      placeholder="123"
                      maxLength={3}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-indigo-600 bg-white font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Nome no Cartão</label>
                  <input 
                    type="text" 
                    placeholder="COMO ESTÁ NO CARTÃO"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-indigo-600 bg-white font-bold text-slate-900 outline-none transition-all"
                  />
                </div>

                <button 
                  onClick={handleFinalize}
                  disabled={cardNumber.length < 19 || expiry.length < 5 || cvv.length < 3 || !name}
                  className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 mt-4"
                >
                  FINALIZAR PAGAMENTO
                </button>
              </div>
            </div>
          )}

          {step === 'pix' && (
            <div className="text-center animate-in fade-in slide-in-from-right-4 duration-500">
              <button onClick={() => setStep('plan')} className="absolute top-8 left-8 text-slate-400 hover:text-indigo-600 p-1 hidden md:block">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <h3 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-tight">Pagamento via Pix</h3>
              <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100 mb-6 inline-block mx-auto">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=CPRO-MOCK-PIX-PAYMENT-1999" 
                  alt="QR Code Pix"
                  className="w-40 h-40 grayscale opacity-80"
                />
              </div>
              <p className="text-xs text-slate-500 font-medium mb-8 leading-relaxed">
                Escaneie o código acima no app do seu banco.<br/>Após o pagamento, o sistema identificará automaticamente.
              </p>
              <button 
                onClick={handleFinalize}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all"
              >
                JÁ REALIZEI O PIX
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-12 animate-in zoom-in duration-500">
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                   <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Processando</h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Sua segurança é nossa prioridade</p>
              <div className="mt-12 flex justify-center gap-4 opacity-30 grayscale">
                 <img src="https://logodownload.org/wp-content/uploads/2014/07/visa-logo-1.png" alt="Visa" className="h-4" />
                 <img src="https://logodownload.org/wp-content/uploads/2014/07/mastercard-logo-7.png" alt="Mastercard" className="h-6" />
                 <img src="https://logodownload.org/wp-content/uploads/2019/06/mercado-pago-logo-0.png" alt="MP" className="h-4" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingModal;
