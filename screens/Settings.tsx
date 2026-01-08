import React, { useState } from 'react';
import { useAppStore } from '../store';
import {
    Settings as SettingsIcon,
    Save,
    Info,
    Zap,
    Smartphone,
    CheckCircle2,
    Eye,
    Gauge,
    Cloud,
    Download,
    Database,
    Loader2,
    Key,
    ExternalLink
} from 'lucide-react';
import { authenticateUser, fetchAllSharePointData, isAuthenticated, getCurrentUser } from '../services/sharepointService';
import { getDefaultSharePointConfig } from '../services/sharepointConfig';


const SettingsScreen: React.FC = () => {
    const { settings, setSettings, loadSharePointData } = useAppStore();
    const [formData, setFormData] = useState(settings);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setSettings(formData);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const handleManualSync = async () => {
        setIsSyncing(true);
        setSyncError(null);
        try {
            const config = getDefaultSharePointConfig();

            // Ensure authenticated
            if (!isAuthenticated()) {
                await authenticateUser();
            }

            const data = await fetchAllSharePointData(config.siteUrl);
            loadSharePointData(data);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error: any) {
            console.error('Manual sync failed:', error);
            setSyncError(error.message || 'Error al sincronizar');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#f78c38] uppercase tracking-widest">
                        <SettingsIcon size={14} /> System Configuration
                    </div>
                    <h1>Preferencias del Sistema</h1>
                    <p className="text-gray-500 font-medium">Ajusta los algoritmos de cálculo y parámetros visuales</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-8">
                    {/* SharePoint Integration Card */}
                    <div className="card glass border-0 shadow-premium p-8">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-green-500 rounded-2xl text-white shadow-lg shadow-green-500/20">
                                <Cloud size={24} />
                            </div>
                            <div>
                                <h3 className="mb-0 text-xl font-extrabold tracking-tight">Integración SharePoint</h3>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">Sincronización con listas corporativas</p>
                            </div>
                        </div>

                        <div className="bg-gray-50/50 rounded-2xl p-6 mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Database size={18} className="text-gray-400" />
                                <span className="text-sm font-bold text-gray-600">Listas configuradas:</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white p-3 rounded-xl text-center border border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Consultores</span>
                                    <p className="text-xs font-mono text-green-600 mt-1">SP_Consultores</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl text-center border border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Proyectos</span>
                                    <p className="text-xs font-mono text-green-600 mt-1">SP_Proyectos</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl text-center border border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Asignaciones</span>
                                    <p className="text-xs font-mono text-green-600 mt-1">SP_Asignaciones</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl mb-6 border border-gray-100">
                            <div className="flex items-center gap-3">
                                {isAuthenticated() ? (
                                    <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                                        <CheckCircle2 size={16} /> Conectado como {getCurrentUser()?.username}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
                                        <Cloud size={16} /> No autenticado
                                    </div>
                                )}
                            </div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Auto-sync Activado
                            </div>
                        </div>

                        {syncError && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-500 rounded-2xl text-xs font-semibold flex items-center gap-2">
                                <Info size={14} /> {syncError}
                            </div>
                        )}

                        <button
                            onClick={handleManualSync}
                            disabled={isSyncing}
                            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.15em] text-xs hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            {isSyncing ? 'Sincronizando...' : 'Actualizar desde SharePoint'}
                        </button>
                    </div>

                    {/* Gemini AI Integration Card */}
                    <div className="card glass border-0 shadow-premium p-8">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-purple-500 rounded-2xl text-white shadow-lg shadow-purple-500/20">
                                <Key size={24} />
                            </div>
                            <div>
                                <h3 className="mb-0 text-xl font-extrabold tracking-tight">Integración Gemini AI</h3>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">Motor de recomendaciones inteligentes</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">API Key de Google Gemini</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        placeholder="Introduce tu API Key de Gemini..."
                                        className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-purple-500/5 transition-all font-medium outline-none pr-12"
                                        value={formData.geminiApiKey || ''}
                                        onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                                    />
                                    <Key size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1.5 px-2">
                                    <Info size={10} className="text-purple-400" />
                                    Necesaria para activar el Copilot AI en el Dashboard.
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    {formData.geminiApiKey ? (
                                        <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                                            <CheckCircle2 size={16} /> API Key configurada
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
                                            <Key size={16} /> Sin configurar
                                        </div>
                                    )}
                                </div>
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-1 hover:text-purple-600 transition-colors"
                                >
                                    Obtener API Key <ExternalLink size={10} />
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="card glass border-0 shadow-premium p-8">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-orange-500 rounded-2xl text-white shadow-lg shadow-orange-500/20">
                                <Gauge size={24} />
                            </div>
                            <div>
                                <h3 className="mb-0 text-xl font-extrabold tracking-tight">Umbrales de Rendimiento</h3>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">Lógica de disponibilidad y alertas</p>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Umbral Bench Mensual</label>
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all font-extrabold outline-none"
                                            value={formData.benchMonthlyThreshold}
                                            onChange={(e) => setFormData({ ...formData, benchMonthlyThreshold: parseInt(e.target.value) || 0 })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300">HRS</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1.5 px-2">
                                        <Info size={10} className="text-orange-400" />
                                        Riesgo si la carga es inferior a este valor.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Umbral Bench Semanal</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all font-extrabold outline-none"
                                            value={formData.benchWeeklyThreshold}
                                            onChange={(e) => setFormData({ ...formData, benchWeeklyThreshold: parseInt(e.target.value) || 0 })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300">HRS</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Capacidad Estándar (Mes)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all font-extrabold outline-none"
                                            value={formData.standardMonthlyCapacity}
                                            onChange={(e) => setFormData({ ...formData, standardMonthlyCapacity: parseInt(e.target.value) || 0 })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300">HRS</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium px-2">Base de cálculo para FTE (Carga/160h).</p>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Capacidad Estándar (Semana)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all font-extrabold outline-none"
                                            value={formData.standardWeeklyCapacity}
                                            onChange={(e) => setFormData({ ...formData, standardWeeklyCapacity: parseInt(e.target.value) || 0 })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300">HRS</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-50 flex items-center justify-between">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest max-w-[200px]">Estas variables afectan a los motores de recomendación.</span>
                                <button type="submit" className="btn btn-primary px-8 shadow-premium">
                                    <Save size={18} /> Guardar Ajustes
                                </button>
                            </div>

                            {showSuccess && (
                                <div className="p-4 bg-green-500 text-white rounded-2xl flex items-center gap-3 text-sm font-bold shadow-lg shadow-green-500/20 animate-in slide-in-from-top-4">
                                    <CheckCircle2 size={20} /> Configuración sincronizada
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="card glass border-0 shadow-premium p-8">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                <Eye size={24} />
                            </div>
                            <div>
                                <h3 className="mb-0 text-xl font-extrabold tracking-tight">Experiencia Visual</h3>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">Personalización de la interfaz</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-5 bg-gray-50/50 hover:bg-white rounded-2xl border border-transparent hover:border-gray-50 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-xl shadow-sm group-hover:bg-blue-50 transition-all">
                                        <Smartphone size={18} className="text-gray-400 group-hover:text-blue-500" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-extrabold text-gray-700">Vista Inicial Predeterminada</div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Carga inicial del dashboard</div>
                                    </div>
                                </div>
                                <select
                                    className="p-2 bg-white border-2 border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/5 cursor-pointer"
                                    value={formData.defaultView}
                                    onChange={(e) => setFormData({ ...formData, defaultView: e.target.value as any })}
                                >
                                    <option value="Mensual">📅 Mensual</option>
                                    <option value="Semanal">🗓 Semanal</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between p-5 bg-gray-50/50 hover:bg-white rounded-2xl border border-transparent hover:border-gray-50 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-xl shadow-sm group-hover:bg-orange-50 transition-all">
                                        <Zap size={18} className="text-gray-400 group-hover:text-orange-500" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-extrabold text-gray-700">Incluir Horas Tentativas</div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Impacto en KPIs globales</div>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer scale-110">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.includeTentativeByDefault}
                                        onChange={(e) => setFormData({ ...formData, includeTentativeByDefault: e.target.checked })}
                                    />
                                    <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500 shadow-inner"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsScreen;