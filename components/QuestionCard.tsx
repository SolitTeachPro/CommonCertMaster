
import React from 'react';
import { Question } from '../types';
import { Bookmark, CheckCircle2, XCircle, AlertCircle, Lightbulb } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  userAnswer?: string[];
  showResult?: boolean;
  onAnswer: (answer: string[]) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: string) => void;
  isRecitationMode?: boolean; 
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  total,
  userAnswer = [],
  showResult = false,
  onAnswer,
  isBookmarked,
  onToggleBookmark,
  isRecitationMode = false
}) => {
  const handleOptionClick = (label: string) => {
    if (showResult || isRecitationMode) return;

    if (question.type === 'single') {
      onAnswer([label]);
    } else {
      const newAnswer = userAnswer.includes(label)
        ? userAnswer.filter(l => l !== label)
        : [...userAnswer, label].sort();
      onAnswer(newAnswer);
    }
  };

  const isCorrect = showResult && userAnswer.sort().join('') === question.answer.sort().join('');

  return (
    <div className={`bg-white p-5 md:p-8 rounded-2xl md:rounded-[2rem] shadow-sm border max-w-4xl mx-auto transition-all ${isRecitationMode ? 'border-blue-100 ring-4 ring-blue-50' : 'border-slate-100'}`}>
      {/* Header Info */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-start gap-3 md:gap-4">
          <span className={`px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-sm font-black rounded-md shrink-0 uppercase tracking-wider ${
            isRecitationMode ? 'bg-blue-600 text-white' : 'bg-slate-600 text-white'
          }`}>
            {question.type === 'single' ? '单选' : '多选'}
          </span>
          <h2 className="text-lg md:text-2xl font-bold text-slate-800 leading-snug md:leading-tight">
            {index + 1}. {question.content}
          </h2>
        </div>
        <button 
          onClick={() => onToggleBookmark?.(question.id)}
          className={`p-1 transition-colors shrink-0 ${isBookmarked ? 'text-orange-500' : 'text-slate-300 hover:text-slate-500'}`}
        >
          <Bookmark size={20} className="md:w-6 md:h-6" fill={isBookmarked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Images Section */}
      {question.images && question.images.length > 0 && (
        <div className="mb-6 md:mb-8 md:ml-12 space-y-4">
          {question.images.map((img, i) => (
            <div key={i} className="max-w-full md:max-w-xl rounded-xl border border-slate-100 overflow-hidden shadow-sm">
              <img src={img} alt={`题目图示 ${i+1}`} className="w-full h-auto object-contain bg-white" />
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      <div className="space-y-2 md:space-y-4 mb-8 md:mb-10">
        {question.options.map((opt) => {
          const isSelected = userAnswer.includes(opt.label);
          const isRight = question.answer.includes(opt.label);
          
          // Selection Markers and Colors for Recitation Mode
          const recitationStyle = isRight 
            ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' 
            : 'bg-white border-slate-100 text-slate-400 opacity-60';

          return (
            <button
              key={opt.label}
              onClick={() => handleOptionClick(opt.label)}
              disabled={showResult || isRecitationMode}
              className={`w-full text-left flex items-start gap-3 md:gap-4 group rounded-xl md:rounded-2xl p-3 md:p-5 transition-all border-2 ${
                isRecitationMode 
                  ? recitationStyle
                  : isSelected && !showResult 
                    ? 'border-blue-600 bg-blue-50/30' 
                    : 'border-transparent md:hover:bg-slate-50'
              }`}
            >
              {/* Recitation Mode hides the interactive checkbox/radio circle */}
              {!isRecitationMode ? (
                <div className={`mt-0.5 shrink-0 w-6 h-6 border-2 flex items-center justify-center transition-all ${
                  question.type === 'single' ? 'rounded-full' : 'rounded-md'
                } ${
                  isSelected 
                    ? 'border-blue-600 bg-blue-600' 
                    : 'border-slate-200'
                }`}>
                  {isSelected ? (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  ) : (
                    <span className="text-[10px] font-black text-slate-400">{opt.label}</span>
                  )}
                </div>
              ) : (
                <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                  isRight ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'bg-slate-100 text-slate-400'
                }`}>
                   {opt.label}
                </div>
              )}
              
              <div className="flex-grow flex items-center justify-between">
                <span className={`text-sm md:text-lg font-bold transition-colors ${
                  isRecitationMode && !isRight ? 'text-slate-300' : ''
                }`}>
                  {opt.text}
                </span>
                
                {showResult && !isRecitationMode && (
                  <div className="shrink-0 ml-2">
                    {isRight && <CheckCircle2 className="text-green-500" size={24} />}
                    {isSelected && !isRight && <XCircle className="text-red-500" size={24} />}
                  </div>
                )}

                {isRecitationMode && isRight && (
                   <CheckCircle2 className="text-green-600" size={20} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-6 border-t border-slate-100 space-y-4">
        {/* Strictly following the instruction: Answer mode does not show KP, Recitation mode shows KP */}
        {isRecitationMode && (
          <div className="bg-blue-50 p-6 rounded-[1.5rem] flex items-start gap-4 border border-blue-100 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-blue-600 text-white p-2 rounded-xl"><Lightbulb size={24} /></div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">背题模式 · 相关知识点</span>
              <span className="text-sm md:text-lg font-black text-blue-800 leading-relaxed">
                {question.knowledgePoint}
              </span>
            </div>
          </div>
        )}

        {showResult && !isRecitationMode && !isCorrect && (
          <div className="bg-red-50 p-5 rounded-2xl flex items-center gap-4 border border-red-100 shadow-sm">
            <div className="bg-red-500 text-white p-1.5 rounded-lg"><AlertCircle size={20} /></div>
            <span className="text-red-700 font-black text-base md:text-lg tracking-tight">
              回答错误。正确答案：<span className="underline decoration-4 underline-offset-4">{question.answer.join('')}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
