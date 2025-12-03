import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { CheckInRecord } from '../types';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface TechRadarChartProps {
  checkIns: CheckInRecord[];
  lang: Language;
  compact?: boolean;
}

export const TechRadarChart: React.FC<TechRadarChartProps> = ({ checkIns, lang, compact = false }) => {
  const t = translations[lang];
  
  // Calculate averages from last 5 check-ins
  const recentRecords = checkIns.filter(r => r.surveyAnswers).slice(0, 5);
  
  if (recentRecords.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-xs">No data available</div>;
  }

  const avgStats = recentRecords.reduce((acc, curr) => {
    if (!curr.surveyAnswers) return acc;
    return {
      sleep: acc.sleep + (curr.surveyAnswers.sleepQuality * 20), // 1-5 to 100
      energy: acc.energy + (curr.surveyAnswers.energyLevel * 10), // 0-10 to 100
      focus: acc.focus + (curr.surveyAnswers.focusLevel * 10), // 0-10 to 100
      motivation: acc.motivation + (curr.surveyAnswers.motivationLevel * 10), // 0-10 to 100
      safety: acc.safety + (curr.surveyAnswers.feelingSafe * 10), // 0-10 to 100
    };
  }, { sleep: 0, energy: 0, focus: 0, motivation: 0, safety: 0 });

  const count = recentRecords.length;
  
  const data = [
    { subject: t.energyLvl, A: Math.round(avgStats.energy / count), fullMark: 100 },
    { subject: t.focusLvl, A: Math.round(avgStats.focus / count), fullMark: 100 },
    { subject: t.motivationLvl, A: Math.round(avgStats.motivation / count), fullMark: 100 },
    { subject: t.safeLvl, A: Math.round(avgStats.safety / count), fullMark: 100 },
    { subject: t.sleepQ.split(' ')[0], A: Math.round(avgStats.sleep / count), fullMark: 100 },
  ];

  // Adjust visualization based on compact mode (cards) vs full mode (modal)
  // Reduced radius for compact mode to prevent clipping labels
  const outerRadius = compact ? "50%" : "70%"; 
  const fontSize = compact ? 9 : 12;
  const margin = compact ? { top: 0, right: 5, bottom: 0, left: 5 } : { top: 5, right: 30, bottom: 5, left: 30 };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius={outerRadius} data={data} margin={margin}>
          <PolarGrid />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#475569', fontSize: fontSize, fontWeight: 'bold' }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Score"
            dataKey="A"
            stroke="#10b981"
            strokeWidth={compact ? 2 : 3}
            fill="#10b981"
            fillOpacity={0.4}
          />
          <Tooltip 
            formatter={(value: number) => [`${value}%`, 'Score']}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};