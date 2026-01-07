import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Negocio, THEME } from '../../types';
import { CheckCircle, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';

interface ChartProps {
  data: Negocio[];
}

export const QualityCharts: React.FC<ChartProps> = ({ data }) => {
  const total = data.length || 1;
  const clean = data.filter(d => d.inconsistencias.length === 0);
  const dirty = data.filter(d => d.inconsistencias.length > 0);
  
  const totalInconsistencies = dirty.reduce((acc, curr) => acc + curr.inconsistencias.length, 0);
  
  const teamIssuesMap: Record<string, number> = {};
  dirty.forEach(d => {
      const team = d.equipoAsignado || 'Sin Asignar';
      teamIssuesMap[team] = (teamIssuesMap[team] || 0) + d.inconsistencias.length;
  });
  
  const worstTeam = Object.keys(teamIssuesMap).sort((a,b) => teamIssuesMap[b] - teamIssuesMap[a])[0];

  const teamChartData = Object.keys(teamIssuesMap)
      .map(team => ({
          name: team,
          issues: teamIssuesMap[team],
          affectedDeals: dirty.filter(d => d.equipoAsignado === team).length
      }))
      .sort((a,b) => b.issues - a.issues);

  const typeMap: Record<string, number> = {};
  dirty.forEach(d => {
      d.inconsistencias.forEach(issue => {
          typeMap[issue] = (typeMap[issue] || 0) + 1;
      });
  });

  const typeChartData = Object.entries(typeMap)
      .map(([name, value]) => ({ 
          name: name.replace(/_/g, ' '), 
          value 
      }))
      .sort((a,b) => b.value - a.value);

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className={`${THEME.colors.bgCard} p-4 rounded-xl border ${THEME.colors.border} flex flex-col justify-between`}>
             <div className="flex justify-between items-start">
                 <p className="text-xs text-gray-500 uppercase font-bold">Sin Inconsistencias</p>
                 <CheckCircle className="text-green-500" size={18}/>
             </div>
             <div>
                <p className="text-2xl font-bold text-white">{clean.length}</p>
                <p className="text-xs text-green-400">{((clean.length/total)*100).toFixed(1)}% del total</p>
             </div>
         </div>

         <div className={`${THEME.colors.bgCard} p-4 rounded-xl border ${THEME.colors.border} flex flex-col justify-between`}>
             <div className="flex justify-between items-start">
                 <p className="text-xs text-gray-500 uppercase font-bold">Con Inconsistencias</p>
                 <AlertTriangle className="text-yellow-500" size={18}/>
             </div>
             <div>
                <p className="text-2xl font-bold text-white">{dirty.length}</p>
                <p className="text-xs text-yellow-400">{((dirty.length/total)*100).toFixed(1)}% del total</p>
             </div>
         </div>

         <div className={`${THEME.colors.bgCard} p-4 rounded-xl border ${THEME.colors.border} flex flex-col justify-between`}>
             <div className="flex justify-between items-start">
                 <p className="text-xs text-gray-500 uppercase font-bold">Inconsistencias Totales</p>
                 <ShieldAlert className="text-red-500" size={18}/>
             </div>
             <div>
                <p className="text-2xl font-bold text-white">{totalInconsistencies}</p>
                <p className="text-xs text-red-400">alertas detectadas</p>
             </div>
         </div>

         <div className={`${THEME.colors.bgCard} p-4 rounded-xl border ${THEME.colors.border} flex flex-col justify-between`}>
             <div className="flex justify-between items-start">
                 <p className="text-xs text-gray-500 uppercase font-bold">Equipo con peor calidad</p>
                 <XCircle className="text-gray-400" size={18}/>
             </div>
             <div>
                <p className="text-xl font-bold text-white truncate">{worstTeam || '-'}</p>
                <p className="text-xs text-gray-500">{teamIssuesMap[worstTeam] || 0} inconsistencias</p>
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${THEME.colors.bgCard} ${THEME.colors.border} border p-6 rounded-xl shadow-lg min-h-[400px]`}>
          <h3 className={`text-lg font-bold mb-6 ${THEME.colors.textPrimary}`}>Calidad por Equipo</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={teamChartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#374151" />
              <XAxis type="number" tick={{fontSize: 11, fill: '#9ca3af'}} axisLine={{ stroke: '#4b5563' }} />
              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fill: '#d1d5db'}} />
              <Tooltip 
                 contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                 cursor={{fill: 'rgba(255,255,255,0.05)'}}
                 formatter={(value, name, props) => [`${value} issues`, `${props.payload.affectedDeals} negocios afectados`]}
              />
              <Bar dataKey="issues" fill={THEME.colors.chartLost} radius={[0, 4, 4, 0]} name="Total Inconsistencias" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`${THEME.colors.bgCard} ${THEME.colors.border} border p-6 rounded-xl shadow-lg min-h-[400px] flex flex-col`}>
           <h3 className={`text-lg font-bold mb-4 ${THEME.colors.textPrimary}`}>Tipos de Inconsistencias (Top Recurrentes)</h3>
           <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
               {typeChartData.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                       <CheckCircle size={48} className="mb-2" />
                       <p>No se han detectado inconsistencias.</p>
                   </div>
               ) : (
                   <div className="space-y-5">
                       {typeChartData.map((item, idx) => {
                           const impactPercentage = ((item.value / totalInconsistencies) * 100).toFixed(1);
                           return (
                               <div key={idx}>
                                   <div className="flex justify-between text-sm mb-1">
                                       <span className="text-gray-200 font-medium text-xs uppercase tracking-wide">{item.name}</span>
                                       <span className="text-red-400 font-bold">{item.value}</span>
                                   </div>
                                   <div className="w-full bg-gray-800 rounded-full h-2">
                                       <div 
                                          className="bg-red-500 h-2 rounded-full transition-all duration-500" 
                                          style={{ width: `${Math.max(5, (item.value / totalInconsistencies) * 100)}%` }} 
                                       ></div>
                                   </div>
                                   <p className="text-[10px] text-gray-500 mt-1">
                                       Representa el {impactPercentage}% del total de errores detectados.
                                   </p>
                               </div>
                           );
                       })}
                   </div>
               )}
           </div>
        </div>
      </div>
    </div>
  );
};