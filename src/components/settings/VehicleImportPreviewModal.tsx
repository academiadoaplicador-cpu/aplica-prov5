import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Vehicle } from '../../types';
import { cn } from '../../lib/utils';
import { getPartInfo } from '../../utils/vehiclePartsUtils';
import type { VehicleImportResult } from '../../utils/vehicleImport';
import ImportPreviewModalLayout from './ImportPreviewModalLayout';

interface VehicleImportPreviewModalProps {
  open: boolean;
  fileName: string;
  preview: VehicleImportResult | null;
  existingVehicles: Vehicle[];
  added: number;
  updated: number;
  loading?: boolean;
  progress?: number;
  progressLabel?: string;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

function vehicleKey(make: string, model: string, year: string) {
  return `${make}|${model}|${year}`.toLowerCase();
}

export default function VehicleImportPreviewModal({
  open,
  fileName,
  preview,
  existingVehicles,
  added,
  updated,
  loading = false,
  progress = 0,
  progressLabel,
  error = null,
  onConfirm,
  onClose,
}: VehicleImportPreviewModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const existingKeys = useMemo(
    () => new Set(existingVehicles.map((v) => vehicleKey(v.make, v.model, v.year))),
    [existingVehicles],
  );

  const totalParts = useMemo(
    () =>
      preview?.vehicles.reduce(
        (acc, v) => acc + Object.keys(v.partMeasurements || {}).length,
        0,
      ) ?? 0,
    [preview],
  );

  if (!open || !preview) return null;

  return (
    <ImportPreviewModalLayout
      open={open}
      fileName={fileName}
      titleId="vehicle-import-preview-title"
      description="Revise os veículos e medidas antes de confirmar. Somente peças do catálogo automotivo são importadas."
      stats={[
        { label: 'Veículos', value: String(preview.vehicles.length) },
        { label: 'Peças', value: String(totalParts) },
        { label: 'Novos', value: String(added), accent: 'emerald' },
        { label: 'Atualizados', value: String(updated), accent: 'indigo' },
      ]}
      isEmpty={preview.vehicles.length === 0}
      emptyMessage="Nenhum veículo válido encontrado na planilha."
      loading={loading}
      progress={progress}
      progressLabel={progressLabel}
      error={error}
      errors={preview.errors}
      warnings={preview.warnings}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <div className="divide-y divide-slate-800">
        {preview.vehicles.map((vehicle) => {
          const rowKey = vehicleKey(vehicle.make, vehicle.model, vehicle.year);
          const isExpanded = expandedId === rowKey;
          const isUpdate = existingKeys.has(rowKey);
          const partEntries = Object.entries(vehicle.partMeasurements || {});

          return (
            <div key={rowKey}>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : rowKey)}
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-slate-800/40 transition-colors text-left"
              >
                <ChevronDown
                  size={16}
                  className={cn(
                    'text-slate-500 shrink-0 transition-transform',
                    isExpanded && 'rotate-180',
                  )}
                />
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-1 sm:gap-4">
                  <div>
                    <p className="text-sm font-medium text-white truncate">
                      {vehicle.make} {vehicle.model}{' '}
                      <span className="text-slate-500 font-mono">{vehicle.year}</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {partEntries.length} peça(s)
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full h-fit',
                      isUpdate
                        ? 'bg-indigo-500/10 text-indigo-300'
                        : 'bg-emerald-500/10 text-emerald-300',
                    )}
                  >
                    {isUpdate ? 'Atualizar' : 'Novo'}
                  </span>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4">
                      <div className="rounded-xl border border-slate-800 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-3 py-2 font-mono">Peça</th>
                              <th className="px-3 py-2 font-mono text-right">Largura (m)</th>
                              <th className="px-3 py-2 font-mono text-right">Altura (m)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80">
                            {partEntries.map(([partId, measure]) => (
                              <tr key={partId} className="bg-slate-950/30">
                                <td className="px-3 py-2 text-slate-300">
                                  {getPartInfo(partId, vehicle).name}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-indigo-300 tabular-nums">
                                  {measure.width.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-indigo-300 tabular-nums">
                                  {measure.length.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </ImportPreviewModalLayout>
  );
}
