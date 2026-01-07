import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Negocio, THEME } from '../../types';

interface ChartProps {
  data: Negocio[];
}

export const SpicedCharts: React.FC<ChartProps> = ({ data }) => {
  const total = data.length || 1;
  const counts = {
    Situation: data.filter(n => n.spiced.hasSituation).length,
    Pains: data.filter(n => n.spiced.hasPains).length,
    Impact: data.filter(n => n.spiced.hasImpact).length,
    CriticalEvent: data.filter(n => n.spiced.hasCriticalEvent).length,
    Decision: data.filter(n => n.spiced.hasDecision).length,
  };

  const chartData = [
    { name: 'Situation', value: Math.round((counts.Situation / total) * 100), raw: counts.Situation },
    { name: 'Pain', value: Math.round((counts.Pains / total) * 100), raw: counts.Pains },
    { name: 'Impact', value: Math.round((counts.Impact / total) * 100), raw: counts.Impact },
    { name: 'Crit. Event', value: Math.round((counts.CriticalEvent / total) * 100), raw: counts.CriticalEvent },
    { name: 'Decision', value: Math.round((counts.Decision / total) * 100), raw: counts.Decision },
  ];

  const criticalDeals = data
    .filter(n => n.spiced.score <= 2 && n.estado === 'Open')
    .sort((a,b) => (b.creado?.getTime() || 0) - (a.creado?.getTime() || 0)) // Newest first
    .slice(0, 10);

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className={`${THEME.colors.bgCard} ${THEME.colors.border} border p-6 rounded-xl shadow-lg`}>
        <h3 className={`text-lg font-bold mb-2 ${THEME.colors.textPrimary}`}>Completitud del Framework SPICED</h3>
        <p className={`text-sm mb-6 ${THEME.colors.textSecondary}`}>Porcentaje de negocios que tienen cada campo informado.</p>
        
        <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} />
                <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                    formatter={(value: number, name: string, props: any) => [`${value}% (${props.payload.raw} negocios)`, 'Completado']} 
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index > 2 ? THEME.colors.chartWon : '#818cf8'} />
                    ))}
                </Bar>
            </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className={`${THEME.colors.bgCard} ${THEME.colors.border} border p-6 rounded-xl shadow-lg`}>
        <h3 className={`text-lg font-bold mb-2 text-red-400`}>Negocios con Cualificación Crítica (Score ≤ 2)</h3>
        <p className={`text-sm mb-4 ${THEME.colors.textSecondary}`}>Oportunidades abiertas con muy poca información SPICED.</p>
        
        <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
                <thead className="bg-[#050816] uppercase tracking-wider text-xs font-semibold text-gray-400">
                    <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Cliente</th>
                        <th className="px-4 py-3">Oportunidad</th>
                        <th className="px-4 py-3">Fase</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3 rounded-tr-lg">Faltante</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {criticalDeals.map(deal => {
                         const missing = [];
                         if(!deal.spiced.hasSituation) missing.push('S');
                         if(!deal.spiced.hasPains) missing.push('P');
                         if(!deal.spiced.hasImpact) missing.push('I');
                         if(!deal.spiced.hasCriticalEvent) missing.push('CE');
                         if(!deal.spiced.hasDecision) missing.push('D');

                         return (
                            <tr key={deal.id} className="hover:bg-[#1e293b] transition-colors">
                                <td className="px-4 py-3 text-gray-200 font-medium">{deal.cliente}</td>
                                <td className="px-4 py-3 text-gray-400">{deal.oportunidad || deal.nombre}</td>
                                <td className="px-4 py-3 text-gray-400">{deal.fase}</td>
                                <td className="px-4 py-3 font-bold text-red-400">{deal.spiced.score}/5</td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{missing.join(', ')}</td>
                            </tr>
                         )
                    })}
                    {criticalDeals.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-500">¡Buen trabajo! No hay negocios críticos abiertos.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};