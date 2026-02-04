
import React, { useState } from 'react';
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
  const uAns = normalizeAnswer(selectedAnswer);
  const cAns = resolveToCanonical(question.correctAnswer, question.options);
  const isUserCorrect = uAns === cAns && uAns !== '';
  const hasAnswered = uAns !== '';

  return (
    <div className={`bg-white p-6 md:p-8 rounded-[2rem] border-2 transition-all relative shadow-sm ${
      isCorrected 
        ? (isUserCorrect ? 'border-green-200 bg-green-50/10' : hasAnswered ? 'border-red-200 bg-red-50/10' : 'border-gray-100') 
        : 'border-gray-100 hover:border-indigo-100'
    }`}>
      {/* Cabeçalho da Questão */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm">
              Questão {index + 1}
            </span>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
              {question.banca} • {question.ano}
            </span>
          </div>
          {isCorrected && (
            <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight mt-1 ${isUserCorrect ? 'text-green-600' : hasAnswered ? 'text-red-600' : 'text-slate-400'}`}>
              {isUserCorrect ? (
                <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg> ACERTOU</>
              ) : hasAnswered ? (
                <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> ERROU</>
              ) : (
                <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><circle cx="12" cy="12" r="10"/></svg> NÃO RESPONDIDA</>
              )}
            </div>
          )}
        </div>
        <button 
            onClick={onToggleFavorite}
            className={`p-2.5 rounded-2xl transition-all ${isFavorite ? 'bg-amber-100 text-amber-500 shadow-sm' : 'bg-gray-50 text-gray-300 hover:text-amber-500'}`}
            title="Favoritar (Apenas PRO)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
      </div>

      {/* Enunciado */}
      <p className="text-gray-800 font-medium text-lg md:text-xl mb-8 leading-relaxed exam-font">{question.text}</p>

      {/* Alternativas */}
      <div className="space-y-4 mb-8">
        {question.options?.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const isSelected = uAns === letter;
          const isCorrectChoice = letter === cAns;
          
          let optionStyles = "border-gray-100 hover:bg-slate-50";
          let circleStyles = "bg-gray-100 text-gray-500";

          if (isSelected) {
            optionStyles = "border-indigo-600 bg-indigo-50/50 shadow-sm";
            circleStyles = "bg-indigo-600 text-white";
          }

          if (isCorrected) {
            if (isCorrectChoice) {
              optionStyles = "border-green-500 bg-green-50 ring-2 ring-green-500 ring-opacity-20";
              circleStyles = "bg-green-600 text-white shadow-lg shadow-green-200";
            } else if (isSelected && !isCorrectChoice) {
              optionStyles = "border-red-400 bg-red-50 opacity-90";
              circleStyles = "bg-red-600 text-white shadow-lg shadow-red-200";
            } else if (!isSelected) {
              optionStyles = "border-gray-100 opacity-60 grayscale-[0.3]";
              circleStyles = "bg-gray-100 text-gray-400";
            }
          }

          return (
            <button 
                key={i} 
                onClick={() => !isCorrected && onSelect(letter)}
                disabled={isCorrected}
                className={`w-full p-5 rounded-3xl text-left border-2 flex items-center gap-5 transition-all group ${optionStyles} ${isCorrected ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
            >
              <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-transform ${circleStyles} ${!isCorrected && 'group-hover:scale-110'}`}>{letter}</span>
              <span className={`font-bold text-base md:text-lg flex-1 ${isCorrected && isCorrectChoice ? 'text-green-900' : isCorrected && isSelected && !isCorrectChoice ? 'text-red-900' : 'text-gray-700'}`}>{opt}</span>
              {isCorrected && isCorrectChoice && (
                <div className="bg-green-500 text-white p-1.5 rounded-full shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Gabarito e Fundamentação */}
      {isCorrected && (
        <div className="mt-8 animate-in slide-in-from-top-4 duration-500">
          <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 relative overflow-hidden shadow-inner">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md">Gabarito Oficial</span>
                <span className="text-slate-900 font-black text-xl uppercase">Alternativa {cAns || '?'}</span>
              </div>
              <div className="hidden md:block w-px h-6 bg-slate-200 mx-2"></div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Comentário do Especialista (IA)
              </div>
            </div>
            
            <div className="relative min-h-[80px]">
              {!isPro && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6 bg-slate-50/90 backdrop-blur-[6px] rounded-3xl border border-white/50 shadow-xl">
                   <div className="bg-indigo-600 text-white p-2 rounded-xl mb-3 shadow-lg">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                   </div>
                   <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4">🔓 Explicação Detalhada Exclusiva PRO</p>
                   <button 
                     onClick={onUpgrade}
                     className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                   >
                     Desbloquear Comentário Completo
                   </button>
                </div>
              )}
              <div className={`text-slate-700 text-base md:text-lg font-medium leading-relaxed italic pr-4 ${!isPro ? 'select-none blur-[4px]' : ''}`}>
                {question.explicacao || "Explicação não disponível para esta questão."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionItem;
