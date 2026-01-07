import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, Loader2, Cloud } from 'lucide-react';
import { importFile } from '../services/fileImportService';
import { SharePointConnector } from './SharePointConnector';
import { THEME, Consultant, Project, Assignment } from '../types';

interface FileLoaderProps {
  onDataLoaded: (data: any[]) => void;
  onSharePointDataLoaded?: (data: { consultants: Consultant[]; projects: Project[]; assignments: Assignment[] }) => void;
}

type DataSourceMode = 'file' | 'sharepoint';

export const FileLoader: React.FC<FileLoaderProps> = ({ onDataLoaded, onSharePointDataLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<DataSourceMode>('sharepoint');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const data = await importFile(file);
      onDataLoaded(data);
    } catch (err: any) {
      setError(err.message || 'Error al leer el fichero');
    } finally {
      setLoading(false);
    }
  };

  const handleSharePointData = (data: { consultants: Consultant[]; projects: Project[]; assignments: Assignment[] }) => {
    if (onSharePointDataLoaded) {
      onSharePointDataLoaded(data);
    }
  };

  return (
    <div className={`${THEME.colors.bgCard} p-8 rounded-2xl shadow-2xl border ${THEME.colors.border} text-center max-w-2xl w-full`}>
      <div className="mb-6 flex justify-center">
        <div className="p-4 bg-gray-800 rounded-full">
          <FileSpreadsheet size={48} className={THEME.colors.accent} />
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-2 text-white">Control de Ocupación</h2>
      <p className="text-gray-400 mb-8 text-sm leading-relaxed">
        Carga datos desde un archivo o conéctate directamente a SharePoint para gestionar la capacidad y asignaciones de tu equipo.
      </p>

      {/* Tab Navigation */}
      <div className="flex items-center justify-center mb-8 bg-gray-900/50 p-1 rounded-lg border border-gray-800">
        <button
          onClick={() => setMode('sharepoint')}
          className={`flex items-center px-6 py-2.5 rounded-md text-sm font-semibold transition-all ${mode === 'sharepoint'
            ? 'bg-orange-500 text-white shadow-lg'
            : 'text-gray-400 hover:text-white'
            }`}
        >
          <Cloud className="w-4 h-4 mr-2" />
          SharePoint
        </button>
        <button
          onClick={() => setMode('file')}
          className={`flex items-center px-6 py-2.5 rounded-md text-sm font-semibold transition-all ${mode === 'file'
            ? 'bg-orange-500 text-white shadow-lg'
            : 'text-gray-400 hover:text-white'
            }`}
        >
          <Upload className="w-4 h-4 mr-2" />
          Cargar Archivo
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[350px]">
        {mode === 'file' ? (
          <div>
            <p className="text-gray-400 mb-6 text-sm">
              Sube tu exportación de SharePoint (.xlsx o .csv)
            </p>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className={`w-full inline-flex items-center justify-center px-6 py-3 ${THEME.colors.accentBg} text-white font-bold rounded-lg hover:bg-orange-600 transition disabled:opacity-50 shadow-lg shadow-orange-900/20`}
            >
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Upload className="mr-2 h-5 w-5" />}
              {loading ? 'Procesando Datos...' : 'Seleccionar Fichero'}
            </button>

            {error && (
              <p className="mt-6 text-red-400 text-sm bg-red-900/20 border border-red-900/50 p-3 rounded">{error}</p>
            )}
          </div>
        ) : (
          <SharePointConnector onDataLoaded={handleSharePointData} />
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-800">
        <p className="text-xs text-gray-600">Control de Ocupación · Raona · Resource Management</p>
      </div>
    </div>
  );
};