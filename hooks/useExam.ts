
import { useState } from 'react';
import { Exam, Question, Modalidade, ModeloQuestao, Nivel, User } from '../types';
import { generateExamQuestions, generateSubjectQuestions } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { db } from '../services/db';
import { normalizeAnswer, resolveToCanonical } from '../utils';

export const useExam = (currentUser: User | null, supabaseUser: any, onShowProWall: (feature: string) => void) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [examDiagnostic, setExamDiagnostic] = useState<any>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isCorrected, setIsCorrected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [dbSimuladoId, setDbSimuladoId] = useState<string | null>(null);
  const [idMapping, setIdMapping] = useState<Record<string, { questao_id: string, alternativas: any[] }>>({});

  const resetExam = () => {
    setExam(null);
    setExamDiagnostic(null);
    setIsCorrected(false);
    setUserAnswers({});
    setDbSimuladoId(null);
    setIdMapping({});
    setIsNotFound(false);
  };

  const handleGenerateOrg = async (modalidade: Modalidade, concurso: string, nivel: Nivel | string, cargoArea: string, modelo: ModeloQuestao, numQuestao: number, banca: string, estado?: string, isFavOnly?: boolean) => {
    const isPro = currentUser?.isPro || false;
    if (isFavOnly && !isPro) {
      onShowProWall("acessar e treinar com suas questões favoritas");
      return;
    }
    setIsLoading(true);
    resetExam();

    if (isFavOnly && currentUser) {
        if (currentUser.favorites.length < 10) {
            alert("Você precisa de no mínimo 10 questões favoritadas para realizar um simulado de revisão.");
            setIsLoading(false);
            return false;
        }
        setExam({ title: "Simulado de Favoritos", questions: currentUser.favorites });
        setIsLoading(false);
        return true; // Signal view change
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
        return true;
      }
    } catch (error) { 
      setIsNotFound(true); 
    } finally { 
      setIsLoading(false); 
    }
    return false;
  };

  const handleGenerateSubject = async (materia: string, modelo: ModeloQuestao, numQuestao: number, banca: string) => {
    const isPro = currentUser?.isPro || false;
    setIsLoading(true);
    resetExam();
    const finalNumQuestao = isPro ? numQuestao : Math.min(numQuestao, 20);
    try {
      const data = await generateSubjectQuestions(materia, modelo, finalNumQuestao, banca);
      if (!data || !data.questions || data.questions.length === 0) { 
        setIsNotFound(true); 
      } else {
        setExam({ title: `Simulado: ${materia}`, questions: data.questions, passage: data.passage, materia, sources: data.sources });
        setExamDiagnostic(data.diagnostic);
        return true;
      }
    } catch (error) { 
      setIsNotFound(true); 
    } finally { 
      setIsLoading(false); 
    }
    return false;
  };

  const handleGenerateFromThermometer = async (concurso: string, subjects: string[], banca: string) => {
    setIsLoading(true);
    resetExam();
    const combinedQuery = `${concurso} - Foco em: ${subjects.join(', ')}`;
    try {
      const data = await generateExamQuestions(Modalidade.NACIONAL, combinedQuery, "", "Geral", ModeloQuestao.MULTIPLA_ESCOLHA, 10, banca);
      if (!data || !data.questions || data.questions.length === 0) {
        setIsNotFound(true);
      } else {
        setExam({ title: `Simulado Tático: ${concurso}`, questions: data.questions, passage: data.passage, concurso, sources: data.sources });
        setExamDiagnostic(data.diagnostic);
        return true;
      }
    } catch (error) {
      setIsNotFound(true);
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const handleCorrection = async (onSuccess?: (correct: number) => void) => {
    if (!exam) return;
    setIsCorrected(true);
    let correct = 0;
    exam.questions.forEach(q => {
      if (normalizeAnswer(userAnswers[q.id]) === resolveToCanonical(q.correctAnswer, q.options)) correct++;
    });

    if (currentUser) {
      const result = {
        id: Math.random().toString(36).substr(2, 9),
        date: Date.now(),
        title: exam.title,
        score: correct,
        total: exam.questions.length,
        questions: exam.questions,
        userAnswers: userAnswers
      };
      db.addExamToHistory(currentUser.email, result);
      if (onSuccess) onSuccess(correct);
    }

    if (supabaseUser && dbSimuladoId) {
      await dbService.saveResultado(supabaseUser.id, dbSimuladoId, exam.questions.length, correct);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnswerSelect = async (questaoOriginalId: string, letra: string) => {
    if (isCorrected) return;
    setUserAnswers(prev => ({...prev, [questaoOriginalId]: letra}));

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
      onShowProWall("favoritar questões e montar sua biblioteca pessoal de estudos");
      return;
    }
    db.toggleFavorite(currentUser.email, q);
  };

  return {
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
    handleCorrection,
    handleAnswerSelect,
    handleToggleFav
  };
};
