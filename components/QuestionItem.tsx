
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

  const getOptionText = (letter: string) => {
    if (!letter || !question.options) return '';
    const idx = letter.charCodeAt(0) - 65;
    return question.options[idx] || '';
  };

  const userSelectedText = getOptionText(uAnsLetter);
  const correctText = getOptionText(cAnsLetter);

  return (
    <div className={`bg-white rounded-[2rem] md:rounded-[2.5rem] border-2 transition-all relative shadow-sm w-full max-w-full overflow-hidden ${
      isCorrected 
        ? (isUserCorrect ? 'border-green-500 bg-green-50/5' : hasAnswered ? 'border-red-500 bg-red-50/5' : 'border-gray-200') 
        : 'border-gray-100 hover:border-indigo-100'
    }`}>
      
      {/* BLOCO 1 — STATUS DA QUESTÃO (Banner Superior) */}
      {isCorrected && (
        <div className={`w-full py-4 px-8 flex items-center justify-center gap-3 animate-in slide-in-from-top-4 duration-500 ${isUserCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {isUserCorrect ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
              <span className="font-black uppercase tracking-[0.2em] text-sm md:text-base">VOCÊ ACERTOU</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <span className="font-black uppercase tracking-[0.2em] text-sm md:text-base">VOCÊ ERROU</span>
            </>
          )}
        </div>
      )}

      <div className="p-6 md:p-10">
        {/* Cabeçalho Técnico */}
        <div className="flex justify-between items-start mb-6 gap-2">
          <div className="flex flex-col gap-1">
             <div className="flex flex-wrap items-center gap-2">
                <span className="bg-slate-900 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded shadow-sm whitespace-nowrap">
                  Questão {index + 1}
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                  {question.banca} • {question.ano}
                </span>
             </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {question.recorrente && (
              <span className="hidden sm:inline-block bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border border-amber-200">Recorrência Alta</span>
            )}
            <button 
                onClick={onToggleFavorite}
                className={`p-2 rounded-xl transition-all ${isFavorite ? 'bg-amber-100 text-amber-500 shadow-sm' : 'bg-gray-50 text-gray-300 hover:text-amber-500'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </button>
          </div>
        </div>

        {/* BLOCO 2 — ENUNCIADO */}
        <p className="text-slate-800 font-medium text-lg md:text-xl mb-10 leading-relaxed exam-font break-words">
          {question.text}
        </p>

        {/* BLOCO 3 — ALTERNATIVAS (Feedback Visual Detalhado) */}
        <div className="space-y-4 mb-10">
          {question.options?.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isUserSelected = uAnsLetter === letter;
            const isCorrectChoice = letter === cAnsLetter;
            
            let containerStyles = "border-gray-100 hover:bg-slate-50 hover:border-indigo-100";
            let circleStyles = "bg-gray-100 text-gray-500";
            let labelText = "";
            let icon = null;

            if (!isCorrected && isUserSelected) {
              containerStyles = "border-indigo-600 bg-indigo-50/50 shadow-sm";
              circleStyles = "bg-indigo-600 text-white";
            }

            if (isCorrected) {
              if (isCorrectChoice) {
                containerStyles = "border-green-500 bg-green-50 ring-2 ring-green-500/20";
                circleStyles = "bg-green-600 text-white shadow-md shadow-green-200";
                labelText = "Resposta correta";
                icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>;
              } else if (isUserSelected && !isCorrectChoice) {
                containerStyles = "border-red-500 bg-red-50 ring-2 ring-red-500/20";
                circleStyles = "bg-red-600 text-white shadow-md shadow-red-200";
                labelText = "Você marcou esta alternativa";
                icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
              } else {
                containerStyles = "border-gray-100 opacity-40 grayscale-[0.8]";
                circleStyles = "bg-gray-100 text-gray-400";
              }
            }

            return (
              <button 
                  key={i} 
                  onClick={() => !isCorrected && onSelect(letter)}
                  disabled={isCorrected}
                  className={`w-full p-5 rounded-2xl md:rounded-3xl text-left border-2 flex items-center gap-4 md:gap-6 transition-all group relative overflow-hidden ${containerStyles} ${isCorrected ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
              >
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-black text-sm md:text-lg shrink-0 transition-transform ${circleStyles}`}>
                  {icon || letter}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`font-bold text-sm md:text-lg block break-words ${isCorrected && isCorrectChoice ? 'text-green-900' : isCorrected && isUserSelected && !isCorrectChoice ? 'text-red-900' : 'text-slate-700'}`}>
                    {opt}
                  </span>
                  {isCorrected && labelText && (
                    <span className={`text-[10px] font-black uppercase tracking-widest mt-1 block ${isCorrectChoice ? 'text-green-600' : 'text-red-600'}`}>
                      {labelText}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* BLOCO 4 — RESUMO CLARO E DIDÁTICO */}
        {isCorrected && (
          <div className="mb-10 p-6 md:p-8 bg-slate-900 rounded-[2rem] text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Sua Resposta */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sua Resposta:</span>
                <div className={`flex items-start gap-4 p-4 rounded-2xl ${isUserCorrect ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${isUserCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {hasAnswered ? uAnsLetter : '-'}
                  </div>
                  <p className={`text-sm md:text-base font-bold leading-relaxed ${isUserCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {hasAnswered ? userSelectedText : 'Questão não respondida'}
                  </p>
                </div>
              </div>

              {/* Resposta Correta */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Gabarito Oficial:</span>
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-green-500/10 border border-green-500/30">
                  <div className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                    {cAnsLetter}
                  </div>
                  <p className="text-sm md:text-base font-bold text-green-400 leading-relaxed">
                    {correctText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BLOCOS 5 E 6 — JUSTIFICATIVA E MINDSET (Com Paywall) */}
        {isCorrected && (
          <div className="mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-4 duration-500 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
              
              {!isPro && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-8 bg-white/60 backdrop-blur-[14px] rounded-3xl border border-white/50 shadow-2xl">
                   <div className="bg-indigo-600 p-4 rounded-3xl text-white mb-6 shadow-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                   </div>
                   <h5 className="text-xl font-black text-slate-900 mb-2 uppercase">Análise Estratégica Bloqueada</h5>
                   <p className="text-slate-500 font-medium text-sm mb-8 max-w-sm">Torne-se PRO para visualizar a fundamentação técnica e como a banca costuma cobrar este tema.</p>
                   <button 
                     onClick={onUpgrade}
                     className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                   >
                     LIBERAR EXPLICAÇÃO COMPLETA
                   </button>
                </div>
              )}

              {/* Justificativa */}
              <div className={`space-y-4 ${!isPro ? 'select-none blur-[20px] grayscale' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                  <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest">Fundamentação Jurídica/Técnica</h5>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-slate-700 text-sm md:text-base font-medium leading-relaxed italic break-words">
                    {question.explicacao || "A fundamentação detalha o dispositivo legal ou doutrinário que confirma o gabarito oficial."}
                  </p>
                </div>
              </div>

              {/* Mindset da Banca */}
              <div className={`space-y-4 ${!isPro ? 'select-none blur-[20px] grayscale' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <h5 className="text-xs font-black text-indigo-600 uppercase tracking-widest">🧠 Padrão da Banca {question.banca}</h5>
                </div>
                <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 shadow-sm">
                  <p className="text-indigo-900 text-sm md:text-base font-bold leading-relaxed break-words">
                    {question.boardMindset || "A banca tende a explorar a literalidade dos prazos e competências específicas para induzir o candidato ao erro."}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionItem;
