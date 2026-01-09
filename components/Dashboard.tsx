
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line
} from 'recharts';
import { UserStats } from '../types';
import { TrendingUp, Target, Award, BookOpen } from 'lucide-react';

interface DashboardProps {
  stats: UserStats;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  const knowledgeData = Object.entries(stats.knowledgeStats).map(([name, entry]) => {
    const data = entry as { total: number; correct: number };
    return {
      name: name.length > 6 ? name.substring(0, 6) + '..' : name,
      accuracy: Math.round((data.correct / (data.total || 1)) * 100),
      total: data.total
    };
  });

  const historyData = stats.history.slice(-7).map((h, i) => ({
    name: `T${i + 1}`,
    score: h.score,
    date: new Date(h.date).toLocaleDateString()
  }));

  const overallAccuracy = stats.totalAnswered > 0 
    ? Math.round((stats.correctCount / stats.totalAnswered) * 100) 
    : 0;

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: '刷题总数', value: stats.totalAnswered, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '综合正确率', value: `${overallAccuracy}%`, icon: Target, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '模考次数', value: stats.history.length, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: '全站排名', value: 'TOP 5%', icon: Award, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 md:gap-4 shadow-sm">
            <div className={`p-2 md:p-3 rounded-xl ${item.bg} ${item.color} shrink-0`}>
              <item.icon size={20} className="md:w-6 md:h-6" />
            </div>
            <div className="overflow-hidden">
              <p className="text-slate-400 text-[10px] md:text-sm font-black uppercase tracking-wider truncate">{item.label}</p>
              <h4 className="text-lg md:text-2xl font-black text-slate-800">{item.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {/* Knowledge Radar */}
        <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm md:text-lg font-black text-slate-800 mb-4 md:mb-6 uppercase tracking-widest">知识点覆盖度</h3>
          <div className="h-64 md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={knowledgeData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                <Radar
                  name="正确率"
                  dataKey="accuracy"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* History Line */}
        <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm md:text-lg font-black text-slate-800 mb-4 md:mb-6 uppercase tracking-widest">近期提分趋势</h3>
          <div className="h-64 md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Line 
                  type="step" 
                  dataKey="score" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Accuracy by Category Bar */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-sm md:text-lg font-black text-slate-800 mb-4 md:mb-6 uppercase tracking-widest">分项能力值</h3>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={knowledgeData} layout="vertical" margin={{ left: -10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f8fafc" />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={70} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="accuracy" fill="#10b981" radius={[0, 10, 10, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
