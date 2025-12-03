import React, { useState } from 'react';
import { SurveyAnswers, Language } from '../types';
import { translations } from '../utils/translations';
import { Activity, Moon, Zap, Target, TrendingUp, Shield } from 'lucide-react';

interface HealthSurveyProps {
  onSubmit: (answers: SurveyAnswers) => void;
  onCancel: () => void;
  lang: Language;
}

export const HealthSurvey: React.FC<HealthSurveyProps> = ({ onSubmit, onCancel, lang }) => {
  const t = translations[lang];
  const [answers, setAnswers] = useState<SurveyAnswers>({
    sleepQuality: 3,
    energyLevel: 5,
    focusLevel: 5,
    motivationLevel: 5,
    feelingSafe: 5
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answers);
  };

  const renderSlider = (
    label: string, 
    value: number, 
    key: keyof SurveyAnswers, 
    icon: React.ReactNode, 
    colorClass: string
  ) => (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
       <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
         <span className={`p-1.5 rounded-lg ${colorClass} text-white`}>{icon}</span> {label}
       </label>
       <input
         type="range"
         min="0"
         max="10"
         step="1"
         value={value}
         onChange={(e) => setAnswers(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
         className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
       />
       <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
         <span>{t.low} (0)</span>
         <span className="font-bold text-slate-800 text-lg">{value}</span>
         <span>{t.high} (10)</span>
       </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 max-w-2xl w-full mx-auto animate-fade-in">
      <div className="mb-6 border-b border-slate-100 pb-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Activity className="text-emerald-500" /> {t.surveyTitle}
        </h2>
        <p className="text-slate-500 mt-1">Rate your current state honestly.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sleep Quality (Buttons) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500 text-white"><Moon size={16} /></span> {t.sleepQ}
          </label>
          <div className="flex justify-between px-2">
             {[1, 2, 3, 4, 5].map((val) => (
               <button
                 key={val}
                 type="button"
                 onClick={() => setAnswers(prev => ({ ...prev, sleepQuality: val }))}
                 className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                   answers.sleepQuality === val
                     ? 'bg-indigo-600 text-white scale-110 shadow-md'
                     : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300'
                 }`}
               >
                 {val}
               </button>
             ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2 px-2 font-medium">
             <span>{t.poor}</span>
             <span>{t.excellent}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderSlider(t.energyLvl, answers.energyLevel, 'energyLevel', <Zap size={16} />, 'bg-amber-500')}
            {renderSlider(t.focusLvl, answers.focusLevel, 'focusLevel', <Target size={16} />, 'bg-blue-500')}
            {renderSlider(t.motivationLvl, answers.motivationLevel, 'motivationLevel', <TrendingUp size={16} />, 'bg-purple-500')}
            {renderSlider(t.safeLvl, answers.feelingSafe, 'feelingSafe', <Shield size={16} />, 'bg-emerald-500')}
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 border border-slate-300 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-lg font-bold shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex justify-center items-center gap-2"
          >
            {t.submit}
          </button>
        </div>
      </form>
    </div>
  );
};