import React, { useState, useMemo, useEffect } from 'react';
import { Negocio, THEME, ViewType } from '../types';
import { ChevronLeft, ChevronRight, AlertTriangle, Clock } from 'lucide-react';

interface DataTableProps {
  data: Negocio[];
  activeView?: ViewType;
}

interface FilterHeaderProps {
  label: string;
  filterKey: string;
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
}

const FilterHeader: React.FC<FilterHeaderProps> = ({ label, filterKey, filters, onFilterChange }) => (
  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider align-top">
    <div className="flex flex-col gap-2">
      <span className="mb-1">{label}</span>
      <input
        type="text"
        placeholder="Filtrar..."
        value={filters[filterKey] || ''}
        onChange={(e) => onFilterChange(filterKey, e.target.value)}
        className="w-full bg-[#1e293b] border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#FF7A1A] focus:ring-1 focus:ring-[#FF7A1A] transition-all"
      />
    </div>
  </th>
);

export const DataTable: React.FC<DataTableProps> = ({ data, activeView }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const pageSize = 10;

  useEffect(() => {
    setFilters({});
    setCurrentPage(1);
  }, [activeView]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const lowerValue = String(value).toLowerCase();

        if (key === 'velocidad_slowest') {
           const stages = [
              { name: 'Situation -> Pain', val: row.velocidad.s_p },
              { name: 'Pain -> Impact', val: row.velocidad.p_i },
              { name: 'Impact -> Critical', val: row.velocidad.i_c },
              { name: 'Critical -> Decision', val: row.velocidad.c_d },
          ];
          const slowest = stages.sort((a,b) => (b.val || 0) - (a.val || 0))[0];
          const text = slowest.val !== null ? `${slowest.name} ${slowest.val}` : '';
          return text.toLowerCase().includes(lowerValue);
        }

        if (key === 'inconsistencias') {
          if (row.inconsistencias.length === 0) return 'datos correctos'.includes(lowerValue);
          return row.inconsistencias.some(inc => inc.toLowerCase().replace(/_/g, ' ').includes(lowerValue));
        }

        if (key === 'spiced') {
           return `${row.spiced.score}/5`.includes(lowerValue);
        }

        if (key === 'fechaPropuesta') {
            const dateStr = row.fechaPropuesta ? row.fechaPropuesta.toLocaleDateString() : '-';
            return dateStr.includes(lowerValue);
        }

        const rowValue = (row as any)[key];
        return String(rowValue || '').toLowerCase().includes(lowerValue);
      });
    });
  }, [data, filters]);
  
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatDate = (d: Date | null) => d ? d.toLocaleDateString() : '-';

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getStatusChip = (status: string) => {
      let styles = "bg-gray-700 text-gray-300";
      if (status === 'Won') styles = `bg-[#FF7A1A]/20 text-[#FF7A1A] border border-[#FF7A1A]/30`;
      if (status === 'Lost') styles = "bg-red-500/20 text-red-400 border border-red-500/30";
      if (status === 'Open') styles = "bg-green-500/20 text-green-400 border border-green-500/30";
      
      return (
        <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${styles}`}>
            {status}
        </span>
      );
  };

  const renderExtraColumns = (row: Negocio) => {
      if (activeView === 'VELOCIDAD') {
          const stages = [
              { name: 'Situation -> Pain', val: row.velocidad.s_p },
              { name: 'Pain -> Impact', val: row.velocidad.p_i },
              { name: 'Impact -> Critical', val: row.velocidad.i_c },
              { name: 'Critical -> Decision', val: row.velocidad.c_d },
          ];
          const slowest = stages.sort((a,b) => (b.val || 0) - (a.val || 0))[0];
          
          return (
              <>
                <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-xs">
                   {slowest.val !== null ? (
                       <span className="flex items-center text-yellow-500">
                           <Clock size={12} className="mr-1"/> {slowest.name}
                       </span>
                   ) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300 font-bold">
                    {slowest.val !== null ? `${slowest.val} días` : '-'}
                </td>
              </>
          );
      }

      if (activeView === 'CALIDAD') {
          return (
              <td className="px-6 py-4 text-gray-400 text-xs max-w-md">
                 {row.inconsistencias.length > 0 ? (
                     <div className="flex flex-col gap-1">
                         {row.inconsistencias.map((inc, i) => (
                             <span key={i} className="flex items-center text-red-400">
                                 <AlertTriangle size={10} className="mr-1"/> {inc.replace(/_/g, ' ')}
                             </span>
                         ))}
                     </div>
                 ) : (
                     <span className="text-green-500">Datos Correctos</span>
                 )}
              </td>
          );
      }

      return (
          <>
            <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                <div className="flex items-center">
                    <span className={`font-bold ${row.spiced.score >= 4 ? 'text-green-400' : row.spiced.score <= 2 ? 'text-red-400' : 'text-yellow-500'}`}>
                    {row.spiced.score}/5
                    </span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{formatDate(row.fechaPropuesta)}</td>
          </>
      );
  };

  return (
    <div className={`${THEME.colors.bgCard} ${THEME.colors.border} border rounded-xl shadow-lg overflow-hidden mt-8`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#02040a]">
            <tr>
              <FilterHeader label="Nombre" filterKey="nombre" filters={filters} onFilterChange={handleFilterChange} />
              <FilterHeader label="Cliente" filterKey="cliente" filters={filters} onFilterChange={handleFilterChange} />
              <FilterHeader label="Fase" filterKey="fase" filters={filters} onFilterChange={handleFilterChange} />
              <FilterHeader label="Estado" filterKey="estado" filters={filters} onFilterChange={handleFilterChange} />
              <FilterHeader label="Equipo" filterKey="equipoAsignado" filters={filters} onFilterChange={handleFilterChange} />
              
              {activeView === 'VELOCIDAD' ? (
                  <>
                    <FilterHeader label="Tramo Más Lento" filterKey="velocidad_slowest" filters={filters} onFilterChange={handleFilterChange} />
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider align-top pt-8">Días</th>
                  </>
              ) : activeView === 'CALIDAD' ? (
                  <FilterHeader label="Inconsistencias" filterKey="inconsistencias" filters={filters} onFilterChange={handleFilterChange} />
              ) : (
                  <>
                     <FilterHeader label="Origen" filterKey="origen" filters={filters} onFilterChange={handleFilterChange} />
                     <FilterHeader label="SPICED" filterKey="spiced" filters={filters} onFilterChange={handleFilterChange} />
                     <FilterHeader label="Fecha Prop." filterKey="fechaPropuesta" filters={filters} onFilterChange={handleFilterChange} />
                  </>
              )}
            </tr>
          </thead>
          <tbody className={`divide-y ${THEME.colors.border}`}>
            {paginatedData.map((row) => (
              <tr key={row.id} className="hover:bg-[#1e293b] transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-200">
                    <div className="flex flex-col">
                        <span>{row.nombre}</span>
                        {row.oportunidad && row.oportunidad !== row.nombre && (
                            <span className="text-xs text-gray-500">{row.oportunidad}</span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-400">{row.cliente}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-400">{row.fase}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusChip(row.estado)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-400">{row.equipoAsignado}</td>
                
                {renderExtraColumns(row)}

                {(activeView !== 'VELOCIDAD' && activeView !== 'CALIDAD') && (
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">{row.origen}</td>
                )}
              </tr>
            ))}
            {paginatedData.length === 0 && (
               <tr>
                 <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No hay datos para mostrar</td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 0 && (
        <div className={`px-4 py-3 flex items-center justify-between border-t ${THEME.colors.border} bg-[#0b101f]`}>
          <div className="flex-1 flex justify-between items-center">
             <button
               onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
               disabled={currentPage === 1}
               className="relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-300 bg-[#1f2937] hover:bg-[#374151] disabled:opacity-50 transition-colors"
             >
               <ChevronLeft className="h-4 w-4 mr-2"/> Anterior
             </button>
             <p className="text-sm text-gray-400">
               Página <span className="font-bold text-white">{currentPage}</span> de <span className="font-bold text-white">{totalPages}</span>
             </p>
             <button
               onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
               disabled={currentPage === totalPages}
               className="relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-300 bg-[#1f2937] hover:bg-[#374151] disabled:opacity-50 transition-colors"
             >
               Siguiente <ChevronRight className="h-4 w-4 ml-2"/>
             </button>
          </div>
        </div>
      )}
    </div>
  );
};