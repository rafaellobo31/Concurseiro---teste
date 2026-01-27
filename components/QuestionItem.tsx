
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
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const QuestionItem: React.FC<QuestionItemProps> = ({ 
  question, index, modelo, selectedAnswer, onSelect, isCorrected, isFavorite, onToggleFavorite 
}) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const uAns = normalizeAnswer(selectedAnswer);
  const cAns = resolveToCanonical(question.correctAnswer, question.options);
  const isCorrect = uAns === cAns && uAns !== '';

  return (
    <div className={`bg-white p-6 rounded-3xl border-2 transition-all relative ${isCorrected ? (isCorrect ? 'border-green-100' : 'border-red-100') : 'border-gray-100'}`}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
          Questão {index + 1} • {question.banca} ({question.ano})
        </span>
        <button 
            onClick={onToggleFavorite}
            className={`p-2 rounded-xl transition-all ${isFavorite ? 'bg-amber-100 text-amber-500' : 'bg-gray-50 text-gray-300 hover:text-amber-500'}`}
            title="Favoritar (Apenas PRO)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
      </div>

      <p className="text-gray-800 font-medium text-lg mb-6 leading-relaxed">{question.text}</p>

      <div className="space-y-3">
        {question.options?.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const isSelected = uAns === letter;
          return (
            <button 
                key={i} 
                onClick={() => onSelect(letter)}
                className={`w-full p-4 rounded-2xl text-left border-2 flex items-center gap-4 transition-all ${
                    isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-50'
                } ${isCorrected && letter === cAns ? 'bg-green-50 border-green-400' : ''}`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{letter}</span>
              <span className="font-bold text-gray-700">{opt}</span>
            </button>
          );
        })}
      </div>

      {(isCorrected || showExplanation) && (
        <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm">
           <p className="font-black text-indigo-600 mb-1 uppercase tracking-widest text-[10px]">Gabarito: {question.correctAnswer}</p>
           <p className="text-gray-600 font-medium italic">{question.explicacao}</p>
        </div>
      )}
    </div>
  );
};

export default QuestionItem;
