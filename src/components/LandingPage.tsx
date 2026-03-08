
import React from 'react';
import { AppView } from '../types';

// Interface defining the props for the LandingPage component
interface LandingPageProps {
  onStart: (view: AppView) => void;
  isLoggedIn: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, isLoggedIn }) => {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  const motivationalQuotes = [
    { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" },
    { text: "Aprovação não é sorte, é método e constância.", author: "Mentoria C-PRO" },
    { text: "O seu futuro é criado pelo que você faz hoje, não amanhã.", author: "Robert Kiyosaki" },
    { text: "Estude enquanto eles dormem e viva o que eles sonham.", author: "Provérbio Popular" }
  ];

  return (
    <div className="animate-in fade-in duration-700">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10 px-4">
          <div className="inline-block bg-indigo-100 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 shadow-sm border border-indigo-200">
            Inteligência Artificial aplicada à sua Aprovação
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[0.95] mb-8">
            Domine o Edital.<br/> <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">Vença a Banca.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
            A plataforma definitiva para quem não quer apenas estudar, mas quer ser <span className="text-slate-900 font-bold">convocado</span>. Simulados reais, cronogramas táticos e radar de elite em um só lugar.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => onStart('simulado')}
              className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-2xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              COMEÇAR AGORA
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
            {!isLoggedIn && (
              <button 
                onClick={() => onStart('auth')}
                className="w-full sm:w-auto bg-white text-slate-900 border-2 border-slate-100 px-10 py-5 rounded-2xl font-black text-lg hover:border-indigo-100 hover:bg-slate-50 transition-all"
              >
                CRIAR CONTA GRÁTIS
              </button>
            )}
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-indigo-400 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-400 rounded-full blur-[120px]"></div>
        </div>
      </section>

      {/* Motivational Quote Slider (Simplified Static for Hero Focus) */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            {motivationalQuotes.slice(0, 3).map((quote, i) => (
              <div key={i} className="flex-1 px-4">
                <p className="text-slate-900 font-black italic text-lg leading-tight mb-2">"{quote.text}"</p>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">— {quote.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">FERRAMENTAS DE ELITE</h2>
          <p className="text-slate-500 font-medium max-w-lg mx-auto">Tudo o que você precisa para sair da fila dos candidatos e entrar na lista dos aprovados.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Simulados */}
          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-slate-200/50 hover:shadow-indigo-100/50 transition-all group">
            <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">Simulados IA</h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">Questões reais e autorais geradas por IA, focadas na banca do seu concurso alvo. Treine com o que realmente cai.</p>
            <button onClick={() => onStart('simulado')} className="text-indigo-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:gap-4 transition-all">
              EXPLORAR SIMULADOS <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </div>

          {/* Cronogramas */}
          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-slate-200/50 hover:shadow-indigo-100/50 transition-all group">
            <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">Cronogramas Táticos</h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">Planejamento personalizado que entende sua rotina e otimiza seu tempo para cobrir 100% do edital antes da prova.</p>
            <button onClick={() => onStart('material')} className="text-indigo-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:gap-4 transition-all">
              CRIAR MEU PLANO <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </div>

          {/* Radar */}
          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-slate-200/50 hover:shadow-indigo-100/50 transition-all group">
            <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4 12H2"/><path d="M22 12h-4"/></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">Radar de Elite</h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">Monitore editais previstos {currentYear}/{nextYear}. Antecipe-se à concorrência e comece o pré-edital agora.</p>
            <button onClick={() => onStart('previstos')} className="text-indigo-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:gap-4 transition-all">
              VER OPORTUNIDADES <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">Sua Nomeação não é um sonho,<br/> é uma <span className="text-indigo-400">meta.</span></h2>
            <p className="text-slate-400 font-medium mb-12 max-w-xl mx-auto text-lg">Pare de acumular PDFs e comece a acumular acertos. Junte-se a milhares de concurseiros que usam tecnologia para vencer.</p>
            <button 
              onClick={() => onStart('simulado')}
              className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-2xl shadow-indigo-500/20 hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all"
            >
              QUERO SER APROVADO
            </button>
          </div>
          
          {/* Decorative Pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[80px] -z-0"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 blur-[100px] -z-0"></div>
        </div>
      </section>
      
      {/* Simple Footer */}
      <footer className="py-12 border-t border-gray-100 text-center">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">© {currentYear} C-PRO • Concurseiro Pro • Excelência em Estudos</p>
      </footer>
    </div>
  );
};

export default LandingPage;
