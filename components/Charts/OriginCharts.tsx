import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Negocio, THEME } from '../../types';

interface ChartProps {
  data: Negocio[];
}

export const OriginCharts: React.FC<ChartProps> = ({ data }) => {
  const aggMap: Record<string, any> = {};

  data.forEach(n => {
    const origin = n.origen || 'Desconocido';
    if (!aggMap[origin]) {
      aggMap[origin] = { name: origin, Open: 0, Won: 0, Lost: 0 };
    }
    if (n.estado === 'Open' || n.estado === 'Won' || n.estado === 'Lost') {
      aggMap[origin][n.estado]++;
    } else {
        aggMap[origin]['Open']++;
    }
  });

  const chartData = Object.values(aggMap).sort((a,b) => (b.Open + b.Won + b.Lost) - (a.Open + a.Won + a.Lost));

  return (
    <div className={`${THEME.colors.bgCard} ${THEME.colors.border} border p-6 rounded-xl shadow-lg min-h-[400px]`}>
      <h3 className={`text-lg font-bold mb-6 ${THEME.colors.textPrimary}`}>Performance por Origen</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
          <XAxis dataKey="name" tick={{fontSize: 11, fill: '#9ca3af'}} axisLine={{ stroke: '#4b5563' }} />
          <YAxis tick={{ fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} />
          <Tooltip 
             contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
             cursor={{fill: 'rgba(255,255,255,0.05)'}}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar dataKey="Open" stackId="a" fill={THEME.colors.chartOpen} />
          <Bar dataKey="Won" stackId="a" fill={THEME.colors.chartWon} />
          <Bar dataKey="Lost" stackId="a" fill={THEME.colors.chartLost} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};