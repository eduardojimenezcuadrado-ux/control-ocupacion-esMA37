import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
    Activity,
    Loader2,
    RefreshCw,
    Key,
    Lightbulb,
    Target
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell
} from 'recharts';
import { generateRecommendations, AIRecommendation } from '../services/geminiService';

const Dashboard: React.FC = () => {
    const {
        consultants,
        projects,
        assignments,
        absences,
        settings
    } = useAppStore();

    const [date, setDate] = useState(new Date(2026, 0, 1));
    const [isWeekly, setIsWeekly] = useState(settings.defaultView === 'Semanal');
    const [includeTentative, setIncludeTentative] = useState(settings.includeTentativeByDefault);
    const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
    const [selectedForChart, setSelectedForChart] = useState<string[]>([]);

    // AI Recommendations state
    const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const [filter, setFilter] = useState({
        onlyOverload: false,
        onlyAvailable: false,
        projectType: 'Todos',
        search: '',
    });

    const period = useMemo(() => formatPeriod(date, isWeekly), [date, isWeekly]);

    // Fetch AI recommendations when period changes or on demand
    const fetchRecommendations = useCallback(async () => {
        if (!settings.geminiApiKey) {
            setRecommendations([]);
            return;
        }

        setIsLoadingAI(true);
        setAiError(null);

        try {
            const appState = { consultants, projects, assignments, absences, settings };
            const recs = await generateRecommendations(settings.geminiApiKey, appState, period.id, isWeekly);
            setRecommendations(recs);
        } catch (error: any) {
            console.error('Error fetching AI recommendations:', error);
            setAiError(error.message || 'Error al obtener recomendaciones');
            setRecommendations([]);
        } finally {
            setIsLoadingAI(false);
        }
    }, [settings.geminiApiKey, consultants, projects, assignments, absences, settings, period, isWeekly]);

    // Auto-fetch recommendations when API key is configured and period changes
    useEffect(() => {
        if (settings.geminiApiKey) {
            fetchRecommendations();
        }
    }, [period, settings.geminiApiKey]);

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
            const matchAvailable = !filter.onlyAvailable || status === 'Disponible';

            return matchSearch && matchOverload && matchAvailable;
        });
    }, [consultants, assignments, absences, period, isWeekly, includeTentative, filter, settings]);

    const stats = useMemo(() => {
        let totalHours = 0;
        let totalTentative = 0;
        let overloadCount = 0;
        let availableCount = 0;
        const capacity = isWeekly ? settings.standardWeeklyCapacity : settings.standardMonthlyCapacity;

        consultants.filter(c => c.active).forEach(c => {
            const occ = getPeriodOccupancy(c.id, assignments, absences, period.id, isWeekly, includeTentative);
            const status = getOccupancyStatus(occ.totalHours, settings, isWeekly);

            totalHours += occ.confirmedHours + occ.absenceHours;
            totalTentative += occ.tentativeHours;
            if (status === 'Sobrecarga') overloadCount++;
            if (status === 'Disponible') availableCount++;
        });

        const totalFTE = getFTE(totalHours + (includeTentative ? totalTentative : 0), capacity);
        const occupancyPct = (totalHours / (filteredConsultants.length * capacity)) * 100;
        const finalOccupancy = isNaN(occupancyPct) ? 0 : occupancyPct;

        return {
            totalHours,
            totalTentative,
            overloadCount,
            availableCount,
            totalFTE: isNaN(totalFTE) ? 0 : totalFTE,
            occupancyPct: finalOccupancy.toFixed(1),
        };
    }, [filteredConsultants, assignments, absences, period, isWeekly, includeTentative, settings]);

    const teamLoadData = useMemo(() => {
        return consultants.filter(c => c.active).map(c => {
            const occ = getPeriodOccupancy(c.id, assignments, absences, period.id, isWeekly, includeTentative);
            const capacity = isWeekly ? settings.standardWeeklyCapacity : settings.standardMonthlyCapacity;
            return {
                name: c.name.split(' ')[0],
                fullName: c.name,
                dedication: occ.totalHours,
                capacity
            };
        }).sort((a, b) => b.dedication - a.dedication);
    }, [consultants, assignments, absences, period, isWeekly, includeTentative, settings]);

    const projectDistribution = useMemo(() => {
        const dist: Record<string, number> = {};
        assignments
            .filter(a => a.period === period.id || a.period.startsWith(`${period.id}-W`))
            .forEach(a => {
                const p = projects.find(proj => proj.id === a.projectId);
                const type = p?.type || 'Interno';
                dist[type] = (dist[type] || 0) + a.hours;
            });
        return Object.entries(dist).map(([name, value]) => ({ name, value }));
    }, [assignments, period, projects]);

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
                <KPICard
                    label="Ocupación Global"
                    value={`${stats.occupancyPct}%`}
                    icon={TrendingUp}
                    variant="orange"
                    subtext={`${stats.totalHours}h confirmadas`}
                    tooltip="Suma de horas confirmadas + ausencias frente a la capacidad total del equipo activo."
                />
                <KPICard
                    label="Capacidad FTE"
                    value={stats.totalFTE.toFixed(1)}
                    icon={Users}
                    variant="dark"
                    tooltip="Full-Time Equivalent: Horas totales divididas por la capacidad estándar (160h/mes o 40h/sem)."
                />
                <KPICard
                    label="Consultores Disponibles"
                    value={stats.availableCount}
                    icon={CheckCircle2}
                    variant="white"
                    color="text-green-500"
                    tooltip="Número de consultores con carga inferior al umbral de disponibilidad configurado."
                />
                <KPICard
                    label="Puntos de Riesgo"
                    value={stats.overloadCount}
                    icon={AlertTriangle}
                    variant="white"
                    color="text-red-500"
                    tooltip="Número de consultores que superan el 100% de su capacidad para este periodo."
                />
                <KPICard
                    label="Carga Tentativa"
                    value={`${stats.totalTentative}h`}
                    icon={Zap}
                    variant="white"
                    color="text-blue-500"
                    tooltip="Total de horas en proyectos con estado 'Tentativo' (no confirmados aún)."
                />
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
                                    <h3 className="mb-1 text-2xl font-black tracking-tight">Carga por Consultor</h3>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Distribución de horas en el equipo</p>
                                </div>
                                <div className="text-[10px] font-black text-white bg-[#f78c38] px-5 py-2 rounded-full uppercase tracking-widest shadow-lg shadow-orange-500/20">Mapa de Calor</div>
                            </div>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={teamLoadData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            fontSize={10}
                                            fontWeight={800}
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
                                            cursor={{ fill: '#f8fafc' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    const isOverloaded = data.dedication > data.capacity;
                                                    return (
                                                        <div className="bg-[#252729] text-white p-4 rounded-2xl shadow-2xl border-0">
                                                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">{data.name}</p>
                                                            <p className="text-xl font-black">{data.dedication}h <span className="text-xs text-gray-500 font-bold">/ {data.capacity}h</span></p>
                                                            <div className={`mt-2 px-2 py-1 rounded-lg text-[9px] font-black uppercase text-center ${isOverloaded ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                                {isOverloaded ? 'Sobrecarga' : 'Capacidad OK'}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="dedication" radius={[8, 8, 0, 0]}>
                                            {teamLoadData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.dedication > entry.capacity ? '#ef4444' : entry.dedication === 0 ? '#f1f5f9' : '#f78c38'}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : (
                        <div className="table-container border-0 shadow-premium animate-in fade-in duration-300">
                            <table>
                                <thead>
                                    <tr>
                                        <th className="w-12 text-center"></th>
                                        <th className="pl-6">Consultor / Especialidad</th>
                                        <th className="text-center">Confirmadas</th>
                                        <th className="text-center">Dedicación</th>
                                        <th className="text-center">FTE</th>
                                        <th>Estado Actual</th>
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
                    {/* IA Recommendations - Dynamic */}
                    <div className="card relative overflow-hidden bg-[#252729] text-white border-0 shadow-2xl shadow-orange-500/10 group">
                        <div className="absolute -top-12 -right-12 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                            <Zap size={180} />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-orange-500 rounded-xl text-white shadow-lg shadow-orange-500/20">
                                        <Zap size={24} fill="currentColor" />
                                    </div>
                                    <div>
                                        <h3 className="mb-0 text-white font-extrabold">Copilot AI</h3>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Motor de Optimización</p>
                                    </div>
                                </div>
                                {settings.geminiApiKey && (
                                    <button
                                        onClick={fetchRecommendations}
                                        disabled={isLoadingAI}
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all disabled:opacity-50"
                                        title="Actualizar recomendaciones"
                                    >
                                        <RefreshCw size={16} className={isLoadingAI ? 'animate-spin' : ''} />
                                    </button>
                                )}
                            </div>

                            {/* No API Key State */}
                            {!settings.geminiApiKey && (
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-center space-y-4">
                                    <div className="w-12 h-12 mx-auto bg-gray-700 rounded-xl flex items-center justify-center">
                                        <Key size={24} className="text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-300">Módulo inoperativo</p>
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            Introduce tu API Key de Gemini en Ajustes para activar las recomendaciones inteligentes.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Loading State */}
                            {settings.geminiApiKey && isLoadingAI && (
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-center space-y-3">
                                    <Loader2 size={32} className="animate-spin mx-auto text-orange-500" />
                                    <p className="text-sm font-medium text-gray-400">Analizando datos de ocupación...</p>
                                </div>
                            )}

                            {/* Error State */}
                            {settings.geminiApiKey && !isLoadingAI && aiError && (
                                <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-center space-y-2">
                                    <AlertTriangle size={24} className="mx-auto text-red-400" />
                                    <p className="text-xs font-medium text-red-300">{aiError}</p>
                                    <button
                                        onClick={fetchRecommendations}
                                        className="text-[10px] font-black uppercase tracking-widest text-orange-400 hover:text-orange-300"
                                    >
                                        Reintentar
                                    </button>
                                </div>
                            )}

                            {/* Recommendations List */}
                            {settings.geminiApiKey && !isLoadingAI && !aiError && recommendations.length > 0 && (
                                <div className="space-y-3">
                                    {recommendations.map((rec, index) => (
                                        <div key={rec.id || index} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2 hover:bg-white/10 transition-all group/item">
                                            <div className="flex items-start justify-between">
                                                <p className="text-sm font-bold leading-snug pr-4">{rec.title}</p>
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${rec.type === 'alert' ? 'bg-red-500' :
                                                    rec.type === 'opportunity' ? 'bg-blue-500' : 'bg-orange-500'
                                                    }`} />
                                            </div>
                                            <p className="text-[11px] font-medium text-gray-400">{rec.description}</p>
                                            <div className="text-[11px] font-medium text-gray-500 flex items-center gap-2">
                                                {rec.type === 'alert' ? <AlertTriangle size={12} className="text-red-400" /> :
                                                    rec.type === 'opportunity' ? <Lightbulb size={12} className="text-blue-400" /> :
                                                        <Target size={12} className="text-green-400" />}
                                                {rec.impact}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Empty State (API configured but no recommendations) */}
                            {settings.geminiApiKey && !isLoadingAI && !aiError && recommendations.length === 0 && (
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-center space-y-3">
                                    <CheckCircle2 size={32} className="mx-auto text-green-500" />
                                    <p className="text-sm font-medium text-gray-300">Sin recomendaciones pendientes</p>
                                    <p className="text-[11px] text-gray-500">La ocupación del equipo está optimizada.</p>
                                </div>
                            )}

                            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    {settings.geminiApiKey ? 'Gemini AI Activo' : 'Sin configurar'}
                                </span>
                                <div className={`w-2 h-2 rounded-full ${settings.geminiApiKey ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                            </div>
                        </div>
                    </div>

                    <div className="card space-y-6">
                        <h3 className="mb-0 text-lg flex items-center gap-2">
                            Distribución Proyectos
                        </h3>
                        <div className="space-y-3">
                            {projectDistribution.map(item => (
                                <div key={item.name} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${item.name === 'Cliente' ? 'bg-blue-500' :
                                            item.name === 'Tentativo' ? 'bg-orange-500' : 'bg-gray-500'
                                            }`}>
                                            <Target size={14} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-gray-800 uppercase tracking-tight">{item.name}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{Math.round((item.value / stats.totalHours) * 100 || 0)}% del total</div>
                                        </div>
                                    </div>
                                    <div className="text-lg font-black text-gray-700">{item.value}h</div>
                                </div>
                            ))}
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
                                onClick={() => setFilter({ ...filter, onlyOverload: !filter.onlyOverload, onlyAvailable: false })}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${filter.onlyOverload ? 'bg-red-50 border-red-500/20 text-red-700' : 'bg-gray-50/50 border-transparent text-gray-400 hover:bg-white hover:border-gray-100'}`}
                            >
                                <span className="text-xs font-black uppercase tracking-widest group-hover:text-primary transition-colors">Ver Sobrecarga</span>
                                <AlertTriangle size={16} className={filter.onlyOverload ? 'text-red-500' : 'text-gray-300 group-hover:text-red-400'} />
                            </button>

                            <button
                                onClick={setFilter.bind(null, { ...filter, onlyAvailable: !filter.onlyAvailable, onlyOverload: false })}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${filter.onlyAvailable ? 'bg-blue-50 border-blue-500/20 text-blue-700' : 'bg-gray-50/50 border-transparent text-gray-400 hover:bg-white hover:border-gray-100'}`}
                            >
                                <span className="text-xs font-black uppercase tracking-widest group-hover:text-primary transition-colors">Ver Disponibles</span>
                                <Clock size={16} className={filter.onlyAvailable ? 'text-blue-500' : 'text-gray-300 group-hover:text-blue-400'} />
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
    tooltip?: string;
}

