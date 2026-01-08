import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import {
    Plus,
    Trash2,
    Copy,
    Download,
    Trash,
    ChevronLeft,
    ChevronRight,
    Search,
    Maximize2,
    Clock,
    User,
    Calendar,
    CheckCircle2,
    AlertCircle,
    X,
    Filter,
    LayoutGrid,
    MoreHorizontal,
    Info
} from 'lucide-react';
import { Assignment, Project, Absence } from '../types';
import {
    formatPeriod,
    getPeriodOccupancy,
    getOccupancyStatus,
    getStatusBadgeClass
} from '../utils/calculations';
import { createAssignmentInSharePoint, deleteAssignmentInSharePoint, updateAssignmentInSharePoint, isAuthenticated } from '../services/sharepointService';

const Planning: React.FC = () => {
    const {
        consultants,
        projects,
        assignments,
        absences,
        addAssignment,
        updateAssignment,
        removeAssignment,
        copyPeriod,
        resetPeriod,
        settings
    } = useAppStore();

    // -- State --
    const [date, setDate] = useState(new Date(2026, 0, 1));
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [showProjectSelector, setShowProjectSelector] = useState<{ consultantId: string } | null>(null);
    const [projectSearch, setProjectSearch] = useState('');

    // -- Calculations --
    const period = useMemo(() => formatPeriod(date, false), [date]);
    const monthId = period.id;

    const weeksInMonth = useMemo(() => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        return Math.ceil(lastDay / 7);
    }, [date]);

    const weekIds = useMemo(() => {
        return Array.from({ length: weeksInMonth }, (_, i) => `${monthId}-W${i + 1}`);
    }, [monthId, weeksInMonth]);

    // -- Handlers --
    const changePeriod = (delta: number) => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + delta);
        setDate(newDate);
    };

    const handleAddProject = (consultantId: string, projectId: string) => {
        const baseAssignment: Assignment = {
            id: crypto.randomUUID(),
            consultantId,
            projectId,
            hours: 0,
            status: 'Confirmada',
            period: monthId,
            isWeekly: false,
            description: ''
        };

        // Just add to local state, don't sync to SharePoint yet
        addAssignment(baseAssignment);
        setShowProjectSelector(null);
        setProjectSearch('');
    };

    const handleSyncRow = async (projectId: string, consultantId: string) => {
        const rowAssignments = assignments.filter(a => a.projectId === projectId && a.consultantId === consultantId && (a.period === monthId || weekIds.includes(a.period)));

        try {
            for (const a of rowAssignments) {
                if (a.sharePointId) {
                    await updateAssignmentInSharePoint(a, settings.sharePointSiteUrl);
                } else if (a.hours > 0) {
                    const spId = await createAssignmentInSharePoint(a, settings.sharePointSiteUrl);
                    updateAssignment({ ...a, sharePointId: spId });
                }
            }
            alert('✅ Fila sincronizada con SharePoint');
        } catch (error) {
            console.error('Error syncing row:', error);
            alert('❌ Error al sincronizar con SharePoint');
        }
    };

    const handleUpdateHours = (assignment: Assignment, newHours: number) => {
        updateAssignment({ ...assignment, hours: newHours });
    };

    const handleDeleteAssignment = async (assignment: Assignment) => {
        if (!window.confirm('¿Eliminar esta asignación y todas sus semanas asociadas?')) return;

        // Note: For simplicity, we delete the specific assignment.
        // If it's the monthly one, we might want to ask if they want to delete everything.
        if (isAuthenticated() && assignment.sharePointId) {
            try {
                await deleteAssignmentInSharePoint(assignment.id, assignment.sharePointId, settings.sharePointSiteUrl);
                removeAssignment(assignment.id);
            } catch (error) {
                alert('Error al borrar en SharePoint');
            }
        } else {
            removeAssignment(assignment.id);
        }
    };

    const filteredConsultants = consultants.filter(c =>
        c.active && c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredProjects = projects.filter(p =>
        p.active && (p.name.toLowerCase().includes(projectSearch.toLowerCase()) || p.client?.toLowerCase().includes(projectSearch.toLowerCase()))
    );

    return (
        <div className="space-y-6 pb-12">
            {/* Header Compacto */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#252729] rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <LayoutGrid size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl mb-0">Planificación Efectiva</h1>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <Clock size={12} className="text-orange-500" />
                            Gestión de Cargas Netas
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm mr-2">
                        <button
                            onClick={() => copyPeriod('2025-12', monthId, false)}
                            className="p-2.5 hover:bg-orange-50 text-gray-400 hover:text-orange-500 rounded-xl transition-all"
                            title="Copiar Periodo Anterior"
                        >
                            <Copy size={18} />
                        </button>
                        <button
                            onClick={() => {
                                // Simple CSV export logic (minimal for compactness)
                                const headers = ['Consultor', 'Proyecto', 'Horas', 'Estado', 'Periodo'];
                                const rows = assignments
                                    .filter(a => a.period === monthId || weekIds.includes(a.period))
                                    .map(a => [
                                        consultants.find(c => c.id === a.consultantId)?.name,
                                        projects.find(p => p.id === a.projectId)?.name,
                                        a.hours,
                                        a.status,
                                        a.period
                                    ]);
                                const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `planificacion_${monthId}.csv`;
                                a.click();
                            }}
                            className="p-2.5 hover:bg-orange-50 text-gray-400 hover:text-orange-500 rounded-xl transition-all"
                            title="Exportar CSV"
                        >
                            <Download size={18} />
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm('¿Borrar todas las asignaciones de este mes?')) {
                                    resetPeriod(monthId, false);
                                    weekIds.forEach(wid => resetPeriod(wid, true));
                                }
                            }}
                            className="p-2.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-all"
                            title="Limpiar Mes"
                        >
                            <Trash size={18} />
                        </button>
                    </div>

                    <div className="flex items-center bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                        <button onClick={() => changePeriod(-1)} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-all"><ChevronLeft size={20} /></button>
                        <div className="px-6 font-black text-xs text-gray-800 uppercase tracking-tighter min-w-[140px] text-center">
                            {period.label}
                        </div>
                        <button onClick={() => changePeriod(1)} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-all"><ChevronRight size={20} /></button>
                    </div>

                    <div className="relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar consultor..."
                            className="pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-500/5 transition-all w-64 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* Matriz de Planificación */}
            <div className="space-y-4">
                {filteredConsultants.map(consultant => {
                    const occ = getPeriodOccupancy(consultant.id, assignments, absences, monthId, false, settings.includeTentativeByDefault);
                    const status = getOccupancyStatus(occ.totalHours, settings, false);
                    const capacity = settings.standardMonthlyCapacity;

                    // Group assignments by project for the matrix
                    const consultantAssignments = assignments.filter(a =>
                        a.consultantId === consultant.id &&
                        (a.period === monthId || weekIds.includes(a.period))
                    );

                    const projectsInScope = Array.from(new Set(consultantAssignments.map(a => a.projectId)));

                    return (
                        <div key={consultant.id} className="card p-0 border-0 shadow-premium overflow-hidden group">
                            {/* Consultant Header Minor */}
                            <div className="bg-gray-50/50 px-6 py-4 flex items-center justify-between border-b border-gray-100 group-hover:bg-white transition-all">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-white text-xs font-black">
                                            {consultant.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-gray-800 tracking-tight leading-none">{consultant.name}</div>
                                            <div className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mt-1">{consultant.role}</div>
                                        </div>
                                    </div>

                                    <div className="h-8 w-px bg-gray-200" />

                                    <div className="flex items-center gap-6">
                                        <div className="space-y-1">
                                            <div className="text-[9px] text-gray-300 font-bold uppercase tracking-widest leading-none">Carga Total</div>
                                            <div className="text-sm font-black text-gray-700 leading-none">{occ.totalHours}h <span className="text-[10px] text-gray-300">/ {capacity}h</span></div>
                                        </div>
                                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${status === 'Sobrecarga' ? 'bg-red-500' : 'bg-orange-500'}`}
                                                style={{ width: `${Math.min((occ.totalHours / capacity) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${getStatusBadgeClass(status)}`}>
                                            {status}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowProjectSelector({ consultantId: consultant.id })}
                                    className="p-2 text-orange-500 hover:bg-orange-50 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                >
                                    <Plus size={14} /> Asignar Proyecto
                                </button>
                            </div>

                            {/* Matrix Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-white/50 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                            <th className="px-6 py-3 text-left w-64">Proyecto / Cliente</th>
                                            <th className="px-3 py-3 text-center bg-gray-50/50 w-20">MES</th>
                                            {weekIds.map((_, i) => (
                                                <th key={i} className="px-3 py-3 text-center w-20 border-l border-gray-50">W{i + 1}</th>
                                            ))}
                                            <th className="px-6 py-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {projectsInScope.map(pid => {
                                            const p = projects.find(pro => pro.id === pid);
                                            const monthlyAsig = consultantAssignments.find(a => a.projectId === pid && a.period === monthId);

                                            return (
                                                <tr key={pid} className="hover:bg-orange-50/10 transition-colors group/row">
                                                    <td className="px-6 py-3">
                                                        <div className="text-sm font-bold text-gray-700">{p?.name}</div>
                                                        <div className="text-[10px] text-gray-400 font-medium">{p?.client}</div>
                                                    </td>

                                                    {/* Monthly Column */}
                                                    <td className="px-2 py-2 bg-gray-50/30">
                                                        <div className="flex items-center justify-center relative">
                                                            <input
                                                                type="number"
                                                                className={`w-16 p-2 text-center text-xs font-black bg-white rounded-lg border-2 transition-all outline-none ${monthlyAsig ? 'border-orange-200' : 'border-dashed border-gray-200 opacity-30 hover:opacity-100'}`}
                                                                value={monthlyAsig?.hours || 0}
                                                                onChange={(e) => {
                                                                    const h = parseInt(e.target.value) || 0;
                                                                    if (monthlyAsig) {
                                                                        handleUpdateHours(monthlyAsig, h);
                                                                    } else if (h > 0) {
                                                                        // Auto-create monthly assignment if typing in empty box
                                                                        handleAddProject(consultant.id, pid);
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </td>

                                                    {/* Weekly Columns */}
                                                    {weekIds.map((wid, idx) => {
                                                        const weeklyAsig = consultantAssignments.find(a => a.projectId === pid && a.period === wid);
                                                        return (
                                                            <td key={idx} className="px-2 py-2 border-l border-gray-50">
                                                                <div className="flex items-center justify-center">
                                                                    <input
                                                                        type="number"
                                                                        className={`w-14 p-2 text-center text-[11px] font-bold bg-transparent rounded-lg hover:bg-white border-b-2 border-transparent hover:border-orange-200 transition-all outline-none ${weeklyAsig ? 'text-gray-800' : 'text-gray-200'}`}
                                                                        placeholder="0"
                                                                        value={weeklyAsig?.hours || ''}
                                                                        onChange={async (e) => {
                                                                            const h = parseInt(e.target.value) || 0;
                                                                            if (weeklyAsig) {
                                                                                handleUpdateHours(weeklyAsig, h);
                                                                            } else if (h > 0) {
                                                                                // Automatic creation of weekly assignment
                                                                                const newA: Assignment = {
                                                                                    id: crypto.randomUUID(),
                                                                                    consultantId: consultant.id,
                                                                                    projectId: pid,
                                                                                    hours: h,
                                                                                    status: 'Confirmada',
                                                                                    period: wid,
                                                                                    isWeekly: true
                                                                                };
                                                                                if (isAuthenticated()) {
                                                                                    const spId = await createAssignmentInSharePoint(newA, settings.sharePointSiteUrl);
                                                                                    addAssignment({ ...newA, sharePointId: spId });
                                                                                } else {
                                                                                    addAssignment(newA);
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            </td>
                                                        );
                                                    })}

                                                    <td className="px-6 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleSyncRow(pid, consultant.id)}
                                                                className="p-2.5 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-4"
                                                                title="Sincronizar esta fila con SharePoint"
                                                            >
                                                                <CheckCircle2 size={14} /> Añadir
                                                            </button>
                                                            <button
                                                                onClick={() => setSelectedAssignment(monthlyAsig || consultantAssignments.find(a => a.projectId === pid)!)}
                                                                className="p-2.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                                                                title="Detalles y Notas"
                                                            >
                                                                <Maximize2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm('¿Eliminar todas las asignaciones de este proyecto para el consultor en este mes?')) {
                                                                        consultantAssignments.filter(a => a.projectId === pid).forEach(a => handleDeleteAssignment(a));
                                                                    }
                                                                }}
                                                                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                                                                title="Eliminar Proyecto"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {projectsInScope.length === 0 && (
                                            <tr>
                                                <td colSpan={7 + weeksInMonth} className="px-6 py-6 text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">
                                                    Sin asignaciones activas
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal de Selector de Proyectos con Búsqueda */}
            {showProjectSelector && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl shadow-black/40 overflow-hidden">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="mb-0 text-xl font-black tracking-tight text-gray-800">Seleccionar Proyecto</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Añadir nueva asignación</p>
                            </div>
                            <button onClick={() => setShowProjectSelector(null)} className="p-3 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-gray-200">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="relative mb-6">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                                <input
                                    type="text"
                                    placeholder="Escribe el nombre del proyecto o cliente..."
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all outline-none"
                                    autoFocus
                                    value={projectSearch}
                                    onChange={(e) => setProjectSearch(e.target.value)}
                                />
                            </div>

                            <div className="max-h-64 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                                {filteredProjects.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleAddProject(showProjectSelector.consultantId, p.id)}
                                        className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-orange-50 transition-all border-2 border-transparent hover:border-orange-100 text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-orange-500 group-hover:text-white transition-all">
                                            {p.name[0]}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-gray-800 tracking-tight">{p.name}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{p.client}</div>
                                        </div>
                                        <Plus size={16} className="ml-auto text-gray-300 group-hover:text-orange-500 transition-all" />
                                    </button>
                                ))}
                                {filteredProjects.length === 0 && (
                                    <div className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-widest">No se encontraron proyectos</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalles de Asignación */}
            {selectedAssignment && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
                    <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl shadow-black/50 overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-orange-500 to-pink-500" />
                        <div className="p-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">
                                        <Info size={14} /> Ficha de Asignación
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tighter text-gray-900">
                                        {projects.find(p => p.id === selectedAssignment.projectId)?.name}
                                    </h2>
                                    <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">
                                        Periodo: <span className="text-gray-800">{selectedAssignment.period}</span>
                                    </p>
                                </div>
                                <button onClick={() => setSelectedAssignment(null)} className="p-4 hover:bg-gray-50 rounded-3xl transition-all">
                                    <X size={24} className="text-gray-300" />
                                </button>
                            </div>

                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Estado de la Carga</label>
                                        <select
                                            className={`w-full p-4 rounded-3xl border-0 font-black text-xs uppercase tracking-widest transition-all outline-none appearance-none ${selectedAssignment.status === 'Confirmada' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}
                                            value={selectedAssignment.status}
                                            onChange={(e) => {
                                                const updated = { ...selectedAssignment, status: e.target.value as any };
                                                setSelectedAssignment(updated);
                                                handleUpdateHours(updated, selectedAssignment.hours);
                                            }}
                                        >
                                            <option value="Confirmada">✅ Confirmada</option>
                                            <option value="Tentativa">📋 Tentativa</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Horas Asignadas</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-full p-4 bg-gray-50 border-0 rounded-3xl text-sm font-black focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all outline-none"
                                                value={selectedAssignment.hours}
                                                onChange={(e) => {
                                                    const h = parseInt(e.target.value) || 0;
                                                    const updated = { ...selectedAssignment, hours: h };
                                                    setSelectedAssignment(updated);
                                                }}
                                                onBlur={() => handleUpdateHours(selectedAssignment, selectedAssignment.hours)}
                                            />
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 tracking-widest">HRS</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Notas Técnicas / Alcance</label>
                                    <textarea
                                        className="w-full p-6 bg-gray-50 border-0 rounded-[32px] text-sm font-medium text-gray-700 min-h-[160px] focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all outline-none resize-none"
                                        placeholder="Define las tareas específicas o entregables..."
                                        value={selectedAssignment.description}
                                        onChange={(e) => {
                                            const updated = { ...selectedAssignment, description: e.target.value };
                                            setSelectedAssignment(updated);
                                        }}
                                        onBlur={() => handleUpdateHours(selectedAssignment, selectedAssignment.hours)}
                                    ></textarea>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={() => setSelectedAssignment(null)}
                                        className="w-full py-5 bg-gray-900 text-white rounded-[32px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-black/20 hover:bg-black transition-all active:scale-95"
                                    >
                                        Cerrar y Sincronizar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Planning;
