import { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { Appliance } from '../../types';
import ImportPreviewModalLayout from './ImportPreviewModalLayout';
import type { ApplianceImportResult } from '../../utils/applianceImport';

interface ApplianceImportPreviewModalProps {
  open: boolean;
  fileName: string;
  preview: ApplianceImportResult | null;
  existingAppliances: Appliance[];
  added: number;
  updated: number;
  loading?: boolean;
  progress?: number;
  progressLabel?: string;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

function applianceKey(make: string, type: string, model: string) {
  return `${make}|${type}|${model}`.toLowerCase();
}

export default function ApplianceImportPreviewModal({
  open,
  fileName,
  preview,
  existingAppliances,
  added,
  updated,
  loading = false,
  progress = 0,
  progressLabel,
  error = null,
  onConfirm,
  onClose,
}: ApplianceImportPreviewModalProps) {
  const existingKeys = useMemo(
    () => new Set(existingAppliances.map((a) => applianceKey(a.make, a.type, a.model))),
    [existingAppliances],
  );

  if (!open || !preview) return null;

  return (
    <ImportPreviewModalLayout
      open={open}
      fileName={fileName}
      titleId="appliance-import-preview-title"
      description="Revise os eletrodomésticos e dimensões antes de confirmar a importação."
      stats={[
        { label: 'Eletros', value: String(preview.appliances.length) },
        { label: 'Ignorados', value: String(preview.skipped) },
        { label: 'Novos', value: String(added), accent: 'emerald' },
        { label: 'Atualizados', value: String(updated), accent: 'indigo' },
      ]}
      isEmpty={preview.appliances.length === 0}
      emptyMessage="Nenhum eletrodoméstico válido encontrado na planilha."
      loading={loading}
      progress={progress}
      progressLabel={progressLabel}
      error={error}
      errors={preview.errors}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <div className="rounded-xl border border-slate-800 overflow-hidden mx-5 my-4">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-500 sticky top-0">
            <tr>
              <th className="px-3 py-2 font-mono">Marca</th>
              <th className="px-3 py-2 font-mono">Tipo</th>
              <th className="px-3 py-2 font-mono">Modelo</th>
              <th className="px-3 py-2 font-mono text-right">L (m)</th>
              <th className="px-3 py-2 font-mono text-right">A (m)</th>
              <th className="px-3 py-2 font-mono text-right">P (m)</th>
              <th className="px-3 py-2 font-mono text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {preview.appliances.map((item) => {
              const key = applianceKey(item.make, item.type, item.model);
              const isUpdate = existingKeys.has(key);
              return (
                <tr key={key} className="bg-slate-950/30">
                  <td className="px-3 py-2 text-slate-300">{item.make}</td>
                  <td className="px-3 py-2 text-slate-400">{item.type}</td>
                  <td className="px-3 py-2 text-white">{item.model}</td>
                  <td className="px-3 py-2 text-right font-mono text-indigo-300 tabular-nums">
                    {item.width.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-indigo-300 tabular-nums">
                    {item.height.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-indigo-300 tabular-nums">
                    {item.depth.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={cn(
                        'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                        isUpdate
                          ? 'bg-indigo-500/10 text-indigo-300'
                          : 'bg-emerald-500/10 text-emerald-300',
                      )}
                    >
                      {isUpdate ? 'Atualizar' : 'Novo'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ImportPreviewModalLayout>
  );
}
