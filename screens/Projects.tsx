import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import {
    Plus,
    Search,
    Edit2,
    ChevronRight,
    Briefcase,
    Clock,
    Users,
    ArrowLeft,
    Settings as SettingsIcon,
    Tag,
    Building2,
    CheckCircle2,
    LayoutGrid,
    Target,
    X,
    Save,
    Cloud,
    Trash
} from 'lucide-react';
import { Project, ProjectType } from '../types';
import { formatPeriod } from '../utils/calculations';
import { createProjectInSharePoint, deleteProjectInSharePoint, isAuthenticated } from '../services/sharepointService';

const Projects: React.FC = () => {
    const { projects, setProjects, assignments, consultants, settings } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'Todos' | ProjectType>('Todos');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const date = new Date(2026, 0, 1);
    const periodData = formatPeriod(date, false);
    const periodId = periodData.id;

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.client?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchType = typeFilter === 'Todos' || p.type === typeFilter;
            return matchSearch && matchType;
        });
    }, [projects, searchTerm, typeFilter]);

    const handleDeleteProject = async (project: Project) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar el proyecto "${project.name}"?`)) {
            return;
        }

        const updatedProjects = projects.filter(p => p.id !== project.id);
        setProjects(updatedProjects);

        if (isAuthenticated() && project.sharePointId) {
            try {
                await deleteProjectInSharePoint(project.id, project.sharePointId, settings.sharePointSiteUrl);
                console.log('✅ Project deleted from SharePoint');
            } catch (error) {
                console.error('⚠️ Failed to delete project from SharePoint', error);
                alert('El proyecto se eliminó localmente, pero hubo un error al eliminarlo de SharePoint.');
            }
        }

        setIsEditing(false);
        setSelectedProject(null);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const projectData: Project = {
            id: selectedProject?.id || crypto.randomUUID(),
            name: formData.get('name') as string,
            type: formData.get('type') as ProjectType,
            client: formData.get('client') as string,
            description: formData.get('description') as string,
            active: formData.get('active') === 'on',
        };

        if (selectedProject) {
            setProjects(prev => prev.map(p => p.id === projectData.id ? projectData : p));
        } else {
            setProjects(prev => [...prev, projectData]);

            // Sync to SharePoint if authenticated
            if (isAuthenticated()) {
                try {
                    await createProjectInSharePoint(projectData, settings.sharePointSiteUrl);
                    console.log('✅ Project synced to SharePoint');
                } catch (error) {
                    console.error('⚠️ Failed to sync to SharePoint:', error);
                }
            }
        }
        setIsEditing(false);
        setSelectedProject(null);
    };

    if (selectedProject && !isEditing) {
        const projectAssignments = assignments.filter(a => (a.period === periodId || a.period.startsWith(`${periodId}-W`)) && a.projectId === selectedProject.id);
        const totalHours = projectAssignments.reduce((sum, a) => sum + a.hours, 0);
        const uniqueTeam = new Set(projectAssignments.map(a => a.consultantId)).size;

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
                <button
                    onClick={() => setSelectedProject(null)}
                    className="flex items-center gap-2 text-gray-400 hover:text-primary transition-all font-bold group"
                >
                    <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" /> Volver al Catálogo
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-8">
                        <div className="card glass border-0 overflow-hidden shadow-premium text-center py-10">
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-gray-700 to-black opacity-10" />
                            <div className="relative z-10">
                                <div className="w-24 h-24 bg-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-white/50 text-[#f78c38]">
                                    <Target size={40} />
                                </div>
                                <h2 className="mb-0 text-3xl font-black tracking-tighter text-gray-800">{selectedProject.name}</h2>
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-50 rounded-full mt-4 border border-gray-100">
                                    <Building2 size={12} className="text-gray-400" />
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{selectedProject.client || 'Internal Initiative'}</span>
                                </div>

                                <div className="mt-10 flex flex-col gap-3 px-8">
                                    <button onClick={() => setIsEditing(true)} className="btn btn-primary w-full shadow-lg">
                                        <Edit2 size={16} /> Editar Configuración
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="card space-y-6">
                            <h3 className="text-lg flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-[#f78c38] rounded-full" />
                                Contexto Operativo
                            </h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 italic text-sm text-gray-500 leading-relaxed font-medium">
                                    {selectedProject.description || 'Sin descripción técnica registrada.'}
                                </div>
                                <div className="flex justify-between items-center px-4">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Tipo</span>
                                    <span className={`badge ${selectedProject.type === 'Cliente' ? 'badge-success' : 'badge-warning'}`}>{selectedProject.type}</span>
                                </div>
                                <div className="flex justify-between items-center px-4">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Estatus de Actividad</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${selectedProject.active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                        <span className="text-xs font-bold text-gray-700">{selectedProject.active ? 'En proceso' : 'Finalizado'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="card border-0 bg-gradient-to-br from-white to-gray-50 shadow-premium">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inversión de Tiempo</span>
                                    <Clock className="text-[#f78c38]" size={20} />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <div className="text-5xl font-black text-gray-800 tracking-tighter">{totalHours}h</div>
                                    <div className="text-xs font-bold text-gray-300">en {periodData.label}</div>
                                </div>
                            </div>
                            <div className="card border-0 bg-[#252729] text-white shadow-premium">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Capacidad Humana</span>
                                    <Users className="text-orange-400" size={20} />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <div className="text-5xl font-black text-white tracking-tighter">{uniqueTeam}</div>
                                    <div className="text-xs font-bold text-gray-500">Personas Asignadas</div>
                                </div>
                            </div>
                        </div>

                        <div className="card glass border-0 shadow-premium p-0 overflow-hidden">
                            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <h3 className="mb-0 text-lg">Distribución del Equipo</h3>
                                <CheckCircle2 size={18} className="text-green-500" />
                            </div>
                            <div className="table-container border-0 rounded-none shadow-none">
                                <table>
                                    <thead>
                                        <tr>
                                            <th className="px-8">Especialista</th>
                                            <th className="text-center">Carga Estimada</th>
                                            <th className="text-center">Tipo Carga</th>
                                            <th className="text-right px-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {projectAssignments.length === 0 ? (
                                            <tr><td colSpan={4} className="text-center py-16 text-gray-300 italic">No hay registros de horas para este intervalo.</td></tr>
                                        ) : (
                                            projectAssignments.map(a => {
                                                const c = consultants.find(con => con.id === a.consultantId);
                                                return (
                                                    <tr key={a.id} className="hover:bg-gray-50/50 transition-all">
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400">
                                                                    {c?.name.split(' ').map(n => n[0]).join('')}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-gray-800">{c?.name || 'Desconocido'}</div>
                                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{c?.role}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            <div className="inline-flex items-center gap-1 px-3 py-1 bg-gray-50 rounded-lg font-black text-gray-700">
                                                                {a.hours}h
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            <span className={`badge ${a.status === 'Tentativa' ? 'badge-info' : 'badge-success'}`}>
                                                                {a.status}
                                                            </span>
                                                        </td>
                                                        <td className="text-right px-8">
                                                            <ChevronRight size={18} className="text-gray-200" />
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#f78c38] uppercase tracking-widest">
                        <Briefcase size={14} /> Global Portfolio
                    </div>
                    <h1>Catálogo de Proyectos</h1>
                    <p className="text-gray-500 font-medium">Inventario centralizado de iniciativas y facturación</p>
                </div>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="btn btn-accent shadow-premium px-12 py-4 text-sm font-black uppercase tracking-widest">
                        <Plus size={20} /> Crear Proyecto
                    </button>
                )}
            </header>

            {isEditing ? (
                <div className="card glass max-w-2xl mx-auto shadow-premium border-0 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#252729] rounded-xl text-white">
                                <Tag size={20} />
                            </div>
                            <h3 className="mb-0">{selectedProject ? 'Reconfigurar Proyecto' : 'Iniciativa Nueva'}</h3>
                        </div>
                        <button onClick={() => { setIsEditing(false); setSelectedProject(null); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Identificador del Proyecto</label>
                            <input
                                name="name"
                                type="text"
                                defaultValue={selectedProject?.name}
                                placeholder="Ej: Transformación Digital CRM"
                                required
                                className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-extrabold text-gray-800"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Modalidad de Proyecto</label>
                                <select name="type" defaultValue={selectedProject?.type || 'Cliente'} className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold group">
                                    <option value="Cliente">💼 Facturable (Cliente)</option>
                                    <option value="Interno">🏠 Interno / I+D</option>
                                    <option value="Ausencia">🏖 Estructura / Ausencia</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Entidad / Cliente</label>
                                <input name="client" type="text" defaultValue={selectedProject?.client} placeholder="Nombre del Partner o Cliente" className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Alcance & Observaciones</label>
                            <textarea name="description" defaultValue={selectedProject?.description} rows={3} placeholder="Define el propósito y contexto de este proyecto..." className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-medium h-32 resize-none"></textarea>
                        </div>
                        <div className="flex items-center gap-3 px-2">
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input name="active" type="checkbox" defaultChecked={selectedProject ? selectedProject.active : true} className="w-5 h-5 rounded-lg border-2 border-gray-200 text-[#f78c38] focus:ring-orange-500/20" />
                                <label className="ml-3 text-sm font-bold text-gray-600">Considerar este proyecto como Activo</label>
                            </div>
                        </div>
                        <div className="flex justify-between gap-4 pt-6 border-t border-gray-50">
                            {selectedProject && (
                                <button type="button" onClick={() => handleDeleteProject(selectedProject)} className="btn bg-red-50 text-red-500 px-6 font-bold hover:bg-red-100">
                                    <Trash size={18} /> Eliminar
                                </button>
                            )}
                            <div className="flex gap-4 ml-auto">
                                <button type="button" onClick={() => { setIsEditing(false); setSelectedProject(null); }} className="btn btn-outline border-transparent font-bold">Cancelar</button>
                                <button type="submit" className="btn btn-primary px-10 shadow-premium">
                                    <Save size={18} /> {selectedProject ? 'Aplicar Cambios' : 'Lanzar Proyecto'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            ) : (<div className="space-y-8">
                <div className="card glass border-0 flex flex-wrap items-center gap-6 py-4 shadow-premium">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input
                            type="text"
                            placeholder="Filtrar por nombre de proyecto o cliente final..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all outline-none font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-gray-100/50 p-1 rounded-2xl border border-gray-100">
                        {['Todos', 'Cliente', 'Interno'].map(type => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type as any)}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === type ? 'bg-[#252729] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                    {filteredProjects.map(p => {
                        const projectAssignments = assignments.filter(a => (a.period === periodId || a.period.startsWith(`${periodId}-W`)) && a.projectId === p.id);
                        const totalHours = projectAssignments.reduce((sum, a) => sum + a.hours, 0);

                        return (
                            <div key={p.id} className="card group hover:shadow-2xl transition-all duration-500 cursor-pointer border-0 overflow-hidden relative" onClick={() => setSelectedProject(p)}>
                                <div className="absolute top-0 right-0 p-4 transform translate-x-1 translate-y--1 group-hover:translate-x-0 group-hover:translate-y-0 transition-all">
                                    <div className={`w-2 h-2 rounded-full ${p.active ? 'bg-green-500 shadow-[0_0_8px_green]' : 'bg-gray-200'}`} />
                                </div>

                                <div className="flex flex-col h-full space-y-6">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${p.type === 'Cliente' ? 'text-blue-500' : 'text-orange-500'}`}>{p.type}</span>
                                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-200 group-hover:bg-gray-800 group-hover:text-white transition-all">
                                                <Briefcase size={14} />
                                            </div>
                                        </div>
                                        <h3 className="mb-0 text-2xl font-black tracking-tighter text-gray-800 line-clamp-1 group-hover:text-[#f78c38] transition-colors">{p.name}</h3>
                                        <div className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                            <Building2 size={12} className="text-gray-300" /> {p.client || 'Internal Operations'}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 pt-4 border-t border-gray-50">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-white transition-all">
                                                <Clock size={14} className="text-gray-400 group-hover:text-primary transition-all" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Inversión</div>
                                                <div className="font-extrabold text-sm">{totalHours}h</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-white transition-all">
                                                <Users size={14} className="text-gray-400 group-hover:text-primary transition-all" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Equipo</div>
                                                <div className="font-extrabold text-sm">{new Set(projectAssignments.map(a => a.consultantId)).size}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#f78c38] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        );
                    })}
                    {filteredProjects.length === 0 && (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 py-20 card flex flex-col items-center justify-center gap-4 text-gray-200">
                            <LayoutGrid size={48} strokeWidth={1} />
                            <span className="text-sm font-bold uppercase tracking-widest text-gray-300">No se encontraron proyectos activos con esos parámetros.</span>
                        </div>
                    )}
                </div>
            </div>
            )}
        </div>
    );
};

export default Projects;