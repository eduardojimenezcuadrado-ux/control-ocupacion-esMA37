import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { THEME } from '../../types';

interface TeamStats {
  name: string;
  Open: number;
  Won: number;
  Lost: number;
  Total: number;
  WinRate: number;
}

interface ChartProps {
  data: TeamStats[];
}

export const TeamCharts: React.FC<ChartProps> = ({ data }) => {
  const byOpen = [...data].sort((a, b) => b.Open - a.Open);
  const byTotal = [...data].sort((a, b) => b.Total - a.Total);

  const maxPipeline = byOpen.length > 0 ? byOpen[0] : null;

  const bestWR = [...data]
    .filter(d => (d.Won + d.Lost) >= 3)
    .sort((a, b) => b.WinRate - a.WinRate)[0];

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${THEME.colors.bgCard} p-4 rounded-xl border ${THEME.colors.border} flex items-center justify-between`}>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Más Pipeline Abierto</p>
            <p className="text-xl font-bold text-white mt-1">{maxPipeline ? maxPipeline.name : '-'}</p>
            {maxPipeline && <p className="text-xs text-[#FF7A1A]">{maxPipeline.Open} negocios activos</p>}
          </div>
          <div className="bg-blue-500/10 p-2 rounded-lg"><div className="w-6 h-6 bg-blue-500 rounded-full" /></div>
        </div>
        <div className={`${THEME.colors.bgCard} p-4 rounded-xl border ${THEME.colors.border} flex items-center justify-between`}>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Mejor Win Rate (&gt;3 cerrados)</p>
            <p className="text-xl font-bold text-white mt-1">{bestWR ? bestWR.name : 'Insuficientes datos'}</p>
            {bestWR && <p className="text-xs text-green-400">{bestWR.WinRate.toFixed(1)}% éxito</p>}
          </div>
          <div className="bg-green-500/10 p-2 rounded-lg"><div className="w-6 h-6 bg-green-500 rounded-full" /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${THEME.colors.bgCard} ${THEME.colors.border} border p-6 rounded-xl shadow-lg min-h-[400px]`}>
          <h3 className={`text-lg font-bold mb-6 ${THEME.colors.textPrimary}`}>Negocios Abiertos por Equipo</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={byOpen} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#374151" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#d1d5db' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="Open" fill={THEME.colors.chartDefault} radius={[0, 4, 4, 0]} name="Pipeline Abierto" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`${THEME.colors.bgCard} ${THEME.colors.border} border p-6 rounded-xl shadow-lg min-h-[400px]`}>
          <h3 className={`text-lg font-bold mb-6 ${THEME.colors.textPrimary}`}>Cierres: Ganados vs Perdidos</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={byTotal}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} />
              <YAxis tick={{ fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Won" stackId="a" fill={THEME.colors.chartWon} name="Ganados" />
              <Bar dataKey="Lost" stackId="a" fill={THEME.colors.chartLost} name="Perdidos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};