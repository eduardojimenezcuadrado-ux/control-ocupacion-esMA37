import React from 'react';
import { AggregatedStats, THEME } from '../types';
import { TrendingUp, Users, Target, CheckCircle, Info } from 'lucide-react';

interface KpiBarProps {
  stats: AggregatedStats;
}

const KpiCard = ({ title, value, sub, icon: Icon, colorClass, tooltip }: any) => (
  <div className={`glass-card p-5 rounded-2xl flex items-start justify-between group relative overflow-hidden`}>
    <div className={`absolute inset-0 bg-gradient-to-br ${colorClass.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-2">
        <p className={`text-xs font-bold uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors`}>{title}</p>
        <div className="relative group/tooltip">
          <Info size={12} className="text-gray-600 cursor-help hover:text-gray-300 transition-colors" />
          <div className="absolute left-full top-0 ml-2 w-48 p-3 bg-black/90 backdrop-blur-md text-xs text-gray-200 rounded-lg shadow-2xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none z-50 border border-white/10">
            {tooltip}
          </div>
        </div>
      </div>
      <p className={`text-4xl font-extrabold text-white mt-1 tracking-tight`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>}
    </div>
    <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass.gradient} text-white shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
      <Icon size={24} />
    </div>
  </div>
);

export const KpiBar: React.FC<KpiBarProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <KpiCard
        title="Negocios Totales"
        value={stats.total}
        icon={Target}
        colorClass={{ gradient: 'from-blue-600 to-blue-400' }}
        tooltip="Número total de registros filtrados (Tipo = Document Set de Negocios)."
      />

      <KpiCard
        title="Pipeline Abierto"
        value={stats.open}
        icon={TrendingUp}
        colorClass={{ gradient: 'from-emerald-600 to-emerald-400' }}
        tooltip="Negocios actualmente en estado 'Open', 'En Progreso' o 'Negotiation'."
      />

      <KpiCard
        title="Win Rate"
        value={`${stats.winRate.toFixed(1)}%`}
        sub={`(${stats.won} ganados)`}
        icon={CheckCircle}
        colorClass={{ gradient: 'from-orange-600 to-orange-400' }}
        tooltip="Porcentaje de ganados sobre cerrados (Won / (Won + Lost))."
      />

      <KpiCard
        title="Calidad SPICED"
        value={`${stats.avgSpicedScore.toFixed(1)}/5`}
        icon={Users}
        colorClass={{ gradient: 'from-purple-600 to-purple-400' }}
        tooltip="Promedio de campos clave informados (Situation, Pain, Impact, Critical Event, Decision)."
      />
    </div>
  );
};