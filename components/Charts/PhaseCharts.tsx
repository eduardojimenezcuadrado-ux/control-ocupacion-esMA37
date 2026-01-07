import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from 'recharts';
import { THEME, PHASE_ORDER } from '../../types';

interface PhaseStats {
  name: string;
  count: number;
  avgSpiced: number;
  openCount: number;
}

interface ChartProps {
  data: PhaseStats[];
}

export const PhaseCharts: React.FC<ChartProps> = ({ data }) => {
  const funnelData = [...data].sort((a, b) => {
      const idxA = PHASE_ORDER.findIndex(p => a.name.includes(p.split('.')[0]));
      const idxB = PHASE_ORDER.findIndex(p => b.name.includes(p.split('.')[0]));
      
      const safeIdxA = idxA === -1 ? 999 : idxA;
      const safeIdxB = idxB === -1 ? 999 : idxB;
      
      return safeIdxA - safeIdxB;
  });

  const bottleneck = [...data].sort((a, b) => b.openCount - a.openCount)[0];
  
  const criticalSpiced = [...data]
     .filter(d => d.openCount >= 3)
     .sort((a, b) => a.avgSpiced - b.avgSpiced)[0];

  return (
    <div className="grid grid-cols-1 gap-6">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className={`${THEME.colors.bgCard} p-4 rounded-xl border ${THEME.colors.border} flex items-center justify-between`}>
             <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Mayor Embudo (Cuello de Botella)</p>
                <p className="text-xl font-bold text-white mt-1">{bottleneck ? bottleneck.name : '-'}</p>
                {bottleneck && <p className="text-xs text-[#FF7A1A]">{bottleneck.openCount} negocios activos aquí</p>}
             </div>
             <div className="bg-yellow-500/10 p-2 rounded-lg"><div className="w-6 h-6 bg-yellow-500 rounded-full" /></div>
         </div>
         <div className={`${THEME.colors.bgCard} p-4 rounded-xl border ${THEME.colors.border} flex items-center justify-between`}>
             <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Fase con peor Calidad SPICED</p>
                <p className="text-xl font-bold text-white mt-1">{criticalSpiced ? criticalSpiced.name : 'Sin datos suficientes'}</p>
                {criticalSpiced && <p className="text-xs text-red-400">Media: {criticalSpiced.avgSpiced.toFixed(1)}/5</p>}
             </div>
             <div className="bg-red-500/10 p-2 rounded-lg"><div className="w-6 h-6 bg-red-500 rounded-full" /></div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${THEME.colors.bgCard} ${THEME.colors.border} border p-6 rounded-xl shadow-lg min-h-[400px]`}>
          <h3 className={`text-lg font-bold mb-6 ${THEME.colors.textPrimary}`}>Calidad SPICED por Fase</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#374151" />
              <XAxis type="number" domain={[0, 5]} tick={{fontSize: 11, fill: '#9ca3af'}} axisLine={{ stroke: '#4b5563' }} />
              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fill: '#d1d5db'}} />
              <Tooltip 
                 contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                 cursor={{fill: 'rgba(255,255,255,0.05)'}}
                 formatter={(value: number) => [`${value.toFixed(1)} / 5`, 'SPICED Medio']}
              />
              <ReferenceLine x={2.5} stroke="red" strokeDasharray="3 3" />
              <Bar dataKey="avgSpiced" radius={[0, 4, 4, 0]} name="Score SPICED">
                 {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.avgSpiced < 2.5 ? '#ef4444' : '#10b981'} />
                 ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`${THEME.colors.bgCard} ${THEME.colors.border} border p-6 rounded-xl shadow-lg min-h-[400px]`}>
          <h3 className={`text-lg font-bold mb-6 ${THEME.colors.textPrimary}`}>Pipeline Funnel (Volumen)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis dataKey="name" tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={{ stroke: '#4b5563' }} interval={0} />
              <YAxis tick={{ fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} />
              <Tooltip 
                 contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                 cursor={{fill: 'rgba(255,255,255,0.05)'}}
              />
              <Bar dataKey="count" fill={THEME.colors.chartDefault} radius={[4, 4, 0, 0]} name="Total Negocios">
                  {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fillOpacity={1 - (index * 0.1)} fill={THEME.colors.accent} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};