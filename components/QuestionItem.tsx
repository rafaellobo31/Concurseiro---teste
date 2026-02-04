
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
  const [showExplanation, setShowExplanation] = useState(false);
  
  const uAns = normalizeAnswer(selectedAnswer);
  const cAns = resolveToCanonical(question.correctAnswer, question.options);
  const isUserCorrect = uAns === cAns && uAns !== '';
  const hasAnswered = uAns !== '';

  return (
    <div className={`bg-white p-6 rounded-3xl border-2 transition-all relative ${
      isCorrected 
        ? (isUserCorrect ? 'border-green-200 bg-green-50/20' : hasAnswered ? 'border-red-200 bg-red-50/20' : 'border-gray-100') 
        : 'border-gray-100'
    }`}>
      {/* Cabeçalho da Questão */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
            Questão {index + 1} • {question.banca} ({question.ano})
          </span>
          {isCorrected && (
            <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight ${isUserCorrect ? 'text-green-600' : hasAnswered ? 'text-red-600' : 'text-slate-400'}`}>
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
            className={`p-2 rounded-xl transition-all ${isFavorite ? 'bg-amber-100 text-amber-500 shadow-sm' : 'bg-gray-50 text-gray-300 hover:text-amber-500'}`}
            title="Favoritar (Apenas PRO)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
      </div>

      {/* Enunciado */}
      <p className="text-gray-800 font-medium text-lg mb-6 leading-relaxed exam-font">{question.text}</p>

      {/* Alternativas */}
      <div className="space-y-3">
        {question.options?.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const isSelected = uAns === letter;
          const isCorrectChoice = letter === cAns;
          
          let optionStyles = "border-gray-50 hover:bg-slate-50";
          let circleStyles = "bg-gray-100 text-gray-500";

          if (isSelected) {
            optionStyles = "border-indigo-600 bg-indigo-50/50 shadow-sm";
            circleStyles = "bg-indigo-600 text-white";
          }

          if (isCorrected) {
            if (isCorrectChoice) {
              optionStyles = "border-green-500 bg-green-50 ring-2 ring-green-500 ring-opacity-20";
              circleStyles = "bg-green-600 text-white";
            } else if (isSelected && !isCorrectChoice) {
              optionStyles = "border-red-400 bg-red-50 opacity-90";
              circleStyles = "bg-red-600 text-white";
            } else if (!isSelected) {
              optionStyles = "border-gray-100 opacity-60 grayscale-[0.5]";
              circleStyles = "bg-gray-100 text-gray-400";
            }
          }

          return (
            <button 
                key={i} 
                onClick={() => !isCorrected && onSelect(letter)}
                disabled={isCorrected}
                className={`w-full p-4 rounded-2xl text-left border-2 flex items-center gap-4 transition-all ${optionStyles} ${isCorrected ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${circleStyles}`}>{letter}</span>
              <span className={`font-bold ${isCorrected && isCorrectChoice ? 'text-green-900' : 'text-gray-700'}`}>{opt}</span>
              {isCorrected && isCorrectChoice && (
                <svg className="ml-auto text-green-600 shrink-0" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Gabarito e Explicação Pedagógica */}
      {isCorrected && (
        <div className="mt-8 animate-in slide-in-from-top-4">
          <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-indigo-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm">Gabarito Oficial</span>
              <span className="text-slate-900 font-black text-sm uppercase">Alternativa {cAns}</span>
            </div>
            
            <div className="relative">
              {!isPro && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-4 bg-slate-50/80 backdrop-blur-[4px] rounded-xl border border-white/50">
                   <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">🔓 Explicação Exclusiva Premium</p>
                   <button 
                     onClick={onUpgrade}
                     className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                   >
                     Desbloquear Comentário IA
                   </button>
                </div>
              )}
              <div className={`text-slate-600 text-sm font-medium leading-relaxed italic ${!isPro ? 'select-none blur-[2px]' : ''}`}>
                {question.explicacao}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionItem;
