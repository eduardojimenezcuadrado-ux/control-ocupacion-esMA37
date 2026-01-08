import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import {
    Plus,
    Search,
    User,
    Mail,
    Briefcase,
    FileText,
    ChevronRight,
    TrendingUp,
    Clock,
    Calendar,
    Save,
    X,
    ShieldCheck,
    Contact2,
    LayoutGrid,
    ListFilter,
    Cloud,
    Trash,
    ChevronLeft
} from 'lucide-react';
import { Consultant } from '../types';
import {
    getPeriodOccupancy,
    getFTE,
    getOccupancyStatus,
    getStatusBadgeClass,
    formatPeriod
} from '../utils/calculations';
import { createConsultantInSharePoint, deleteConsultantInSharePoint, updateConsultantInSharePoint, isAuthenticated } from '../services/sharepointService';

const Consultants: React.FC = () => {
    const {
        consultants,
        setConsultants,
        assignments,
        absences,
        settings,
        projects
    } = useAppStore();

    const [date, setDate] = useState(new Date(2026, 0, 1));
    const period = useMemo(() => formatPeriod(date, false), [date]);

    const changePeriod = (delta: number) => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + delta);
        setDate(newDate);
    };

    const [search, setSearch] = useState('');
    const [selectedConsultant, setSelectedConsultant] = useState<Consultant | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Consultant>>({});

    const filteredConsultants = useMemo(() => {
        return consultants.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.role.toLowerCase().includes(search.toLowerCase())
        );
    }, [consultants, search]);

    const handleEdit = (consultant: Consultant) => {
        setFormData(consultant);
        setIsEditing(true);
    };

    const handleAddNew = () => {
        setFormData({
            id: crypto.randomUUID(),
            name: '',
            email: '',
            role: '',
            active: true,
            notes: ''
        });
        setIsEditing(true);
    };

    const handleDelete = async (consultant: Consultant) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar al consultor ${consultant.name}? Esta acción no se puede deshacer.`)) {
            return;
        }

        // 1. Delete from SharePoint first if has sharePointId
        if (isAuthenticated() && consultant.sharePointId) {
            try {
                await deleteConsultantInSharePoint(consultant.id, consultant.sharePointId, settings.sharePointSiteUrl);
                console.log('✅ Consultant deleted from SharePoint');
            } catch (error) {
                console.error('⚠️ Failed to delete from SharePoint:', error);
                alert('No se pudo eliminar de SharePoint. La operación se ha cancelado para mantener la coherencia.');
                return; // STOP HERE
            }
        }

        // 2. ONLY if SharePoint (or no SP sync needed) succeeds, update local store
        setConsultants(prev => prev.filter(c => c.id !== consultant.id));
        setSelectedConsultant(null);
        setIsEditing(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.id) {
            const exists = consultants.find(c => c.id === formData.id);
            const consultantData = formData as Consultant;

            if (exists) {
                const updatedConsultant = { ...consultantData, sharePointId: exists.sharePointId };

                // 1. Update SharePoint first if sync is enabled
                if (isAuthenticated() && exists.sharePointId) {
                    try {
                        await updateConsultantInSharePoint(updatedConsultant, settings.sharePointSiteUrl);
                        console.log('✅ Consultant update synced to SharePoint');
                    } catch (error) {
                        console.error('⚠️ Failed to sync update to SharePoint:', error);
                        alert('Error al actualizar en SharePoint. Los cambios no se han aplicado localmente.');
                        return; // STOP
                    }
                }

                // 2. Update local state
                setConsultants(prev => prev.map(c => c.id === formData.id ? updatedConsultant : c));
            } else {
                let finalConsultant = { ...consultantData };

                // 1. Create in SharePoint first
                if (isAuthenticated()) {
                    try {
                        const spId = await createConsultantInSharePoint(consultantData, settings.sharePointSiteUrl);
                        console.log('✅ Consultant created in SharePoint with ID:', spId);
                        finalConsultant.sharePointId = spId;
                    } catch (error) {
                        console.error('⚠️ Failed to create in SharePoint:', error);
                        alert('Error al crear en SharePoint. El registro no se ha guardado.');
                        return; // STOP
                    }
                }

                // 2. Update local state
                setConsultants(prev => [...prev, finalConsultant]);
            }
        }
        setIsEditing(false);
        setSelectedConsultant(null);
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#f78c38] uppercase tracking-widest">
                        <Contact2 size={14} /> Team Management
                    </div>
                    <h1>Gestión de Talento</h1>
                    <p className="text-gray-500 font-medium">Visualiza disponibilidad y perfiles técnicos del equipo</p>
                </div>
                {!isEditing && !selectedConsultant && (
                    <button onClick={handleAddNew} className="btn btn-primary shadow-xl px-10 py-4 text-sm uppercase tracking-widest font-black">
                        <Plus size={20} /> Registrar Consultor
                    </button>
                )}
            </header>

            {!isEditing && !selectedConsultant && (
                <div className="card glass border-0 flex items-center justify-between gap-6 py-4 shadow-premium mb-8">
                    <div className="flex items-center bg-gray-50 p-1 rounded-2xl border border-gray-100 shadow-sm ml-2">
                        <button onClick={() => changePeriod(-1)} className="p-2.5 hover:bg-white hover:shadow-md rounded-xl text-gray-400 transition-all active:scale-95"><ChevronLeft size={20} /></button>
                        <div className="px-8 font-black text-xs text-gray-800 uppercase tracking-tighter min-w-[160px] text-center">
                            {period.label}
                        </div>
                        <button onClick={() => changePeriod(1)} className="p-2.5 hover:bg-white hover:shadow-md rounded-xl text-gray-400 transition-all active:scale-95"><ChevronRight size={20} /></button>
                    </div>

                    <div className="relative flex-1 max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input
                            type="text"
                            placeholder="Filtrar por nombre, cargo o habilidad..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="p-3 bg-gray-50 rounded-2xl text-gray-300 mr-2 border border-transparent">
                        <ListFilter size={20} />
                    </div>
                </div>
            )}

            {isEditing ? (
                <div className="card glass max-w-2xl mx-auto shadow-premium border-0 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500 rounded-xl text-white">
                                <User size={20} />
                            </div>
                            <h3 className="mb-0">{formData.id && consultants.find(c => c.id === formData.id) ? 'Refinar Perfil' : 'Alta de Nuevo Talento'}</h3>
                        </div>
                        <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-400">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Nombre Completo</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Alejandro García"
                                    className="w-full p-3 bg-gray-50 border-0 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-semibold"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Email Corporativo</label>
                                <input
                                    type="email"
                                    placeholder="alejandro.garcia@raona.com"
                                    className="w-full p-3 bg-gray-50 border-0 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-semibold"
                                    value={formData.email || ''}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Rol / Especialidad</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Senior Architect"
                                    className="w-full p-3 bg-gray-50 border-0 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-semibold"
                                    value={formData.role || ''}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Estado Operativo</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border-0 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-semibold appearance-none"
                                    value={formData.active ? 'active' : 'inactive'}
                                    onChange={(e) => setFormData({ ...formData, active: e.target.value === 'active' })}
                                >
                                    <option value="active">✓ Activo / En Proyecto</option>
                                    <option value="inactive">⚠ Inactivo / Baja Temporal</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Notas & Perfil Técnico</label>
                            <textarea
                                className="w-full p-3 bg-gray-50 border-0 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-medium h-24 resize-none"
                                placeholder="Añade detalles sobre tecnologías, disponibilidad específica o comentarios..."
                                value={formData.notes || ''}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            ></textarea>
                        </div>
                        <div className="pt-4 flex justify-between gap-4">
                            {formData.id && consultants.find(c => c.id === formData.id) && (
                                <button
                                    type="button"
                                    onClick={() => handleDelete(formData as Consultant)}
                                    className="btn bg-red-50 text-red-500 hover:bg-red-100 border-transparent font-bold"
                                >
                                    <Trash size={18} /> Eliminar
                                </button>
                            )}
                            <div className="flex gap-4 ml-auto">
                                <button type="button" onClick={() => setIsEditing(false)} className="btn btn-outline border-transparent font-bold">Cancelar</button>
                                <button type="submit" className="btn btn-primary px-8 shadow-premium">
                                    <Save size={18} /> Guardar Perfil
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            ) : selectedConsultant ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
                    <div className="lg:col-span-4 space-y-8">
                        <div className="card glass border-0 text-center py-10 shadow-premium overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-[#252729] to-black opacity-90 z-0" />
                            <div className="relative z-10">
                                <div className="w-32 h-32 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl border-4 border-white/50 overflow-hidden group">
                                    <div className="w-full h-full bg-[#f78c38] flex items-center justify-center text-white font-black text-4xl group-hover:scale-110 transition-transform">
                                        {selectedConsultant.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                </div>
                                <h2 className="mb-2 text-4xl font-black tracking-tighter text-gray-900">{selectedConsultant.name}</h2>
                                <div className="inline-flex items-center gap-3 px-5 py-2 bg-orange-50 rounded-full border border-orange-100">
                                    <ShieldCheck size={16} className="text-orange-500" />
                                    <span className="text-orange-600 font-extrabold uppercase tracking-widest text-[11px]">{selectedConsultant.role}</span>
                                </div>

                                <div className="mt-10 flex justify-center gap-3">
                                    <button onClick={() => handleEdit(selectedConsultant)} className="btn btn-outline shadow-sm hover:shadow-md">Editar</button>
                                    <button onClick={() => setSelectedConsultant(null)} className="btn btn-primary shadow-lg shadow-black/10">Volver a Lista</button>
                                </div>
                            </div>
                        </div>

                        <div className="card space-y-6">
                            <h3 className="text-lg flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                                Ficha Técnica
                            </h3>
                            <div className="space-y-5">
                                <div className="flex items-center gap-4 group">
                                    <div className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-all"><Mail size={18} /></div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Email Corporativo</div>
                                        <div className="text-sm font-bold text-gray-700">{selectedConsultant.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 group">
                                    <div className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-all"><Briefcase size={18} /></div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Cargo</div>
                                        <div className="text-sm font-bold text-gray-700">{selectedConsultant.role}</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 group">
                                    <div className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-all mt-1"><FileText size={18} /></div>
                                    <div className="flex-1">
                                        <div className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Notas Internas</div>
                                        <div className="text-sm font-medium text-gray-500 italic leading-relaxed">{selectedConsultant.notes || 'No se han registrado notas adicionales para este perfil.'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="card border-0 bg-gradient-to-br from-white to-gray-50 shadow-premium group">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Carga Proyectada</span>
                                        <span className="text-xs font-bold text-gray-300">{period.label}</span>
                                    </div>
                                    <div className="p-2 bg-orange-500 rounded-lg text-white group-hover:rotate-12 transition-transform">
                                        <TrendingUp size={20} />
                                    </div>
                                </div>
                                {(() => {
                                    const occ = getPeriodOccupancy(selectedConsultant.id, assignments, absences, period.id, false, true);
                                    const fte = getFTE(occ.totalHours, settings.standardMonthlyCapacity);
                                    return (
                                        <div className="space-y-4">
                                            <div className="flex items-baseline gap-4">
                                                <div className="text-7xl font-black text-gray-800 tracking-tighter">{occ.totalHours}h</div>
                                                <div className="text-base font-black text-orange-500">({fte.toFixed(1)} FTE)</div>
                                            </div>
                                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                                                <div
                                                    className="h-full bg-orange-500 rounded-full shadow-[0_0_12px_rgba(247,140,56,0.5)] transition-all duration-1000"
                                                    style={{ width: `${Math.min((occ.totalHours / settings.standardMonthlyCapacity) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="card border-0 bg-gradient-to-br from-[#252729] to-black text-white shadow-premium group">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Estado Operativo</span>
                                        <span className="text-xs font-bold text-gray-600">Actualización en tiempo real</span>
                                    </div>
                                    <div className="p-2 bg-white/5 rounded-lg text-white group-hover:scale-110 transition-transform">
                                        <Clock size={20} />
                                    </div>
                                </div>
                                {(() => {
                                    const occ = getPeriodOccupancy(selectedConsultant.id, assignments, absences, period.id, false, true);
                                    const status = getOccupancyStatus(occ.totalHours, settings, false);
                                    return (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 ${status === 'Sobrecarga' ? 'bg-red-500/20 text-red-400' : status === 'Disponible' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                                    {status}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-semibold text-gray-500 leading-snug">
                                                Resultados calculados sobre {settings.standardMonthlyCapacity}h estándar mensuales incluyendo asignaciones tentativas.
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="card glass border-0 shadow-premium p-0 overflow-hidden">
                            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
                                <h3 className="mb-0 text-lg">Historial de Asignaciones</h3>
                                <Calendar size={18} className="text-gray-300" />
                            </div>
                            <div className="table-container border-0 rounded-none shadow-none">
                                <table>
                                    <thead>
                                        <tr>
                                            <th className="px-8 py-4">Proyecto</th>
                                            <th className="text-center">Periodo de Carga</th>
                                            <th className="text-center">Dedicación</th>
                                            <th className="px-8 py-4">Estatus Actual</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {assignments
                                            .filter(a => a.consultantId === selectedConsultant.id && (a.period === period.id || a.period.startsWith(`${period.id}-W`)))
                                            .map(a => {
                                                const project = projects.find(p => p.id === a.projectId);
                                                return (
                                                    <tr key={a.id} className="hover:bg-orange-50/20 transition-all duration-300">
                                                        <td className="px-8 py-5">
                                                            <div className="font-bold text-gray-800">{project?.name}</div>
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{project?.client}</div>
                                                        </td>
                                                        <td className="text-center">
                                                            <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                                {a.period}
                                                            </span>
                                                        </td>
                                                        <td className="text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <span className="text-lg font-black text-gray-700">{a.hours}</span>
                                                                <span className="text-[10px] font-bold text-gray-300">h</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <span className={`badge ${a.status === 'Confirmada' ? 'badge-success' : 'badge-info'}`}>
                                                                {a.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        {assignments.filter(a => a.consultantId === selectedConsultant.id && (a.period === period.id || a.period.startsWith(`${period.id}-W`))).length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <LayoutGrid size={32} className="text-gray-100" />
                                                        <span className="text-sm font-bold text-gray-300 italic">No hay asignaciones activas para el mes seleccionado.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (


                <div className="table-container border-0 shadow-premium">
                    <table>
                        <thead>
                            <tr>
                                <th className="px-8">Consultor</th>
                                <th>Rol / Cargo Principal</th>
                                <th className="text-center">Dedicación Mensual</th>
                                <th className="text-center">FTE</th>
                                <th>Visualización Estado</th>
                                <th className="text-right px-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredConsultants.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center lg:flex-row lg:justify-center gap-4 text-gray-300">
                                            <LayoutGrid size={48} strokeWidth={1} />
                                            <span className="text-sm font-bold uppercase tracking-widest">
                                                No se encontraron consultores con ese criterio.
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredConsultants.map(c => {
                                    const occ = getPeriodOccupancy(c.id, assignments, absences, period.id, false, true);
                                    const status = getOccupancyStatus(occ.totalHours, settings, false);
                                    const fte = getFTE(occ.totalHours, settings.standardMonthlyCapacity);

                                    return (
                                        <tr
                                            key={c.id}
                                            className="group cursor-pointer hover:bg-gray-50/50 transition-all"
                                            onClick={() => setSelectedConsultant(c)}
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center text-xs font-black text-gray-400 group-hover:from-orange-500 group-hover:to-orange-400 group-hover:text-white transition-all shadow-sm border border-gray-100 group-hover:border-transparent">
                                                        {c.name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-gray-800 tracking-tighter text-xl">{c.name}</div>
                                                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">{c.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 group-hover:bg-white transition-all uppercase tracking-widest">{c.role}</span>
                                            </td>
                                            <td className="text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <span className="text-lg font-black text-gray-700">{occ.totalHours}</span>
                                                    <span className="text-[10px] font-bold text-gray-300">/ {settings.standardMonthlyCapacity}h</span>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div className="inline-flex items-center px-2 py-1 bg-gray-50 rounded-lg text-[11px] font-black text-gray-400 border border-gray-100">
                                                    {fte.toFixed(1)}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${getStatusBadgeClass(status)}`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="text-right px-8">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-100 group-hover:bg-orange-500 group-hover:text-white transition-all duration-500 shadow-none group-hover:shadow-lg group-hover:shadow-orange-500/20 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100">
                                                    <ChevronRight size={20} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Consultants;