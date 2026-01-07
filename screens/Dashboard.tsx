import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import {
    getPeriodOccupancy,
    getFTE,
    getOccupancyStatus,
    getStatusBadgeClass,
    formatPeriod
} from '../utils/calculations';
import {
    Users,
    Clock,
    AlertTriangle,
    TrendingUp,
    ChevronLeft,
    ChevronRight,
    Search,
    Zap,
    CheckCircle2,
    LineChart as LineChartIcon,
    Table as TableIcon,
    ArrowUpRight,
    Activity
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

const Dashboard: React.FC = () => {
    const {
        consultants,
        assignments,
        absences,
        settings
    } = useAppStore();

    const [date, setDate] = useState(new Date(2026, 0, 1));
    const [isWeekly, setIsWeekly] = useState(settings.defaultView === 'Semanal');
    const [includeTentative, setIncludeTentative] = useState(settings.includeTentativeByDefault);
    const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
    const [selectedForChart, setSelectedForChart] = useState<string[]>([]);

    const [filter, setFilter] = useState({
        onlyOverload: false,
        onlyBench: false,
        projectType: 'Todos',
        search: '',
    });

    const period = useMemo(() => formatPeriod(date, isWeekly), [date, isWeekly]);

    const changePeriod = (delta: number) => {
        const newDate = new Date(date);
        if (isWeekly) {
            newDate.setDate(newDate.getDate() + (delta * 7));
        } else {
            newDate.setMonth(newDate.getMonth() + delta);
        }
        setDate(newDate);
    };

    const filteredConsultants = useMemo(() => {
        return consultants.filter(c => {
            const matchSearch = c.name.toLowerCase().includes(filter.search.toLowerCase()) ||
                c.role.toLowerCase().includes(filter.search.toLowerCase());

            const occ = getPeriodOccupancy(c.id, assignments, absences, period.id, isWeekly, includeTentative);
            const status = getOccupancyStatus(occ.totalHours, settings, isWeekly);

            const matchOverload = !filter.onlyOverload || status === 'Sobrecarga';
            const matchBench = !filter.onlyBench || status === 'Bench';

            return matchSearch && matchOverload && matchBench;
        });
    }, [consultants, assignments, absences, period, isWeekly, includeTentative, filter, settings]);

    const stats = useMemo(() => {
        let totalHours = 0;
        let totalTentative = 0;
        let overloadCount = 0;
        let benchCount = 0;
        const capacity = isWeekly ? settings.standardWeeklyCapacity : settings.standardMonthlyCapacity;

        filteredConsultants.forEach(c => {
            const occ = getPeriodOccupancy(c.id, assignments, absences, period.id, isWeekly, includeTentative);
            const status = getOccupancyStatus(occ.totalHours, settings, isWeekly);

            totalHours += occ.confirmedHours + occ.absenceHours;
            totalTentative += occ.tentativeHours;
            if (status === 'Sobrecarga') overloadCount++;
            if (status === 'Bench') benchCount++;
        });

        const totalFTE = getFTE(totalHours + (includeTentative ? totalTentative : 0), capacity);
        const occupancyPct = (totalHours / (filteredConsultants.length * capacity)) * 100;
        const finalOccupancy = isNaN(occupancyPct) ? 0 : occupancyPct;

        return {
            totalHours,
            totalTentative,
            overloadCount,
            benchCount,
            totalFTE: isNaN(totalFTE) ? 0 : totalFTE,
            occupancyPct: finalOccupancy.toFixed(1),
        };
    }, [filteredConsultants, assignments, absences, period, isWeekly, includeTentative, settings]);

    const chartData = useMemo(() => {
        const points = isWeekly ? [1, 2, 3, 4, 5] : [-2, -1, 0, 1, 2, 3];
        return points.map(p => {
            let pDate = new Date(date);
            let periodLabel = '';
            let pId = '';

            if (isWeekly) {
                const formatted = formatPeriod(date, true, p);
                periodLabel = `Sem. ${p}`;
                pId = formatted.id;
            } else {
                pDate.setMonth(pDate.getMonth() + p);
                const formatted = formatPeriod(pDate, false);
                periodLabel = formatted.label.split(' ')[0];
                pId = formatted.id;
            }

            const data: any = { name: periodLabel };

            const consultantsToChart = selectedForChart.length > 0
                ? consultants.filter(c => selectedForChart.includes(c.id))
                : [null];

            consultantsToChart.forEach(c => {
                if (c) {
                    const occ = getPeriodOccupancy(c.id, assignments, absences, pId, isWeekly, includeTentative);
                    data[c.name] = occ.totalHours;
                }
            });

            let teamTotal = 0;
            consultants.forEach(c => {
                const occ = getPeriodOccupancy(c.id, assignments, absences, pId, isWeekly, includeTentative);
                teamTotal += occ.totalHours;
            });
            data['Media Equipo'] = teamTotal / consultants.length;

            return data;
        });
    }, [date, isWeekly, selectedForChart, consultants, assignments, absences, includeTentative]);

    const toggleChartSelect = (id: string) => {
        setSelectedForChart(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#f78c38] uppercase tracking-widest">
                        <Activity size={14} /> Analytics Dashboard
                    </div>
                    <h1>Resumen de Operaciones</h1>
                    <p className="text-gray-500 font-medium">Gestión inteligente de capacidad para el periodo {period.label}</p>
                </div>

                <div className="flex bg-gray-100/50 p-1 rounded-2xl border border-gray-200">
                    <button
                        onClick={() => setIsWeekly(false)}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${!isWeekly ? 'bg-[#252729] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setIsWeekly(true)}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${isWeekly ? 'bg-[#252729] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Semanal
                    </button>
                </div>
            </header>

            {/* Premium KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <KPICard label="Ocupación Global" value={`${stats.occupancyPct}%`} icon={TrendingUp} variant="orange" subtext={`${stats.totalHours}h confirmadas`} />
                <KPICard label="Capacidad FTE" value={stats.totalFTE.toFixed(1)} icon={Users} variant="dark" />
                <KPICard label="Consultores Libres" value={stats.benchCount} icon={CheckCircle2} variant="white" color="text-green-500" />
                <KPICard label="Puntos de Riesgo" value={stats.overloadCount} icon={AlertTriangle} variant="white" color="text-red-500" />
                <KPICard label="Carga Tentativa" value={`${stats.totalTentative}h`} icon={Zap} variant="white" color="text-blue-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    {/* Visual Controls */}
                    <div className="card glass border-0 flex flex-wrap items-center gap-6 py-4 shadow-premium">
                        <div className="flex items-center gap-3 px-2 py-1 bg-white/50 rounded-xl border border-white">
                            <button onClick={() => changePeriod(-1)} className="p-2 hover:bg-white hover:shadow-md rounded-lg text-gray-400 transition-all active:scale-95"><ChevronLeft size={18} /></button>
                            <span className="font-extrabold text-sm tracking-tighter text-gray-700 min-w-[120px] text-center uppercase">
                                {period.label}
                            </span>
                            <button onClick={() => changePeriod(1)} className="p-2 hover:bg-white hover:shadow-md rounded-lg text-gray-400 transition-all active:scale-95"><ChevronRight size={18} /></button>
                        </div>

                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                            <input
                                type="text"
                                placeholder="Filtrar por nombre o perfil..."
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-medium"
                                value={filter.search}
                                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-2 p-1 bg-gray-100/50 rounded-xl border border-gray-200">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <TableIcon size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('chart')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'chart' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <LineChartIcon size={18} />
                            </button>
                        </div>
                    </div>

                    {viewMode === 'chart' ? (
                        <div className="card lg:h-[500px] flex flex-col animate-in fade-in duration-300">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="mb-1 text-2xl font-black tracking-tight">Curva de Ocupación</h3>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Historico & Proyección</p>
                                </div>
                                <div className="text-[11px] font-black text-white bg-green-500 px-5 py-2 rounded-full uppercase tracking-widest shadow-lg shadow-green-500/20">Proyección Activa</div>
                            </div>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <filter id="shadow" height="130%">
                                                <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#f78c38" floodOpacity="0.2" />
                                            </filter>
                                        </defs>
                                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            fontSize={11}
                                            fontWeight={700}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={15}
                                            stroke="#94a3b8"
                                        />
                                        <YAxis
                                            fontSize={11}
                                            fontWeight={600}
                                            tickLine={false}
                                            axisLine={false}
                                            stroke="#94a3b8"
                                            dx={-10}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                                borderRadius: '16px',
                                                border: 'none',
                                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                                padding: '16px',
                                                backdropFilter: 'blur(12px)',
                                                fontSize: '12px'
                                            }}
                                            itemStyle={{ fontWeight: 700, paddingBottom: '4px' }}
                                            cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                                        />
                                        <Legend
                                            verticalAlign="top"
                                            align="right"
                                            iconType="circle"
                                            wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="Media Equipo"
                                            stroke="#252729"
                                            strokeWidth={4}
                                            dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#252729' }}
                                        />
                                        {selectedForChart.map((id, idx) => {
                                            const c = consultants.find(con => con.id === id);
                                            if (!c) return null;
                                            const colors = ['#f78c38', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];
                                            return (
                                                <Line
                                                    key={id}
                                                    type="monotone"
                                                    dataKey={c.name}
                                                    stroke={colors[idx % colors.length]}
                                                    strokeWidth={3}
                                                    dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
                                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                                    filter={idx === 0 ? "url(#shadow)" : undefined}
                                                />
                                            );
                                        })}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : (
                        <div className="table-container border-0 shadow-premium animate-in fade-in duration-300">
                            <table>
                                <thead>
                                    <tr>
                                        <th className="w-12 text-center"></th>
                                        <th className="pl-6">Consultor</th>
                                        <th className="text-center">Confirmadas</th>
                                        <th className="text-center">Total</th>
                                        <th className="text-center">FTE</th>
                                        <th>Estado</th>
                                        <th className="text-right pr-6"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredConsultants.map(c => {
                                        const occ = getPeriodOccupancy(c.id, assignments, absences, period.id, isWeekly, true);
                                        const status = getOccupancyStatus(includeTentative ? occ.totalHours : occ.confirmedHours + occ.absenceHours, settings, isWeekly);
                                        const capacity = isWeekly ? settings.standardWeeklyCapacity : settings.standardMonthlyCapacity;
                                        const fte = getFTE(includeTentative ? occ.totalHours : occ.confirmedHours + occ.absenceHours, capacity);

                                        return (
                                            <tr key={c.id} className="group hover:bg-gray-50/50 transition-colors">
                                                <td className="text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedForChart.includes(c.id)}
                                                        onChange={() => toggleChartSelect(c.id)}
                                                        className="w-4 h-4 rounded-md border-gray-300 text-[#f78c38] focus:ring-orange-500/20 transition-all cursor-pointer"
                                                    />
                                                </td>
                                                <td className="pl-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xs font-black text-gray-400 uppercase tracking-tighter border border-gray-100 shadow-sm group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 transition-all">
                                                            {c.name.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-800 tracking-tight text-sm">{c.name}</div>
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{c.role}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-center font-bold text-gray-700">{occ.confirmedHours}h</td>
                                                <td className="text-center">
                                                    <span className="font-extrabold text-[#252729] text-lg">{includeTentative ? occ.totalHours : occ.confirmedHours + occ.absenceHours}</span>
                                                    <span className="text-[10px] font-bold text-gray-300 ml-1">/ {capacity}h</span>
                                                </td>
                                                <td className="text-center">
                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-xs font-bold ${fte > 1.1 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                                                        {fte.toFixed(1)} <ArrowUpRight size={10} className="text-inherit opacity-50" />
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${getStatusBadgeClass(status)}`}>
                                                        {status}
                                                    </span>
                                                </td>
                                                <td className="text-right pr-6">
                                                    <ChevronRight size={18} className="text-gray-200 group-hover:text-orange-500 transition-all translate-x-0 group-hover:translate-x-1" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-4 space-y-8">
                    {/* IA Recommendations Visual Polish */}
                    <div className="card relative overflow-hidden bg-[#252729] text-white border-0 shadow-2xl shadow-orange-500/10 group">
                        <div className="absolute -top-12 -right-12 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                            <Zap size={180} />
                        </div>
                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-500 rounded-xl text-white shadow-lg shadow-orange-500/20">
                                    <Zap size={24} fill="currentColor" />
                                </div>
                                <div>
                                    <h3 className="mb-0 text-white font-extrabold">Copilot AI</h3>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Motor de Optimización</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-3 hover:bg-white/10 transition-all cursor-pointer group/item">
                                    <div className="flex items-start justify-between">
                                        <p className="text-sm font-bold leading-snug pr-4">Liberar 15h de 'Proyecto X' en Marzo</p>
                                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                                    </div>
                                    <div className="text-[11px] font-medium text-gray-400 flex items-center gap-2">
                                        <TrendingUp size={12} className="text-green-500" /> Impacto: Mejora Bench en un 12%
                                    </div>
                                    <button className="text-[10px] font-black uppercase tracking-widest text-[#f78c38] group-hover/item:text-orange-300 transition-colors flex items-center gap-1">
                                        Aplicar Cambio <ChevronRight size={10} />
                                    </button>
                                </div>
                                <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-3 hover:bg-white/10 transition-all cursor-pointer group/item">
                                    <div className="flex items-start justify-between">
                                        <p className="text-sm font-bold leading-snug pr-4">Elena Sánchez finaliza preventa pronto</p>
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    </div>
                                    <div className="text-[11px] font-medium text-gray-400 flex items-center gap-2">
                                        <Clock size={12} className="text-blue-400" /> Disponibilidad: Semana 4 Enero
                                    </div>
                                    <button className="text-[10px] font-black uppercase tracking-widest text-[#f78c38] group-hover/item:text-orange-300 transition-colors flex items-center gap-1">
                                        Ver Asignaciones <ChevronRight size={10} />
                                    </button>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Engine v2.4 Active</span>
                                <div className="flex -space-x-3 hover:space-x-1 transition-all">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-[#252729] bg-gray-800 flex items-center justify-center text-[10px] font-bold shadow-lg">
                                            AI
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="mb-0">Filtros de Estado</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Vista Rapida</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => setIncludeTentative(!includeTentative)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${includeTentative ? 'bg-orange-50 border-orange-500/20 text-orange-700' : 'bg-gray-50/50 border-transparent text-gray-400 hover:bg-white hover:border-gray-100'}`}
                            >
                                <span className="text-xs font-black uppercase tracking-widest group-hover:text-primary transition-colors">Incluir Tentativas</span>
                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${includeTentative ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 group-hover:border-gray-300'}`}>
                                    {includeTentative && <CheckCircle2 size={12} strokeWidth={4} />}
                                </div>
                            </button>

                            <button
                                onClick={() => setFilter({ ...filter, onlyOverload: !filter.onlyOverload, onlyBench: false })}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${filter.onlyOverload ? 'bg-red-50 border-red-500/20 text-red-700' : 'bg-gray-50/50 border-transparent text-gray-400 hover:bg-white hover:border-gray-100'}`}
                            >
                                <span className="text-xs font-black uppercase tracking-widest group-hover:text-primary transition-colors">Ver Sobrecarga</span>
                                <AlertTriangle size={16} className={filter.onlyOverload ? 'text-red-500' : 'text-gray-300 group-hover:text-red-400'} />
                            </button>

                            <button
                                onClick={() => setFilter({ ...filter, onlyBench: !filter.onlyBench, onlyOverload: false })}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${filter.onlyBench ? 'bg-blue-50 border-blue-500/20 text-blue-700' : 'bg-gray-50/50 border-transparent text-gray-400 hover:bg-white hover:border-gray-100'}`}
                            >
                                <span className="text-xs font-black uppercase tracking-widest group-hover:text-primary transition-colors">Ver Bench</span>
                                <Clock size={16} className={filter.onlyBench ? 'text-blue-500' : 'text-gray-300 group-hover:text-blue-400'} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface KPICardProps {
    label: string;
    value: string | number;
    icon: any;
    variant: 'orange' | 'dark' | 'white';
    subtext?: string;
    color?: string;
}

const KPICard = ({ label, value, icon: Icon, variant, subtext, color }: KPICardProps) => {
    const variants = {
        orange: "card-orange shadow-xl shadow-orange-500/20",
        dark: "card-dark shadow-xl shadow-black/20",
        white: "bg-white text-gray-900",
    };

    return (
        <div className={`card p-10 flex flex-col justify-between group transition-all duration-500 hover:scale-[1.02] ${variants[variant]}`}>
            <div className="flex items-center justify-between mb-6 opacity-80 group-hover:opacity-100 transition-all">
                <span className={`text-xs font-black uppercase tracking-widest ${variant === 'white' ? 'text-gray-400' : 'text-white/70'}`}>{label}</span>
                <Icon size={24} className={color || (variant === 'white' ? 'text-gray-400' : 'text-white/80')} />
            </div>
            <div className="space-y-1">
                <div className={`text-5xl font-black tracking-tighter ${variant === 'white' ? 'text-gray-900' : 'text-white'}`}>{value}</div>
                {subtext && <div className={`text-xs font-bold uppercase tracking-wide mt-2 ${variant === 'white' ? 'text-gray-500' : 'text-white/60'}`}>{subtext}</div>}
            </div>
        </div>
    );
};

export default Dashboard;