const KPICard = ({ label, value, icon: Icon, variant, subtext, color, tooltip }: KPICardProps) => {
    const variants = {
        orange: "card-orange shadow-xl shadow-orange-500/20",
        dark: "card-dark shadow-xl shadow-black/20",
        white: "bg-white text-gray-900 border-gray-100",
    };

    return (
        <div
            className={`card p-10 flex flex-col justify-between group transition-all duration-500 hover:scale-[1.02] ${variants[variant]}`}
            title={tooltip}
        >
            <div className="flex items-center justify-between mb-6 opacity-80 group-hover:opacity-100 transition-all">
                <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${variant === 'white' ? 'text-gray-400' : 'text-white/70'}`}>{label}</span>
                    {tooltip && <div className="h-0.5 w-4 bg-current opacity-20 mt-1" />}
                </div>
                <Icon size={24} className={color || (variant === 'white' ? 'text-gray-400' : 'text-white/80')} />
            </div>
            <div className="space-y-1">
                <div className={`text-5xl font-black tracking-tighter ${variant === 'white' ? 'text-gray-900' : 'text-white'}`}>{value}</div>
                {subtext && <div className={`text-[10px] font-black uppercase tracking-wide mt-2 ${variant === 'white' ? 'text-gray-500' : 'text-white/60'}`}>{subtext}</div>}
            </div>
        </div>
    );
};

export default Dashboard;