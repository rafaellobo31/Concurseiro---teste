
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
import { Modalidade, ModeloQuestao, Question, Exam, AppView, UserPlan, User, ExamResult, StudyPlan, GroundingSource, ViewMode, Nivel } from './types';
import { generateExamQuestions, generateSubjectQuestions } from './services/geminiService';
import { normalizeAnswer, resolveToCanonical } from './utils';
import { db } from './services/db';
import { telemetry } from './services/telemetry';
import { supabase } from './services/supabaseClient';
import { dbService } from './services/dbService';

const SESSION_KEY = 'cp_active_session';

const App: React.FC = () => {
  const [view, setView] = useState<AppView | 'admin'>('home');
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [exam, setExam] = useState<Exam | null>(null);
  const [examDiagnostic, setExamDiagnostic] = useState<any>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isCorrected, setIsCorrected] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [proWallFeature, setProWallFeature] = useState<string | null>(null);
  
  // Mapeamento de persistência
  const [dbSimuladoId, setDbSimuladoId] = useState<string | null>(null);
  const [idMapping, setIdMapping] = useState<Record<string, { questao_id: string, alternativas: any[] }>>({});

  const examRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleAdminSecret = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'A') {
        setView('admin');
      }
    };
    window.addEventListener('keydown', handleAdminSecret);
    
    // Auth Supabase
    let subscription: any = null;
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          // Tenta buscar o perfil local correspondente
          const user = db.getUserByEmail(session.user.email!);
          if (user) setCurrentUser(user);
        }
      });

      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          const user = db.getUserByEmail(session.user.email!);
          if (user) setCurrentUser(user);
        } else {
          setCurrentUser(null);
        }
      });
      subscription = sub;
    }

    setIsHydrated(true);
    return () => {
      window.removeEventListener('keydown', handleAdminSecret);
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const handleViewChange = (newView: AppView | 'admin') => {
    const isPro = currentUser?.isPro || false;
    if ((newView === 'material' || newView === 'termometro') && !isPro) {
      setProWallFeature(newView === 'material' ? "gerar cronogramas táticos e personalizados de estudo" : "acessar o termômetro de recorrência de questões");
      return; 
    }
    
    if (newView !== 'user_analysis' && newView !== 'planos') {
      setExam(null);
      setExamDiagnostic(null);
      setIsCorrected(false);
      setUserAnswers({});
      setDbSimuladoId(null);
      setIdMapping({});
    }
    
    setIsNotFound(false);
    setView(newView);
    setProWallFeature(null);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    handleViewChange('simulado');
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
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
    if (!supabaseUser) {
      setView('auth');
      setProWallFeature(null);
      return;
    }
    const expiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
    db.updateUser(currentUser!.email, { isPro: true, proExpiry: expiry });
    telemetry.logSubscription('Elite 30 Dias', 19.99);
    setCurrentUser(db.getUserByEmail(currentUser!.email) || null);
    setProWallFeature(null);
    handleViewChange('perfil');
    alert('Parabéns! Seu acesso PRO foi liberado com sucesso.');
  };

  const handleGenerateOrg = async (modalidade: Modalidade, concurso: string, nivel: Nivel | string, cargoArea: string, modelo: ModeloQuestao, numQuestao: number, banca: string, estado?: string, isFavOnly?: boolean) => {
    const isPro = currentUser?.isPro || false;
    if (isFavOnly && !isPro) {
      setProWallFeature("acessar e treinar com suas questões favoritas");
      return;
    }
    setIsLoading(true);
    setIsNotFound(false);
    setExam(null);
    setExamDiagnostic(null);
    setUserAnswers({});
    setIsCorrected(false);
    setDbSimuladoId(null);
    setIdMapping({});

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
    
    const finalNumQuestao = isPro ? numQuestao : Math.min(numQuestao, 20);
    try {
      const data = await generateExamQuestions(modalidade, concurso, nivel, cargoArea, modelo, finalNumQuestao, banca, 0, estado);
      if (!data || !data.questions || data.questions.length === 0) { 
        setIsNotFound(true); 
      } else {
        const examData: Exam = { title: `Simulado: ${concurso} (${cargoArea || 'Geral'})`, questions: data.questions, passage: data.passage, modalidade, concurso, nivel: nivel as Nivel, cargoArea, sources: data.sources, banca, estado };
        setExam(examData);
        setExamDiagnostic(data.diagnostic);
        
        // Persistência Supabase
        if (supabaseUser) {
          try {
            const simuladoDb = await dbService.createSimulado(supabaseUser.id, examData);
            setDbSimuladoId(simuladoDb.id);
            const mappingData = await dbService.insertQuestoesEAlternativas(simuladoDb.id, data.questions);
            
            const newMapping: Record<string, any> = {};
            mappingData.forEach(m => {
              newMapping[m.originalId] = { questao_id: m.questao.id, alternativas: m.alternativas };
            });
            setIdMapping(newMapping);
          } catch (dbError) {
            console.warn("Supabase: Erro ao persistir simulado, continuando em modo local.", dbError);
          }
        }

        setTimeout(() => examRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
      }
    } catch (error) { 
      setIsNotFound(true); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleGenerateSubject = async (materia: string, modelo: ModeloQuestao, numQuestao: number, banca: string) => {
    const isPro = currentUser?.isPro || false;
    setIsLoading(true);
    setIsNotFound(false);
    setExam(null);
    setExamDiagnostic(null);
    setUserAnswers({});
    setIsCorrected(false);
    const finalNumQuestao = isPro ? numQuestao : Math.min(numQuestao, 20);
    try {
      const data = await generateSubjectQuestions(materia, modelo, finalNumQuestao, banca);
      if (!data || !data.questions || data.questions.length === 0) { 
        setIsNotFound(true); 
      } else {
        setExam({ title: `Simulado: ${materia}`, questions: data.questions, passage: data.passage, materia, sources: data.sources });
        setExamDiagnostic(data.diagnostic);
        setTimeout(() => examRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
      }
    } catch (error) { 
      setIsNotFound(true); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleGenerateFromThermometer = async (concurso: string, subjects: string[], banca: string) => {
    setIsLoading(true);
    setIsNotFound(false);
    setExam(null);
    setExamDiagnostic(null);
    setUserAnswers({});
    setIsCorrected(false);
    setView('simulado');
    const combinedQuery = `${concurso} - Foco em: ${subjects.join(', ')}`;
    try {
      const data = await generateExamQuestions(Modalidade.NACIONAL, combinedQuery, "", "Geral", ModeloQuestao.MULTIPLA_ESCOLHA, 10, banca);
      if (!data || !data.questions || data.questions.length === 0) {
        setIsNotFound(true);
      } else {
        setExam({ title: `Simulado Tático: ${concurso}`, questions: data.questions, passage: data.passage, concurso, sources: data.sources });
        setExamDiagnostic(data.diagnostic);
        setTimeout(() => examRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
      }
    } catch (error) {
      setIsNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCorrection = async () => {
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

    // Persistência Final no Supabase
    if (supabaseUser && dbSimuladoId) {
      await dbService.saveResultado(supabaseUser.id, dbSimuladoId, exam.questions.length, correct);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnswerSelect = async (questaoOriginalId: string, letra: string) => {
    if (isCorrected) return;
    setUserAnswers(prev => ({...prev, [questaoOriginalId]: letra}));

    // Persistência em tempo real no Supabase
    if (supabaseUser && idMapping[questaoOriginalId]) {
      const { questao_id, alternativas } = idMapping[questaoOriginalId];
      const selectedAlt = alternativas.find((a: any) => a.letra === letra);
      if (selectedAlt) {
        await dbService.saveResposta(supabaseUser.id, questao_id, selectedAlt.id);
      }
    }
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
      return <UserProfile user={currentUser!} userPlan={userPlan} onUpdate={handleUpdateUser} onUpgrade={() => handleViewChange('planos')} onStartFavExam={() => handleGenerateOrg(Modalidade.NACIONAL, "", "", "Geral", ModeloQuestao.MULTIPLA_ESCOLHA, 0, "", undefined, true)} />;
    }
    if (view === 'historico') {
      if (!supabaseUser) return <AuthForm onLogin={handleLogin} />;
      return <HistoryView history={currentUser?.history || []} />;
    }
    if (view === 'material') return <StudyMaterial userPlan={userPlan} onUpgrade={() => handleViewChange('planos')} onSavePlan={handleSaveStudyPlan} isLoggedIn={!!supabaseUser} />;
    if (view === 'termometro') return <ThermometerView userPlan={userPlan} onUpgrade={() => handleViewChange('planos')} onGenerateExam={handleGenerateFromThermometer} onShowProWall={setProWallFeature} />;
    if (view === 'previstos') return <PredictedConcursos onStudy={(name) => { handleViewChange('simulado'); handleGenerateOrg(Modalidade.NACIONAL, name, "", "Geral", ModeloQuestao.MULTIPLA_ESCOLHA, 3, ""); }} />;

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
                <ExamForm onGenerate={handleGenerateOrg} onShowProWall={setProWallFeature} isLoading={isLoading} isPro={userPlan.isPro} hasFavorites={currentUser?.favorites ? currentUser.favorites.length > 0 : false} />
              </>
            )}
            {view === 'materias' && <SimuladosMateriasForm onGenerate={handleGenerateSubject} onShowProWall={setProWallFeature} isLoading={isLoading} isPro={userPlan.isPro} />}
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
