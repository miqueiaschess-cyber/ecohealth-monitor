import React from 'react';
import { CheckInRecord, CheckInType, Language } from '../types';
import { translations } from '../utils/translations';
import { Check, Clock } from 'lucide-react';

interface CalendarWidgetProps {
  checkIns: CheckInRecord[];
  lang: Language;
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date | null;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ checkIns, lang, onDateSelect, selectedDate }) => {
  const t = translations[lang];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Get total days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Helper to get status for a specific day
  const getDayStatus = (day: number) => {
    const dayRecords = checkIns.filter(c => {
      const d = new Date(c.timestamp);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });

    if (dayRecords.length === 0) return 'empty';

    // Check for the 3 required types
    const hasStart = dayRecords.some(r => r.type === CheckInType.START_SHIFT);
    const hasBreak = dayRecords.some(r => r.type === CheckInType.BREAK);
    const hasEnd = dayRecords.some(r => r.type === CheckInType.END_SHIFT);

    if (hasStart && hasBreak && hasEnd) return 'complete';
    return 'partial';
  };

  const isSelected = (day: number) => {
    return selectedDate && 
           selectedDate.getDate() === day && 
           selectedDate.getMonth() === month && 
           selectedDate.getFullYear() === year;
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between">
         <span className="flex items-center gap-2">
            <Clock className="text-emerald-500" size={20} /> {t.calendar}
         </span>
         <span className="text-sm font-normal text-slate-500 capitalize">
            {today.toLocaleString(lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US', { month: 'long' })}
         </span>
      </h3>
      
      <div className="grid grid-cols-7 gap-2 mb-2">
         {['S','M','T','W','T','F','S'].map((d, i) => (
             <div key={i} className="text-center text-xs font-bold text-slate-400">{d}</div>
         ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const status = getDayStatus(day);
          const isToday = day === today.getDate();
          const selected = isSelected(day);
          
          let bgClass = "bg-slate-50 border-slate-100 text-slate-400";
          let icon = null;

          if (status === 'complete') {
            bgClass = "bg-emerald-100 border-emerald-200 text-emerald-700";
            icon = <Check size={10} strokeWidth={4} />;
          } else if (status === 'partial') {
            bgClass = "bg-amber-50 border-amber-200 text-amber-600";
            icon = <div className="w-2 h-2 rounded-full bg-amber-500"></div>;
          }

          // Override if selected
          if (selected) {
             bgClass = "bg-slate-800 text-white border-slate-800 shadow-md transform scale-105";
          } else if (isToday) {
             bgClass += " ring-2 ring-emerald-500 ring-offset-1";
          }

          return (
            <button
              key={day} 
              onClick={() => {
                if (onDateSelect) {
                    const d = new Date(year, month, day);
                    onDateSelect(d);
                }
              }}
              disabled={!onDateSelect}
              className={`aspect-square rounded-lg border flex flex-col items-center justify-center text-sm font-medium transition-all relative ${bgClass} ${onDateSelect ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}
            >
              {day}
              {icon && !selected && <div className="absolute bottom-1">{icon}</div>}
            </button>
          );
        })}
      </div>

      <div className="flex gap-4 mt-6 text-xs text-slate-500 justify-center">
        <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded"></div> {t.complete}
        </div>
        <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-50 border border-amber-200 rounded"></div> {t.incomplete}
        </div>
      </div>
    </div>
  );
};