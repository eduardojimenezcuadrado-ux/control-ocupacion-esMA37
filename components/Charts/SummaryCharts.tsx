import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Negocio, THEME, PHASE_ORDER } from '../../types';

interface ChartProps {
  data: Negocio[];
}

export const SummaryCharts: React.FC<ChartProps> = ({ data }) => {
  const estadoData = data.reduce((acc: any, curr) => {
    const existing = acc.find((item: any) => item.name === curr.estado);
    if (existing) existing.value++;
    else acc.push({ name: curr.estado, value: 1 });
    return acc;
  }, []);

  const faseMap = data.reduce((acc: any, curr) => {
    acc[curr.fase] = (acc[curr.fase] || 0) + 1;
    return acc;
  }, {});

  const faseData = Object.keys(faseMap)
    .map(key => ({ name: key, value: faseMap[key] }))
    .sort((a, b) => {
        const indexA = PHASE_ORDER.findIndex(p => a.name.includes(p.split('.')[0])); 
        const indexB = PHASE_ORDER.findIndex(p => b.name.includes(p.split('.')[0]));
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.name.localeCompare(b.name);
    });

  const getStatusColor = (status: string) => {
    if (status === 'Won') return THEME.colors.chartWon;
    if (status === 'Open') return THEME.colors.chartOpen;
    if (status === 'Lost') return THEME.colors.chartLost;
    return THEME.colors.chartDefault;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className={`${THEME.colors.bgCard} ${THEME.colors.border} border p-4 rounded-xl shadow-lg min-h-[350px]`}>
        <h3 className={`text-lg font-bold mb-4 ${THEME.colors.textPrimary}`}>Distribución por Estado</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={estadoData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {estadoData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} 
                itemStyle={{ color: '#f3f4f6' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }}/>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className={`${THEME.colors.bgCard} ${THEME.colors.border} border p-4 rounded-xl shadow-lg min-h-[350px]`}>
        <h3 className={`text-lg font-bold mb-4 ${THEME.colors.textPrimary}`}>Funnel de Fases</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={faseData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#374151"/>
            <XAxis type="number" stroke="#9ca3af" fontSize={12} />
            <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11, fill: '#d1d5db'}} interval={0} />
            <Tooltip 
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
            />
            <Bar dataKey="value" fill={THEME.colors.chartDefault} radius={[0, 4, 4, 0]}>
                 {faseData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={THEME.colors.chartDefault} fillOpacity={0.8 + (index * 0.05)} />
                 ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};