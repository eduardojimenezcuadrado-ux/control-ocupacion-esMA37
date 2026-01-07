import React, { useState } from 'react';
import { Cloud, Loader2, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { initializeMSAL, authenticateUser, fetchAllSharePointData } from '../services/sharepointService';
import { getDefaultSharePointConfig, SP_LISTS } from '../services/sharepointConfig';
import { THEME, Consultant, Project, Assignment } from '../types';

interface SharePointConnectorProps {
    onDataLoaded: (data: {
        consultants: Consultant[];
        projects: Project[];
        assignments: Assignment[];
    }) => void;
}

type ConnectionState = 'idle' | 'authenticating' | 'fetching' | 'success' | 'error';

export const SharePointConnector: React.FC<SharePointConnectorProps> = ({ onDataLoaded }) => {
    const defaultConfig = getDefaultSharePointConfig();

    const [siteUrl, setSiteUrl] = useState(defaultConfig.siteUrl);
    const [clientId, setClientId] = useState(defaultConfig.clientId);
    const [tenantId, setTenantId] = useState(defaultConfig.tenantId);

    const [state, setState] = useState<ConnectionState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [loadedCounts, setLoadedCounts] = useState<{ consultants: number; projects: number; assignments: number } | null>(null);

    const handleConnect = async () => {
        // Validation
        if (!siteUrl) {
            setError('Por favor, introduce la URL del sitio SharePoint');
            return;
        }

        if (!clientId || !tenantId) {
            setError('Por favor, introduce el Client ID y Tenant ID de Azure AD');
            return;
        }

        setError(null);
        setState('authenticating');
        setStatusMessage('Iniciando autenticación...');
        setLoadedCounts(null);

        try {
            // Initialize MSAL
            initializeMSAL(clientId, tenantId);

            // Authenticate user
            setStatusMessage('Abriendo ventana de autenticación de Microsoft...');
            await authenticateUser();

            // Fetch all data from three lists
            setState('fetching');
            setStatusMessage('Obteniendo datos de SharePoint (Consultores, Proyectos, Asignaciones)...');
            const data = await fetchAllSharePointData(siteUrl);

            setLoadedCounts({
                consultants: data.consultants.length,
                projects: data.projects.length,
                assignments: data.assignments.length,
            });

            setState('success');
            setStatusMessage('¡Conexión exitosa!');

            // Pass data to parent component
            setTimeout(() => {
                onDataLoaded(data);
            }, 500);

        } catch (err: any) {
            setState('error');
            let errorMessage = err.message || 'Error al conectar con SharePoint';

            // Add helpful context for common errors
            if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
                errorMessage += '\n\n⚠️ Error 403: Asegúrate de que:\n• La aplicación Azure AD tiene el permiso "Sites.Read.All"\n• El administrador ha concedido consentimiento a los permisos\n• La URL del sitio SharePoint es correcta';
            }

            setError(errorMessage);
            setStatusMessage('');
        }
    };

    return (
        <div className="space-y-6">
            {/* List names info */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-300 mb-3">
                    <Database className="h-4 w-4 text-orange-400" />
                    <span className="font-semibold">Listas SharePoint configuradas:</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-900/50 p-2 rounded text-center">
                        <span className="text-gray-400">Consultores</span>
                        <p className="text-orange-400 font-mono">{SP_LISTS.CONSULTORES}</p>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded text-center">
                        <span className="text-gray-400">Proyectos</span>
                        <p className="text-orange-400 font-mono">{SP_LISTS.PROYECTOS}</p>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded text-center">
                        <span className="text-gray-400">Asignaciones</span>
                        <p className="text-orange-400 font-mono">{SP_LISTS.ASIGNACIONES}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        URL del Sitio SharePoint
                    </label>
                    <input
                        type="text"
                        value={siteUrl}
                        onChange={(e) => setSiteUrl(e.target.value)}
                        placeholder="https://tuempresa.sharepoint.com/sites/TuSitio"
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                        disabled={state === 'authenticating' || state === 'fetching'}
                    />
                </div>

                <div className="pt-4 border-t border-gray-800">
                    <p className="text-xs text-gray-500 mb-3">
                        Credenciales de Azure AD (necesarias para autenticación)
                    </p>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                Client ID
                            </label>
                            <input
                                type="text"
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                disabled={state === 'authenticating' || state === 'fetching'}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                Tenant ID
                            </label>
                            <input
                                type="text"
                                value={tenantId}
                                onChange={(e) => setTenantId(e.target.value)}
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                disabled={state === 'authenticating' || state === 'fetching'}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={handleConnect}
                disabled={state === 'authenticating' || state === 'fetching' || state === 'success'}
                className={`w-full inline-flex items-center justify-center px-6 py-3 ${THEME.colors.accentBg} text-white font-bold rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-900/20`}
            >
                {state === 'authenticating' || state === 'fetching' ? (
                    <>
                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                        {state === 'authenticating' ? 'Autenticando...' : 'Cargando Datos...'}
                    </>
                ) : state === 'success' ? (
                    <>
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Conectado
                    </>
                ) : (
                    <>
                        <Cloud className="mr-2 h-5 w-5" />
                        Autenticar y Conectar
                    </>
                )}
            </button>

            {statusMessage && state !== 'success' && (
                <div className="flex items-center gap-2 text-sm text-blue-400 bg-blue-900/20 border border-blue-900/50 p-3 rounded">
                    <Loader2 className="animate-spin h-4 w-4" />
                    {statusMessage}
                </div>
            )}

            {loadedCounts && state === 'success' && (
                <div className="bg-green-900/20 border border-green-900/50 p-4 rounded-lg">
                    <p className="text-sm text-green-400 font-semibold mb-2">✓ Datos cargados correctamente:</p>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-300">
                        <div className="text-center">
                            <span className="text-2xl font-bold text-green-400">{loadedCounts.consultants}</span>
                            <p className="text-gray-400">Consultores</p>
                        </div>
                        <div className="text-center">
                            <span className="text-2xl font-bold text-green-400">{loadedCounts.projects}</span>
                            <p className="text-gray-400">Proyectos</p>
                        </div>
                        <div className="text-center">
                            <span className="text-2xl font-bold text-green-400">{loadedCounts.assignments}</span>
                            <p className="text-gray-400">Asignaciones</p>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-900/20 border border-red-900/50 p-4 rounded">
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span className="whitespace-pre-line">{error}</span>
                </div>
            )}

            {state === 'idle' && !clientId && !tenantId && (
                <div className="text-xs text-gray-500 bg-gray-800/50 border border-gray-700 p-4 rounded space-y-2">
                    <p className="font-semibold text-gray-400">ℹ️ Configuración necesaria:</p>
                    <p>Para conectar con SharePoint, necesitas registrar una aplicación en Azure AD.</p>
                    <p>Consulta el archivo <code className="bg-gray-900 px-1 py-0.5 rounded">SHAREPOINT_SETUP.md</code> para instrucciones detalladas.</p>
                </div>
            )}
        </div>
    );
};

