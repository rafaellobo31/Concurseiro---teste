
import React, { useState, useRef, useMemo, useEffect } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import ExamForm from './components/ExamForm';
import SimuladosMateriasForm from './components/SimuladosMateriasForm';
import QuestionItem from './components/QuestionItem';
import StudyMaterial from './components/StudyMaterial';
import PredictedConcursos from './components/PredictedConcursos';
import PricingModal from './components/PricingModal';
import AuthForm from './components/AuthForm';
import HistoryView from './components/HistoryView';
import UserProfile from './components/UserProfile';
import { Modalidade, ModeloQuestao, Question, Exam, AppView, UserPlan, User, ExamResult, StudyPlan } from './types';
import { generateExamQuestions, generateSubjectQuestions } from './services/geminiService';
import { normalizeAnswer, resolveToCanonical } from './utils';
import { db } from './services/db';

const SESSION_KEY = 'cp_active_session';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [exam, setExam] = useState<Exam | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isCorrected, setIsCorrected] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [proWallFeature, setProWallFeature] = useState<string | null>(null);
  
  const examRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const email = localStorage.getItem(SESSION_KEY);
    if (email) {
      const user = db.getUserByEmail(email);
      if (user) {
        if (user.proExpiry && user.proExpiry < Date.now() && user.isPro) {
          db.updateUser(email, { isPro: false });
          setCurrentUser(db.getUserByEmail(email) || null);
        } else {
          setCurrentUser(user);
        }
      }
    }
    setIsHydrated(true);
  }, []);

  const handleViewChange = (newView: AppView) => {
    const isPro = currentUser?.isPro || false;
    if (newView === 'material' && !isPro) {
      setProWallFeature("gerar cronogramas táticos e personalizados de estudo");
      return; 
    }
    const resetViews: AppView[] = ['home', 'simulado', 'materias', 'material', 'previstos', 'perfil', 'historico', 'auth'];
    if (resetViews.includes(newView)) {
      setExam(null);
      setIsCorrected(false);
      setUserAnswers({});
      setIsNotFound(false);
    }
    setView(newView);
    setProWallFeature(null);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(SESSION_KEY, user.email);
    handleViewChange('simulado');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    handleViewChange('home');
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    if (currentUser) {
      db.updateUser(currentUser.email, updates);
      setCurrentUser(db.getUserByEmail(currentUser.email) || null);
    }
  };

  const handleSaveStudyPlan = (plan: StudyPlan) => {
    if (currentUser) {
      db.saveStudyPlan(currentUser.email, plan);
      setCurrentUser(db.getUserByEmail(currentUser.email) || null);
    }
  };

  const handleUpgrade = () => {
    if (!currentUser) {
      setView('auth');
      setProWallFeature(null);
      return;
    }
    setPaymentProcessing(true);
    setTimeout(() => {
      // 3 meses = 90 dias
      const threeMonths = 90 * 24 * 60 * 60 * 1000;
      const expiry = Date.now() + threeMonths;
      db.updateUser(currentUser.email, { isPro: true, proExpiry: expiry });
      setCurrentUser(db.getUserByEmail(currentUser.email) || null);
      setPaymentProcessing(false);
      setProWallFeature(null);
      handleViewChange('simulado');
      alert('Parabéns! Seu acesso PRO foi liberado por 3 meses.');
    }, 2500);
  };

  const handleGenerateOrg = async (modalidade: Modalidade, concurso: string, modelo: ModeloQuestao, numQuestao: number, banca: string, estado?: string, isFavOnly?: boolean) => {
    const isPro = currentUser?.isPro || false;
    if (isFavOnly && !isPro) {
      setProWallFeature("acessar e treinar com suas questões favoritas");
      return;
    }
    setIsLoading(true);
    setIsNotFound(false);
    setExam(null);
    setUserAnswers({});
    setIsCorrected(false);

    if (isFavOnly && currentUser) {
        if (currentUser.favorites.length < 10) {
            alert("Você precisa de no mínimo 10 questões favoritadas para realizar um simulado de revisão.");
            setIsLoading(false);
            return;
        }
        setExam({ title: "Simulado de Favoritos", questions: currentUser.favorites });
        setIsLoading(false);
        setView('simulado');
        return;
    }
    
    const finalNumQuestao = isPro ? numQuestao : 3;
    try {
      const data = await generateExamQuestions(modalidade, concurso, modelo, finalNumQuestao, banca, 0, estado);
      if (data.questions.length === 0) { setIsNotFound(true); } 
      else {
        setExam({ title: `Simulado: ${concurso}`, questions: data.questions, passage: data.passage, modalidade, concurso });
        setTimeout(() => examRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
      }
    } catch (error) { setIsNotFound(true); } 
    finally { setIsLoading(false); }
  };

  const handleGenerateSubject = async (materia: string, modelo: ModeloQuestao, numQuestao: number, banca: string) => {
    const isPro = currentUser?.isPro || false;
    setIsLoading(true);
    setIsNotFound(false);
    setExam(null);
    setUserAnswers({});
    setIsCorrected(false);
    const finalNumQuestao = isPro ? numQuestao : 3;
    try {
      const data = await generateSubjectQuestions(materia, modelo, finalNumQuestao, banca);
      if (data.questions.length === 0) { setIsNotFound(true); } 
      else {
        setExam({ title: `Simulado: ${materia}`, questions: data.questions, passage: data.passage, materia });
        setTimeout(() => examRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
      }
    } catch (error) { setIsNotFound(true); } 
    finally { setIsLoading(false); }
  };

  const handleCorrection = () => {
    if (!exam) return;
    setIsCorrected(true);
    let correct = 0;
    exam.questions.forEach(q => {
      if (normalizeAnswer(userAnswers[q.id]) === resolveToCanonical(q.correctAnswer, q.options)) correct++;
    });
    if (currentUser) {
      const result: ExamResult = {
        id: Math.random().toString(36).substr(2, 9),
        date: Date.now(),
        title: exam.title,
        score: correct,
        total: exam.questions.length,
        questions: exam.questions,
        userAnswers: userAnswers
      };
      db.addExamToHistory(currentUser.email, result);
      setCurrentUser(db.getUserByEmail(currentUser.email) || null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleFav = (q: Question) => {
    if (!currentUser?.isPro) {
      setProWallFeature("favoritar questões e montar sua biblioteca pessoal de estudos");
      return;
    }
    db.toggleFavorite(currentUser.email, q);
    setCurrentUser(db.getUserByEmail(currentUser.email) || null);
  };

  if (!isHydrated) return null;

  const userPlan: UserPlan = {
    isPro: currentUser?.isPro || false,
    tier: currentUser?.isPro ? 'Pro' : 'Free',
    proExpiry: currentUser?.proExpiry
  };

  const renderProWall = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in duration-300">
        <button onClick={() => setProWallFeature(null)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div className="text-center">
          <div className="bg-amber-100 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-amber-600 shadow-xl shadow-amber-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight leading-tight">Recurso Exclusivo PRO</h3>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed px-4">
            Você precisa ser um membro PRO para <span className="text-indigo-600 font-black">{proWallFeature}</span> e acelerar sua aprovação.
          </p>
          <div className="space-y-4">
            <button onClick={() => { handleViewChange('planos'); }} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3">
              LIBERAR ACESGO AGORA
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
            <button onClick={() => setProWallFeature(null)} className="w-full text-slate-400 font-black text-xs uppercase tracking-[0.2em] py-2 hover:text-slate-600 transition-colors">
              Continuar com a versão grátis
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (paymentProcessing) {
      return (
        <div className="py-24 text-center">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">Processando Acesso PRO</h3>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Preparando sua aprovação...</p>
        </div>
      );
    }
    if (view === 'home') return <LandingPage onStart={handleViewChange} isLoggedIn={!!currentUser} />;
    if (view === 'auth') return <AuthForm onLogin={handleLogin} />;
    if (view === 'planos') return <PricingModal onUpgrade={handleUpgrade} onClose={() => handleViewChange('simulado')} />;
    if (view === 'perfil') {
      if (!currentUser) return <AuthForm onLogin={handleLogin} />;
      return (
        <UserProfile 
          user={currentUser} 
          userPlan={userPlan} 
          onUpdate={handleUpdateUser} 
          onUpgrade={() => handleViewChange('planos')}
          onStartFavExam={() => handleGenerateOrg(Modalidade.NACIONAL, "", ModeloQuestao.MULTIPLA_ESCOLHA, 0, "", undefined, true)}
        />
      );
    }
    if (view === 'historico') {
      if (!currentUser) return <AuthForm onLogin={handleLogin} />;
      return <HistoryView history={currentUser.history} />;
    }
    if (view === 'material') {
      return (
        <StudyMaterial 
          userPlan={userPlan} 
          onUpgrade={() => handleViewChange('planos')} 
          onSavePlan={handleSaveStudyPlan}
          isLoggedIn={!!currentUser}
        />
      );
    }
    if (view === 'previstos') return <PredictedConcursos onStudy={(name) => { handleViewChange('simulado'); handleGenerateOrg(Modalidade.NACIONAL, name, ModeloQuestao.MULTIPLA_ESCOLHA, 3, ""); }} />;

    return (
      <div className="space-y-12 py-8">
        {!exam && !isLoading && (
          <div className="animate-in fade-in duration-500">
            {view === 'simulado' && (
              <ExamForm 
                onGenerate={handleGenerateOrg} 
                onShowProWall={setProWallFeature}
                isLoading={isLoading} 
                isPro={userPlan.isPro} 
                hasFavorites={currentUser?.favorites ? currentUser.favorites.length > 0 : false}
              />
            )}
            {view === 'materias' && (
              <SimuladosMateriasForm 
                onGenerate={handleGenerateSubject} 
                onShowProWall={setProWallFeature}
                isLoading={isLoading} 
                isPro={userPlan.isPro} 
              />
            )}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
            <p className="font-black text-indigo-600 animate-pulse text-xs uppercase tracking-[0.2em]">Construindo Questões Reais...</p>
          </div>
        )}

        {exam && (
          <div ref={examRef} className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
               <div className="flex-1">
                 <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-1">
                   {isCorrected ? 'Resultado do Simulado' : 'Simulado Ativo'}
                 </p>
                 <h2 className="text-2xl font-black text-gray-900">{exam.title}</h2>
                 {isCorrected && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                        {/* Fix: Use exam.questions instead of Object.values(userAnswers) to avoid indexing mismatches and type errors */}
                        <div className="h-full bg-green-500" style={{ width: `${(exam.questions.filter(q => normalizeAnswer(userAnswers[q.id] || null) === resolveToCanonical(q.correctAnswer, q.options)).length / exam.questions.length) * 100}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-gray-600">
                        {/* Fix: Use exam.questions instead of Object.values(userAnswers) to avoid indexing mismatches and type errors */}
                        {exam.questions.filter(q => normalizeAnswer(userAnswers[q.id] || null) === resolveToCanonical(q.correctAnswer, q.options)).length} acertos de {exam.questions.length}
                      </span>
                    </div>
                 )}
               </div>
               <div className="flex gap-3">
                {isCorrected && (
                  <button onClick={() => setExam(null)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all hover:scale-105 active:scale-95">
                    Voltar ao Início
                  </button>
                )}
               </div>
            </div>

            {/* Renderização do Texto Base (Passage) para Interpretação */}
            {exam.passage && (
              <div className="bg-white p-10 rounded-[2.5rem] border-2 border-indigo-50 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>
                </div>
                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                  Texto Base para as Questões
                </h3>
                <div className="exam-font text-slate-700 leading-relaxed text-lg whitespace-pre-wrap select-none border-l-4 border-indigo-100 pl-8 italic">
                  {exam.passage}
                </div>
                <div className="mt-8 pt-6 border-t border-indigo-50 flex justify-end">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fim do Texto de Referência</p>
                </div>
              </div>
            )}

            <div className="grid gap-6">
              {exam.questions.map((q, idx) => (
                <QuestionItem 
                    key={q.id} 
                    question={q} 
                    index={idx} 
                    modelo={q.options ? ModeloQuestao.MULTIPLA_ESCOLHA : ModeloQuestao.VERDADEIRO_FALSO} 
                    selectedAnswer={userAnswers[q.id] || null} 
                    onSelect={(ans) => !isCorrected && setUserAnswers(prev => ({...prev, [q.id]: ans}))} 
                    isCorrected={isCorrected}
                    isFavorite={currentUser?.favorites.some(f => f.id === q.id)}
                    onToggleFavorite={() => handleToggleFav(q)}
                />
              ))}
            </div>

            {!isCorrected && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-50 shadow-2xl flex flex-col items-center gap-6">
                <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Respondeu todas as questões?</p>
                <button onClick={handleCorrection} className="w-full max-w-md bg-indigo-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                  FINALIZAR E CORRIGIR
                </button>
              </div>
            )}
          </div>
        )}

        {isNotFound && !isLoading && (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-red-50 shadow-xl max-w-lg mx-auto">
             <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
             </div>
             <h4 className="text-xl font-black text-gray-900 mb-2">Nenhum resultado</h4>
             <p className="text-gray-400 mb-8 font-medium px-10 text-sm">Não localizamos questões suficientes para este termo.</p>
             <button onClick={() => setIsNotFound(false)} className="bg-gray-900 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest">Tentar Novamente</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 bg-[#f8fafc]">
      <Header 
        userPlan={userPlan} 
        currentView={view} 
        currentUser={currentUser} 
        onViewChange={handleViewChange} 
        onLogout={handleLogout} 
      />
      <main className="max-w-7xl mx-auto px-4">
        {proWallFeature && renderProWall()}
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
