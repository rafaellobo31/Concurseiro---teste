
import React from 'react';
import { Question, ModeloQuestao } from '../types';
import { normalizeAnswer, resolveToCanonical } from '../utils';

interface QuestionItemProps {
  question: Question;
  index: number;
  modelo: ModeloQuestao;
  selectedAnswer: string | null;
  onSelect: (answer: string) => void;
  isCorrected: boolean;
  isPro: boolean;
  onUpgrade?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const QuestionItem: React.FC<QuestionItemProps> = ({ 
  question, index, modelo, selectedAnswer, onSelect, isCorrected, isPro, onUpgrade, isFavorite, onToggleFavorite 
}) => {
  const uAnsLetter = normalizeAnswer(selectedAnswer);
  const cAnsLetter = resolveToCanonical(question.correctAnswer || '', question.options);
  
  const isUserCorrect = uAnsLetter === cAnsLetter && uAnsLetter !== '';
  const hasAnswered = uAnsLetter !== '';

  // Auxiliares para o resumo textual
  const getOptionText = (letter: string) => {
    if (!letter || !question.options) return '---';
    const idx = letter.charCodeAt(0) - 65;
    return question.options[idx] || '---';
  };

  const userSelectedText = getOptionText(uAnsLetter);
  const correctText = getOptionText(cAnsLetter);

  return (
    <div className={`bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 transition-all relative shadow-sm w-full max-w-full overflow-hidden ${
      isCorrected 
        ? (isUserCorrect ? 'border-green-200 bg-green-50/5' : hasAnswered ? 'border-red-200 bg-red-50/5' : 'border-gray-100') 
        : 'border-gray-100 hover:border-indigo-100'
    }`}>
      {/* Cabeçalho da Questão */}
      <div className="flex justify-between items-start mb-6 gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-indigo-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
              Questão {index + 1}
            </span>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest truncate">
              {question.banca} • {question.ano}
            </span>
          </div>
          {isCorrected && (
            <div className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-tight mt-1 ${isUserCorrect ? 'text-green-600' : hasAnswered ? 'text-red-600' : 'text-slate-400'}`}>
              {isUserCorrect ? (
                <span className="flex items-center gap-1">
                  <div className="bg-green-600 text-white p-0.5 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg></div>
                  VOCÊ ACERTOU
                </span>
              ) : hasAnswered ? (
                <span className="flex items-center gap-1">
                  <div className="bg-red-600 text-white p-0.5 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
                  VOCÊ ERROU
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><circle cx="12" cy="12" r="10"/></svg>
                  NÃO RESPONDIDA
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {question.recorrente && (
            <span className="hidden sm:inline-block bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border border-amber-200">Recorrência Alta</span>
          )}
          <button 
              onClick={onToggleFavorite}
              className={`p-2 rounded-xl md:p-2.5 md:rounded-2xl transition-all ${isFavorite ? 'bg-amber-100 text-amber-500 shadow-sm' : 'bg-gray-50 text-gray-300 hover:text-amber-500'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
        </div>
      </div>

      {/* Enunciado */}
      <p className="text-gray-800 font-medium text-base md:text-xl mb-8 leading-relaxed exam-font break-words">{question.text}</p>

      {/* Alternativas */}
      <div className="space-y-3 md:space-y-4 mb-8">
        {question.options?.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const isSelected = uAnsLetter === letter;
          const isCorrectChoice = letter === cAnsLetter;
          
          let optionStyles = "border-gray-100 hover:bg-slate-50";
          let circleStyles = "bg-gray-100 text-gray-500";

          if (isSelected) {
            optionStyles = "border-indigo-600 bg-indigo-50/50 shadow-sm";
            circleStyles = "bg-indigo-600 text-white";
          }

          if (isCorrected) {
            if (isCorrectChoice) {
              optionStyles = "border-green-500 bg-green-50 ring-1 ring-green-500 ring-opacity-30";
              circleStyles = "bg-green-600 text-white shadow-lg shadow-green-200";
            } else if (isSelected && !isCorrectChoice) {
              optionStyles = "border-red-400 bg-red-50 opacity-90";
              circleStyles = "bg-red-600 text-white shadow-lg shadow-red-200";
            } else if (!isSelected) {
              optionStyles = "border-gray-100 opacity-50 grayscale-[0.5]";
              circleStyles = "bg-gray-100 text-gray-400";
            }
          }

          return (
            <button 
                key={i} 
                onClick={() => !isCorrected && onSelect(letter)}
                disabled={isCorrected}
                className={`w-full p-4 md:p-5 rounded-2xl md:rounded-3xl text-left border-2 flex items-center gap-3 md:gap-5 transition-all group overflow-hidden ${optionStyles} ${isCorrected ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
            >
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-xs md:text-sm shrink-0 transition-transform ${circleStyles}`}>
                {isCorrected && isCorrectChoice ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                ) : isCorrected && isSelected && !isCorrectChoice ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                ) : letter}
              </div>
              <span className={`font-bold text-sm md:text-lg flex-1 break-words whitespace-normal ${isCorrected && isCorrectChoice ? 'text-green-900' : isCorrected && isSelected && !isCorrectChoice ? 'text-red-900' : 'text-gray-700'}`}>{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Resumo Didático (Exclusivo após correção) */}
      {isCorrected && (
        <div className="mb-8 p-6 bg-slate-900 rounded-3xl text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sua Resposta:</span>
              <p className={`text-sm font-bold flex items-center gap-2 ${isUserCorrect ? 'text-green-400' : hasAnswered ? 'text-red-400' : 'text-slate-500'}`}>
                {hasAnswered ? `${uAnsLetter}) ${userSelectedText}` : '(Não respondida)'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gabarito Oficial:</span>
              <p className="text-sm font-bold text-green-400">
                {cAnsLetter}) {correctText}
              </p>
            </div>
            <div className="space-y-1 md:text-right">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Resultado Final:</span>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isUserCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {isUserCorrect ? '✅ ACERTO' : '❌ ERRO'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Justificativa e Fundamentação Tática */}
      {isCorrected && (
        <div className="mt-4 animate-in slide-in-from-top-4 duration-500 w-full">
          <div className="bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 border border-slate-100 relative overflow-hidden shadow-inner">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
              {!isPro && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6 bg-slate-50/80 backdrop-blur-[16px] rounded-2xl border border-white/50 shadow-xl">
                   <div className="bg-indigo-600 p-3 rounded-2xl text-white mb-4 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                   </div>
                   <h5 className="text-lg font-black text-slate-900 mb-2 uppercase tracking-tight">Análise Estratégica Bloqueada</h5>
                   <p className="text-slate-500 font-medium text-xs mb-6 max-w-xs">Torne-se PRO para visualizar a fundamentação técnica e o mindset da banca.</p>
                   <button 
                     onClick={onUpgrade}
                     className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                   >
                     LIBERAR EXPLICAÇÃO COMPLETA
                   </button>
                </div>
              )}

              <div className={`space-y-3 ${!isPro ? 'select-none blur-[20px] grayscale' : ''}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 bg-indigo-600 rounded-full"></div>
                  <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Fundamentação Técnica:</h5>
                </div>
                <p className="text-slate-700 text-sm font-medium leading-relaxed italic break-words">
                  {question.explicacao || "A fundamentação detalha o dispositivo legal, doutrinário ou jurisprudencial que valida esta alternativa."}
                </p>
              </div>

              <div className={`space-y-3 p-5 bg-white rounded-2xl border border-indigo-50 shadow-sm ${!isPro ? 'select-none blur-[20px] grayscale' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">DNA da Banca (Mindset):</h5>
                </div>
                <p className="text-indigo-900 text-[11px] font-bold leading-relaxed break-words">
                  {question.boardMindset || "A banca tende a explorar a literalidade da lei associada a pegadinhas em prazos ou competências específicas."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionItem;
