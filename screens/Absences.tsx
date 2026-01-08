import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import {
    Plus,
    Trash2,
    Clock,
    Calendar,
    AlertCircle,
    CheckCircle2,
    Users,
    Plane,
    Stethoscope,
    Heart,
    Star,
    Info,
    LayoutList,
    UserCheck,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { Absence, AbsenceCategory, AppSettings } from '../types';
import { formatPeriod } from '../utils/calculations';
import { createAbsenceInSharePoint, deleteAbsenceInSharePoint, isAuthenticated } from '../services/sharepointService';

const Absences: React.FC = () => {
    const { consultants, absences, addAbsence, removeAbsence, settings } = useAppStore();
    const [selectedConsultants, setSelectedConsultants] = useState<string[]>([]);
    const [category, setCategory] = useState<AbsenceCategory>('Vacaciones');
    const [hours, setHours] = useState(160);
    const [date, setDate] = useState(new Date(2026, 0, 1));
    const [isWeekly, setIsWeekly] = useState(false);
    const [notes, setNotes] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const periodData = useMemo(() => formatPeriod(date, isWeekly), [date, isWeekly]);
    const periodId = periodData.id;

    const changePeriod = (delta: number) => {
        const newDate = new Date(date);
        if (isWeekly) {
            newDate.setDate(newDate.getDate() + (delta * 7));
        } else {
            newDate.setMonth(newDate.getMonth() + delta);
        }
        setDate(newDate);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedConsultants.length === 0) return;

        const newAbsences: Absence[] = [];

        for (const cid of selectedConsultants) {
            const absenceData: Absence = {
                id: crypto.randomUUID(),
                consultantId: cid,
                category,
                hours,
                period: periodId,
                isWeekly,
                notes
            };

            // 1. Sync to SharePoint first if authenticated
            if (isAuthenticated()) {
                try {
                    const spId = await createAbsenceInSharePoint(absenceData, settings.sharePointSiteUrl);
                    console.log('✅ Absence created in SharePoint with ID:', spId);
                    absenceData.sharePointId = spId;
                } catch (error) {
                    console.error('⚠️ Failed to sync to SharePoint:', error);
                    alert(`Error al guardar en SharePoint para uno de los consultores. Operación detenida.`);
                    return; // Stop for safety
                }
            }
            newAbsences.push(absenceData);
        }

        // 2. Update local state
        newAbsences.forEach(a => addAbsence(a));

        setShowSuccess(true);
        setSelectedConsultants([]);
        setNotes('');
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const handleDeleteAbsence = async (absence: Absence) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este registro de ausencia?')) return;

        // 1. Delete from SharePoint first
        if (isAuthenticated() && absence.sharePointId) {
            try {
                await deleteAbsenceInSharePoint(absence.id, absence.sharePointId, settings.sharePointSiteUrl);
                console.log('✅ Absence deleted from SharePoint');
            } catch (error) {
                console.error('⚠️ Failed to delete absence from SharePoint:', error);
                alert('No se pudo eliminar de SharePoint. Operación cancelada.');
                return;
            }
        }

        // 2. Update local state
        removeAbsence(absence.id);
    };

    const toggleConsultant = (id: string) => {
        setSelectedConsultants(prev =>
            prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
        );
    };

    const categories = [
        { id: 'Vacaciones', icon: Plane, color: 'text-blue-500', bg: 'bg-blue-50' },
        { id: 'Festivos', icon: Star, color: 'text-orange-500', bg: 'bg-orange-50' },
        { id: 'Baja médica', icon: Stethoscope, color: 'text-red-500', bg: 'bg-red-50' },
        { id: 'Asuntos personales', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
    ];

    return (
        <div className="space-y-8 pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#f78c38] uppercase tracking-widest">
                        <Calendar size={14} /> Time-off Tracking
                    </div>
                    <h1 className="mb-0">Control de Ausencias</h1>
                    <p className="text-gray-500 font-medium">Gestión de periodos de indisponibilidad y ajustes de carga</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100/50 p-1 rounded-2xl border border-gray-200">
                        <button
                            onClick={() => setIsWeekly(false)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${!isWeekly ? 'bg-[#252729] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Mensual
                        </button>
                        <button
                            onClick={() => setIsWeekly(true)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isWeekly ? 'bg-[#252729] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Semanal
                        </button>
                    </div>

                    <div className="flex items-center bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                        <button onClick={() => changePeriod(-1)} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-all"><ChevronLeft size={20} /></button>
                        <div className="px-6 font-black text-xs text-gray-800 uppercase tracking-tighter min-w-[160px] text-center">
                            {periodData.label}
                        </div>
                        <button onClick={() => changePeriod(1)} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-all"><ChevronRight size={20} /></button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                    <div className="card glass border-0 shadow-premium sticky top-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-[#252729] rounded-xl text-white">
                                <Plus size={20} />
                            </div>
                            <h3 className="mb-0">Registrar Periodo</h3>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tipo de Ausencia</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.id as any)}
                                            className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-xs font-bold ${category === cat.id ? 'border-orange-500 bg-orange-50/50 text-orange-600' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-100 hover:bg-gray-100/50'}`}
                                        >
                                            <cat.icon size={14} className={category === cat.id ? 'text-orange-500' : 'text-gray-300'} />
                                            <span className="truncate">{cat.id.split(' ')[0]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Horas Totales</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all font-extrabold outline-none"
                                            value={hours}
                                            onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                                        />
                                        <Clock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Periodo</label>
                                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl font-black text-xs text-orange-600 text-center uppercase tracking-widest flex items-center justify-center h-[52px]">
                                        {periodId}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Consultores Afectados ({selectedConsultants.length})</label>
                                <div className="max-h-56 overflow-y-auto border-2 border-gray-50 rounded-2xl p-2 space-y-1 bg-gray-50/50 scrollbar-thin">
                                    {consultants.filter(c => c.active).map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => toggleConsultant(c.id)}
                                            className={`
                                                flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300
                                                ${selectedConsultants.includes(c.id) ? 'bg-[#252729] text-white shadow-lg' : 'hover:bg-white text-gray-600'}
                                            `}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${selectedConsultants.includes(c.id) ? 'bg-[#f78c38] text-white' : 'bg-gray-100 text-gray-300'}`}>
                                                {c.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <span className="text-xs font-bold tracking-tight">{c.name}</span>
                                            {selectedConsultants.includes(c.id) && <UserCheck size={14} className="ml-auto text-orange-500" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Notas de Auditoría</label>
                                <textarea
                                    className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all font-medium h-24 resize-none outline-none"
                                    placeholder="Escribe el motivo o detalles de la ausencia..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={selectedConsultants.length === 0}
                                className={`btn btn-primary w-full shadow-premium py-4 font-black uppercase tracking-[0.2em] text-[10px] ${selectedConsultants.length === 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                            >
                                Validar y Registrar
                            </button>

                            {showSuccess && (
                                <div className="p-4 bg-green-500 text-white rounded-2xl flex items-center gap-3 text-sm font-bold shadow-lg shadow-green-500/20 animate-in slide-in-from-top-4">
                                    <CheckCircle2 size={20} /> Transacción completada
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-8">
                    <div className="card p-0 border-0 shadow-premium overflow-hidden">
                        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <LayoutList size={18} className="text-gray-400" />
                                <h3 className="mb-0 text-lg">Histórico ({periodData.label})</h3>
                            </div>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Auditoría Interna</span>
                        </div>
                        <div className="table-container border-0 rounded-none shadow-none">
                            <table>
                                <thead>
                                    <tr>
                                        <th className="px-8">Consultor</th>
                                        <th className="text-center">Tipo de Gestión</th>
                                        <th className="text-center">Impacto (Horas)</th>
                                        <th className="px-8 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {absences.filter(a => a.period === periodId).length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-20 text-gray-300 font-bold uppercase tracking-widest text-[10px]">No se registran incidencias para este periodo</td></tr>
                                    ) : (
                                        absences.filter(a => a.period === periodId).map(a => {
                                            const c = consultants.find(con => con.id === a.consultantId);
                                            const cat = categories.find(ct => ct.id === a.category);
                                            return (
                                                <tr key={a.id} className="group hover:bg-orange-50/20 transition-all duration-500">
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:bg-gray-800 group-hover:text-white transition-all">
                                                                {c?.name.split(' ').map(n => n[0]).join('')}
                                                            </div>
                                                            <div className="font-bold text-gray-800 tracking-tight">{c?.name || 'Sistema'}</div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold border ${cat?.bg || 'bg-gray-50'} ${cat?.color || 'text-gray-400'} border-transparent`}>
                                                            {cat && <cat.icon size={12} />}
                                                            {a.category}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className="text-lg font-black text-gray-700">{a.hours}</span>
                                                            <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">hrs</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 text-right">
                                                        <button
                                                            onClick={() => handleDeleteAbsence(a)}
                                                            className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card bg-[#252729] text-white border-0 shadow-2xl relative group p-8 lg:p-12">
                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-500 rounded-2xl text-white shadow-lg shadow-orange-500/20">
                                    <Info size={28} />
                                </div>
                                <div>
                                    <h3 className="mb-0 text-white font-black tracking-tight text-2xl">Política de Disponibilidad</h3>
                                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mt-1">Directrices de Gestión de Cargas</p>
                                </div>
                            </div>

                            <p className="text-gray-400 text-lg leading-relaxed max-w-2xl font-medium">
                                Los registros de ausencia impactan directamente en el cálculo de la capacidad neta. Una ausencia de <span className="text-[#f78c38] font-black underline decoration-orange-500/30 decoration-4 underline-offset-8">160h mensuales</span> equivale a una indisponibilidad absoluta para ese periodo.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                                <div className="p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 space-y-3 hover:bg-white/10 transition-all group/card">
                                    <div className="text-orange-500 font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-1 h-4 bg-orange-500 rounded-full" />
                                        Prioridad de Carga
                                    </div>
                                    <div className="text-sm text-gray-400 font-semibold leading-relaxed">Las ausencias tienen prioridad absoluta sobre cualquier asignación de proyecto en el motor de IA.</div>
                                </div>
                                <div className="p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 space-y-3 hover:bg-white/10 transition-all group/card">
                                    <div className="text-orange-500 font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-1 h-4 bg-orange-500 rounded-full" />
                                        Cálculo Proporcional
                                    </div>
                                    <div className="text-sm text-gray-400 font-semibold leading-relaxed">Días sueltos deben registrarse convirtiendo días a horas (8h/día estándar) para una precisión FTE milimétrica.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Absences;