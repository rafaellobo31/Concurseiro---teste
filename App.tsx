
import React, { useState, useRef, useMemo, useEffect } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import ExamForm from './components/ExamForm';
import SimuladosMateriasForm from './components/SimuladosMateriasForm';
import ThermometerView from './components/ThermometerView';
import QuestionItem from './components/QuestionItem';
import StudyMaterial from './components/StudyMaterial';
import PredictedConcursos from './components/PredictedConcursos';
import PricingModal from './components/PricingModal';
import AuthForm from './components/AuthForm';
import HistoryView from './components/HistoryView';
import UserProfile from './components/UserProfile';
import AdminDashboard from './components/AdminDashboard';
import UserAnalysisView from './components/UserAnalysisView'; 
import SubscriptionReturn from './components/SubscriptionReturn';
import { Modalidade, ModeloQuestao, Question, Exam, AppView, UserPlan, User, ExamResult, StudyPlan, GroundingSource, ViewMode, Nivel } from './types';
import { db } from './services/db';
import { telemetry } from './services/telemetry';
import { supabase } from './services/supabaseClient';
import { normalizeAnswer, resolveToCanonical } from './utils';
import { useAuth } from './hooks/useAuth';
import { useNavigation } from './hooks/useNavigation';
import { useExam } from './hooks/useExam';

