import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import {
    Plus,
    Trash2,
    Copy,
    Download,
    Trash,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Info,
    CalendarDays,
    Clock,
    User
} from 'lucide-react';
import { Assignment, Project } from '../types';
import {
    formatPeriod,
    getPeriodOccupancy,
    getOccupancyStatus,
    getStatusBadgeClass
} from '../utils/calculations';
import { createAssignmentInSharePoint, deleteAssignmentInSharePoint, isAuthenticated } from '../services/sharepointService';

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

    const [date, setDate] = useState(new Date(2026, 0, 1));
    const [isWeekly, setIsWeekly] = useState(false);
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

    const handleAddProject = async (consultantId: string) => {
        if (projects.length === 0) return;

        const newAssignment: Assignment = {
            id: crypto.randomUUID(),
            consultantId,
            projectId: projects[0].id,
            hours: 40,
            status: 'Confirmada',
            period: period.id,
            isWeekly,
            description: ''
        };

        addAssignment(newAssignment);

        // Sync to SharePoint if authenticated
        if (isAuthenticated()) {
            try {
                await createAssignmentInSharePoint(newAssignment);
                console.log('✅ Assignment synced to SharePoint');
            } catch (error) {
                console.error('⚠️ Failed to sync to SharePoint:', error);
            }
        }
    };

    const handleDeleteAssignment = async (assignment: Assignment) => {
        if (!window.confirm('¿Eliminar esta asignación?')) {
            return;
        }

        // Remove locally
        removeAssignment(assignment.id);

        // Delete from SharePoint if authenticated and has sharePointId
        if (isAuthenticated() && assignment.sharePointId) {
            try {
                await deleteAssignmentInSharePoint(assignment.id, assignment.sharePointId);
                console.log('✅ Assignment deleted from SharePoint');
            } catch (error) {
                console.error('⚠️ Failed to delete from SharePoint:', error);
            }
        }
    };

    const exportCSV = () => {
        const headers = ['Consultor', 'Proyecto', 'Horas', 'Estado', 'Descripción'];
        const rows = assignments
            .filter(a => a.period === period.id)
            .map(a => {
                const c = consultants.find(con => con.id === a.consultantId);
                const p = projects.find(pro => pro.id === a.projectId);
                return [c?.name, p?.name, a.hours, a.status, a.description];
            });

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `planificacion_${period.id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getSubperiods = () => {
        if (isWeekly) return [period.id];
        return [period.id, `${period.id}-W1`, `${period.id}-W2`, `${period.id}-W3`, `${period.id}-W4`, `${period.id}-W5`];
    };

    return (
        <div className="space-y-8 pb-12">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#f78c38] uppercase tracking-widest">
                        <CalendarDays size={14} /> Planificación Global
                    </div>
                    <h1>Escritorio de Planificación</h1>
                    <p className="text-gray-500 font-medium">Gestión avanzada de asignaciones para {period.label}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => copyPeriod('2025-12', period.id, isWeekly)} className="btn btn-outline">
                        <Copy size={16} /> Copiar Periodo
                    </button>
                    <button onClick={exportCSV} className="btn btn-outline">
                        <Download size={16} /> CSV
                    </button>
                    <button onClick={() => resetPeriod(period.id, isWeekly)} className="btn btn-outline text-red-500 border-red-100 hover:bg-red-50 hover:border-red-200">
                        <Trash size={16} /> Limpiar
                    </button>
                </div>
            </header>

            {/* Premium Period Bar */}
            <div className="card glass border-0 flex flex-col md:flex-row items-center justify-between py-4 px-6 shadow-premium">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 px-3 py-1 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <button onClick={() => changePeriod(-1)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-all"><ChevronLeft size={20} /></button>
                        <span className="px-4 font-extrabold text-sm tracking-tighter text-gray-700 min-w-[120px] text-center uppercase">{period.id}</span>
                        <button onClick={() => changePeriod(1)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-all"><ChevronRight size={20} /></button>
                    </div>

                    <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-100">
                        <button
                            onClick={() => setIsWeekly(false)}
                            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!isWeekly ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Mensual
                        </button>
                        <button
                            onClick={() => setIsWeekly(true)}
                            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isWeekly ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Semanal
                        </button>
                    </div>
                </div>

                <div className="mt-4 md:mt-0 px-4 py-2 bg-orange-50 rounded-xl border border-orange-100 flex items-center gap-3 text-xs font-bold text-orange-600">
                    <Info size={16} />
                    <span>Sincronización automática de semanas en total mensual.</span>
                </div>
            </div>

            <div className="space-y-8">
                {consultants.filter(c => c.active).map(consultant => {
                    const occ = getPeriodOccupancy(consultant.id, assignments, absences, period.id, isWeekly, true);
                    const status = getOccupancyStatus(occ.totalHours, settings, isWeekly);
                    const capacity = isWeekly ? settings.standardWeeklyCapacity : settings.standardMonthlyCapacity;

                    return (
                        <div key={consultant.id} className="card p-0 border-0 shadow-premium overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/5">
                            <div className="bg-gray-50/50 px-10 py-8 flex items-center justify-between border-b border-gray-100 group-hover:bg-white transition-all">
                                <div className="flex items-center gap-10">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white shadow-lg overflow-hidden">
                                        <User size={32} />
                                    </div>
                                    <div>
                                        <h4 className="mb-0 text-3xl font-black tracking-tighter text-gray-800">{consultant.name}</h4>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-[11px] text-gray-400 uppercase tracking-[0.25em] font-black">{consultant.role}</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                                            <span className={`badge ${getStatusBadgeClass(status)}`}>
                                                {status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-12 ml-10 pl-10 border-l border-gray-100">
                                        <div className="space-y-1">
                                            <div className="text-[11px] text-gray-400 font-black uppercase tracking-widest">Carga Asignada</div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-black text-gray-800 tracking-tighter">{occ.totalHours}h</span>
                                                <span className="text-sm font-bold text-gray-300">/ {capacity}h</span>
                                            </div>
                                        </div>
                                        <div className="w-48 h-3.5 bg-gray-100 rounded-full overflow-hidden border border-gray-100 shadow-inner">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${status === 'Sobrecarga' ? 'bg-red-500' : 'bg-orange-500'}`}
                                                style={{ width: `${Math.min((occ.totalHours / capacity) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAddProject(consultant.id)}
                                    className="btn btn-primary rounded-xl py-4 px-8 shadow-xl shadow-black/5 hover:shadow-black/10 active:scale-95 transition-all text-sm uppercase tracking-widest"
                                >
                                    <Plus size={20} /> Añadir Proyecto
                                </button>
                            </div>

                            <div className="p-4 bg-white">
                                <div className="table-container border-0 rounded-2xl">
                                    <table>
                                        <thead>
                                            <tr className="bg-gray-50/30">
                                                <th className="px-8 py-4 text-left w-1/3">Proyecto & Cliente</th>
                                                <th className="px-4 py-4 text-center">Periodo</th>
                                                <th className="px-4 py-4 text-center">Asignación</th>
                                                <th className="px-4 py-4 text-center">Estado</th>
                                                <th className="px-4 py-4 text-left">Notas Técnicas</th>
                                                <th className="px-8 py-4 text-right"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {assignments
                                                .filter(a => a.consultantId === consultant.id && (isWeekly ? a.period === period.id : (a.period === period.id || a.period.startsWith(`${period.id}-W`))))
                                                .map(a => (
                                                    <tr key={a.id} className="group/row transition-all hover:bg-orange-50/30">
                                                        <td className="px-8 py-4">
                                                            <select
                                                                className="w-full p-3.5 bg-transparent border-0 focus:ring-4 focus:ring-orange-500/5 rounded-2xl font-extrabold text-base text-gray-800 cursor-pointer appearance-none hover:bg-white transition-all shadow-none hover:shadow-sm"
                                                                value={a.projectId}
                                                                onChange={(e) => updateAssignment({ ...a, projectId: e.target.value })}
                                                            >
                                                                {projects.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name} — {p.client}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <select
                                                                className="px-3 py-1.5 bg-orange-100/50 rounded-lg font-black text-[10px] text-orange-600 uppercase tracking-widest border border-orange-100/50 cursor-pointer hover:bg-orange-100 transition-all"
                                                                value={a.period}
                                                                onChange={(e) => updateAssignment({ ...a, period: e.target.value })}
                                                            >
                                                                {getSubperiods().map(sp => (
                                                                    <option key={sp} value={sp}>{sp}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-3">
                                                                <input
                                                                    type="number"
                                                                    className="w-24 p-3.5 text-center bg-gray-50 rounded-2xl border-0 focus:ring-4 focus:ring-orange-500/5 font-black text-lg text-gray-800 transition-all shadow-inner"
                                                                    value={a.hours}
                                                                    onChange={(e) => updateAssignment({ ...a, hours: parseInt(e.target.value) || 0 })}
                                                                />
                                                                <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">HRS</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <select
                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${a.status === 'Confirmada' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}
                                                                value={a.status}
                                                                onChange={(e) => updateAssignment({ ...a, status: e.target.value as any })}
                                                            >
                                                                <option value="Confirmada">Confirmada</option>
                                                                <option value="Tentativa">Tentativa</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <input
                                                                type="text"
                                                                placeholder="Detalles de la tarea..."
                                                                className="w-full p-3.5 bg-transparent border-0 focus:ring-4 focus:ring-orange-500/5 rounded-2xl text-sm font-bold text-gray-600 italic placeholder:text-gray-300 hover:bg-white transition-all"
                                                                value={a.description}
                                                                onChange={(e) => updateAssignment({ ...a, description: e.target.value })}
                                                            />
                                                        </td>
                                                        <td className="px-8 py-4 text-right">
                                                            <button
                                                                onClick={() => handleDeleteAssignment(a)}
                                                                className="p-2.5 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/row:opacity-100"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            {assignments.filter(a => a.consultantId === consultant.id && (isWeekly ? a.period === period.id : (a.period === period.id || a.period.startsWith(`${period.id}-W`)))).length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-8 py-10 text-center">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                                                                <Plus size={20} />
                                                            </div>
                                                            <div className="text-xs font-bold text-gray-300 uppercase tracking-widest">Sin asignaciones registradas</div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Planning;