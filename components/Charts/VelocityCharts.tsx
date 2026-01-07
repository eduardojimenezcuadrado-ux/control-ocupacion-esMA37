import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Negocio, THEME } from '../../types';
import { Clock, CheckCircle } from 'lucide-react';

interface ChartProps {
  data: Negocio[];
}

type StageKey = 's_p' | 'p_i' | 'i_c' | 'c_d';
const STAGES: { key: StageKey; label: string }[] = [
  { key: 's_p', label: 'Situation → Pain' },
  { key: 'p_i', label: 'Pain → Impact' },
  { key: 'i_c', label: 'Impact → Critical' },
  { key: 'c_d', label: 'Critical → Decision' },
];

export const VelocityCharts: React.FC<ChartProps> = ({ data }) => {
  const [selectedStage, setSelectedStage] = useState<StageKey>('s_p');

  // Hero Metric: Time to Won (Created -> Decision Date for WON deals)
  const wonDeals = data.filter(d => d.estado === 'Won' && d.creado && d.fechaDecision);
  const timeToWon = wonDeals.length > 0 
      ? wonDeals.reduce((acc, curr) => {
          const diff = curr.fechaDecision!.getTime() - curr.creado!.getTime();
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
          return acc + (days > 0 ? days : 0);
      }, 0) / wonDeals.length
      : 0;

  const globalStats = STAGES.map(stage => {
      const validPoints = data.filter(d => d.velocidad[stage.key] !== null).map(d => d.velocidad[stage.key] as number);
      const sum = validPoints.reduce((a, b) => a + b, 0);
      const avg = validPoints.length ? sum / validPoints.length : 0;
      const min = validPoints.length ? Math.min(...validPoints) : 0;
      const max = validPoints.length ? Math.max(...validPoints) : 0;

      return {
          ...stage,
          avg: parseFloat(avg.toFixed(1)),
          min,
          max,
          count: validPoints.length
      };
  });

  const teamMap: Record<string, { total: number, count: number }> = {};
  data.forEach(d => {
      const val = d.velocidad[selectedStage];
      const team = d.equipoAsignado || 'Sin Asignar';
      if (val !== null) {
          if (!teamMap[team]) teamMap[team] = { total: 0, count: 0 };
          teamMap[team].total += val;
          teamMap[team].count++;
      }
  });

  const teamData = Object.keys(teamMap)
      .map(team => ({
          name: team,
          value: parseFloat((teamMap[team].total / teamMap[team].count).toFixed(1)),
          count: teamMap[team].count
      }))
      .sort((a,b) => b.value - a.value);

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Hero Section: Time To Won */}
      <div className="bg-gradient-to-r from-[#0F172A] to-[#1e1b4b] border border-[#FF7A1A]/30 rounded-xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
              <CheckCircle size={100} className="text-[#FF7A1A]" />
          </div>
          <p className="text-sm font-bold text-[#FF7A1A] uppercase tracking-wider mb-2">Ciclo de Venta Exitoso</p>
          <div className="flex items-baseline gap-4">
              <h2 className="text-5xl font-extrabold text-white">{timeToWon.toFixed(0)} <span className="text-2xl text-gray-400 font-medium">días</span></h2>
              <p className="text-gray-400">Media desde Creación hasta Decision (Won)</p>
          </div>
          <p className="text-xs text-gray-500 mt-2">Basado en {wonDeals.length} oportunidades ganadas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {globalStats.map((stat, idx) => (
           <div key={idx} className={`${THEME.colors.bgCard} p-4 rounded-xl border ${THEME.colors.border} relative group`}>
               <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{stat.label}</p>
               <div className="flex items-end justify-between">
                   <p className="text-2xl font-bold text-white">{stat.avg} <span className="text-sm font-normal text-gray-500">días</span></p>
                   <Clock className="text-[#FF7A1A] opacity-80" size={20} />
               </div>
               <div className="absolute top-full left-0 mt-2 w-full p-2 bg-gray-900 border border-gray-700 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none text-xs text-gray-300">
                   <p>Muestra: {stat.count} ops</p>
                   <p>Min: {stat.min}d / Max: {stat.max}d</p>
               </div>
           </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${THEME.colors.bgCard} ${THEME.colors.border} border p-6 rounded-xl shadow-lg min-h-[400px]`}>
          <h3 className={`text-lg font-bold mb-6 ${THEME.colors.textPrimary}`}>Velocidad Media por Tramo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={globalStats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis dataKey="label" tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={{ stroke: '#4b5563' }} />
              <YAxis tick={{ fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} />
              <Tooltip 
                 contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                 cursor={{fill: 'rgba(255,255,255,0.05)'}}
                 formatter={(value, name, props) => [`${value} días`, `Muestra: ${props.payload.count}`]}
              />
              <Bar dataKey="avg" fill={THEME.colors.chartDefault} radius={[4, 4, 0, 0]}>
                  {globalStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? THEME.colors.accent : '#6366f1'} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`${THEME.colors.bgCard} ${THEME.colors.border} border p-6 rounded-xl shadow-lg min-h-[400px]`}>
          <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-bold ${THEME.colors.textPrimary}`}>Velocidad por Equipo</h3>
              <select 
                value={selectedStage} 
                onChange={(e) => setSelectedStage(e.target.value as StageKey)}
                className="bg-[#050816] text-white text-xs border border-gray-700 rounded px-2 py-1 outline-none focus:border-[#FF7A1A]"
              >
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#374151" />
              <XAxis type="number" tick={{fontSize: 11, fill: '#9ca3af'}} axisLine={{ stroke: '#4b5563' }} />
              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fill: '#d1d5db'}} />
              <Tooltip 
                 contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                 cursor={{fill: 'rgba(255,255,255,0.05)'}}
                 formatter={(value, name, props) => [`${value} días`, `Muestra: ${props.payload.count}`]}
              />
              <Bar dataKey="value" fill={THEME.colors.chartDefault} radius={[0, 4, 4, 0]} name="Días medios" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};