const App: React.FC = () => {
  const { 
    currentUser, 
    supabaseUser, 
    isHydrated, 
    handleLogin, 
    handleLogout, 
    handleUpdateUser, 
    handleSaveStudyPlan,
    refreshUser
  } = useAuth();

  const {
    view,
    setView,
    proWallFeature,
    setProWallFeature,
    handleViewChange: baseHandleViewChange
  } = useNavigation(currentUser?.isPro || false);

  const {
    exam,
    setExam,
    examDiagnostic,
    userAnswers,
    setUserAnswers,
    isCorrected,
    setIsCorrected,
    isLoading,
    isNotFound,
    resetExam,
    handleGenerateOrg,
    handleGenerateSubject,
    handleGenerateFromThermometer,
    handleCorrection: baseHandleCorrection,
    handleAnswerSelect,
    handleToggleFav: baseHandleToggleFav
  } = useExam(currentUser, supabaseUser, setProWallFeature);

  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const examRef = useRef<HTMLDivElement>(null);

  const handleViewChange = (newView: AppView | 'admin') => {
    baseHandleViewChange(newView, resetExam);
  };

  const handleUpgrade = () => {
    if (!supabaseUser) {
      setView('auth');
      setProWallFeature(null);
      return;
    }
    const expiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
    db.updateUser(currentUser!.email, { isPro: true, proExpiry: expiry });
    telemetry.logSubscription('Elite 30 Dias', 19.99);
    refreshUser();
    setProWallFeature(null);
    handleViewChange('perfil');
    alert('Parabéns! Seu acesso PRO foi liberado com sucesso.');
  };

  const handleCorrection = () => {
    baseHandleCorrection(() => refreshUser());
  };

  const handleToggleFav = (q: Question) => {
    baseHandleToggleFav(q);
    refreshUser();
  };

  const onGenerateOrg = async (
    modalidade: Modalidade, 
    concurso: string, 
    nivel: Nivel | string, 
    cargoArea: string, 
    modelo: ModeloQuestao, 
    numQuestao: number, 
    banca: string, 
    estado?: string, 
    isFavOnly?: boolean
  ) => {
    const success = await handleGenerateOrg(modalidade, concurso, nivel, cargoArea, modelo, numQuestao, banca, estado, isFavOnly);
    if (success) {
      setView('simulado');
      setTimeout(() => examRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  };

  const onGenerateSubject = async (
    materia: string, 
    modelo: ModeloQuestao, 
    numQuestao: number, 
    banca: string
  ) => {
    const success = await handleGenerateSubject(materia, modelo, numQuestao, banca);
    if (success) {
      setTimeout(() => examRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  };

  const onGenerateFromThermometer = async (
    concurso: string, 
    subjects: string[], 
    banca: string
  ) => {
    const success = await handleGenerateFromThermometer(concurso, subjects, banca);
    if (success) {
      setTimeout(() => examRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  };

  if (!isHydrated) return null;

  const userPlan: UserPlan = {
    isPro: currentUser?.isPro || false,
    tier: currentUser?.isPro ? 'Pro' : 'Free',
    proExpiry: currentUser?.proExpiry
  };

  const currentScore = exam ? exam.questions.filter(q => normalizeAnswer(userAnswers[q.id]) === resolveToCanonical(q.correctAnswer, q.options)).length : 0;

  const renderContent = () => {
    if (view === 'admin') return <AdminDashboard />; 
    if (view === 'user_analysis') {
      return (
        <UserAnalysisView 
          exam={exam} 
          diagnostic={examDiagnostic} 
          userPlan={userPlan} 
          score={currentScore}
          onUpgrade={() => handleViewChange('planos')}
          onBack={() => setView('simulado')}
        />
      );
    }
    if (view === 'home') return <LandingPage onStart={handleViewChange} isLoggedIn={!!supabaseUser} />;
    if (view === 'auth') return <AuthForm onLogin={handleLogin} />;
    if (view === 'planos') return <PricingModal onUpgrade={handleUpgrade} onClose={() => handleViewChange('simulado')} />;
    if (view === 'perfil') {
      if (!supabaseUser) return <AuthForm onLogin={handleLogin} />;
      return <UserProfile user={currentUser!} userPlan={userPlan} onUpdate={handleUpdateUser} onUpgrade={() => handleViewChange('planos')} onStartFavExam={() => onGenerateOrg(Modalidade.NACIONAL, "", "", "Geral", ModeloQuestao.MULTIPLA_ESCOLHA, 0, "", undefined, true)} />;
    }
    if (view === 'historico') {
      if (!supabaseUser) return <AuthForm onLogin={handleLogin} />;
      return <HistoryView history={currentUser?.history || []} />;
    }
    if (view === 'material') return <StudyMaterial userPlan={userPlan} onUpgrade={() => handleViewChange('planos')} onSavePlan={handleSaveStudyPlan} isLoggedIn={!!supabaseUser} />;
    if (view === 'termometro') return <ThermometerView userPlan={userPlan} onUpgrade={() => handleViewChange('planos')} onGenerateExam={onGenerateFromThermometer} onShowProWall={setProWallFeature} />;
    if (view === 'previstos') return <PredictedConcursos onStudy={(name) => { handleViewChange('simulado'); onGenerateOrg(Modalidade.NACIONAL, name, "", "Geral", ModeloQuestao.MULTIPLA_ESCOLHA, 3, ""); }} />;
    if (view === 'assinatura_retorno') return <SubscriptionReturn onBack={() => handleViewChange('home')} />;

    return (
      <div className="space-y-12 py-8">
        {!exam && !isLoading && (
          <div className="animate-in fade-in duration-500">
            {view === 'simulado' && (
              <>
                {!supabaseUser && (
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-6 text-amber-700 text-xs font-bold flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Dica: Faça login para salvar seu histórico e respostas no banco de dados.
                  </div>
                )}
                <ExamForm onGenerate={onGenerateOrg} onShowProWall={setProWallFeature} isLoading={isLoading} isPro={userPlan.isPro} hasFavorites={currentUser?.favorites ? currentUser.favorites.length > 0 : false} />
              </>
            )}
            {view === 'materias' && <SimuladosMateriasForm onGenerate={onGenerateSubject} onShowProWall={setProWallFeature} isLoading={isLoading} isPro={userPlan.isPro} />}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
            <p className="font-black text-indigo-600 animate-pulse text-xs uppercase tracking-[0.2em]">Sincronizando com Bases Reais...</p>
          </div>
        )}

        {exam && (
          <div ref={examRef} className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {isCorrected && (
               <div className="bg-slate-900 p-8 md:p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden mb-8 border border-white/5">
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                     <div className="text-center md:text-left">
                        <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2 block">Diagnóstico de Performance</span>
                        <h2 className="text-4xl font-black mb-4">Você acertou {currentScore} de {exam.questions.length} questões.</h2>
                        <p className="text-slate-400 font-medium max-w-xl text-lg leading-relaxed">
                          {examDiagnostic?.proTip || "Você foi bem, mas candidatos aprovados nesta banca costumam ter desempenho superior em questões de recorrência."}
                        </p>
                     </div>
                     <div className="flex flex-col gap-4 w-full md:w-auto">
                        <button onClick={() => setView('user_analysis')} className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">
                           VER ANÁLISE COMPLETA
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                        </button>
                        {!userPlan.isPro && (
                          <button onClick={() => handleViewChange('planos')} className="bg-white/10 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/10 hover:bg-white/20 transition-all">
                             LIBERAR MÉTODO PRO
                          </button>
                        )}
                     </div>
                  </div>
                  <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px]"></div>
               </div>
            )}

            {!isCorrected && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="flex-1 text-center md:text-left">
                   <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-1">Simulado Ativo</p>
                   <h2 className="text-xl md:text-2xl font-black text-gray-900">{exam.title}</h2>
                 </div>
              </div>
            )}

            {exam.passage && (
              <div className="bg-white p-10 rounded-[2.5rem] border-2 border-indigo-50 shadow-inner italic text-slate-700 leading-relaxed">
                {exam.passage}
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
                    onSelect={(ans) => handleAnswerSelect(q.id, ans)} 
                    isCorrected={isCorrected}
                    isPro={userPlan.isPro}
                    onUpgrade={() => handleViewChange('planos')}
                    isFavorite={currentUser?.favorites.some(f => f.id === q.id)}
                    onToggleFavorite={() => handleToggleFav(q)}
                />
              ))}
            </div>

            {!isCorrected && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-50 shadow-2xl flex flex-col items-center gap-6">
                <button onClick={handleCorrection} className="w-full max-w-md bg-indigo-600 text-white py-6 rounded-2xl font-black text-xl shadow-2xl hover:bg-indigo-700 transition-all">
                  FINALIZAR E CORRIGIR
                </button>
              </div>
            )}
            
            {isCorrected && (
              <div className="flex justify-center pb-12">
                 <button onClick={() => setExam(null)} className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-indigo-600 transition-colors">
                   Sair do Simulado
                 </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-[#f8fafc] transition-all duration-500`}>
      <Header userPlan={userPlan} currentView={view as AppView} currentUser={currentUser} onViewChange={handleViewChange} onLogout={handleLogout} />
      <main className={`max-w-7xl mx-auto px-4 pb-20 pt-8`}>
        {proWallFeature && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl text-center">
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Recurso Exclusivo PRO</h3>
              <p className="text-slate-500 font-medium mb-10 leading-relaxed">Você precisa ser um membro PRO para {proWallFeature}.</p>
              <button onClick={() => handleViewChange('planos')} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl">LIBERAR AGORA</button>
              <button onClick={() => setProWallFeature(null)} className="mt-4 w-full text-slate-400 font-black text-xs uppercase tracking-widest">Continuar Grátis</button>
            </div>
          </div>
        )}
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
