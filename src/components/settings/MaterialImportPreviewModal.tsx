import { useMemo } from 'react';
import { cn, formatCurrency } from '../../lib/utils';
import { Material } from '../../types';
import ImportPreviewModalLayout from './ImportPreviewModalLayout';
import { materialKey, type MaterialImportResult } from '../../utils/materialImport';
import { formatRollOptionList, getMaterialRollOptions } from '../../utils/materialRoll';

interface MaterialImportPreviewModalProps {
  open: boolean;
  fileName: string;
  preview: MaterialImportResult | null;
  existingMaterials: Material[];
  added: number;
  updated: number;
  loading?: boolean;
  progress?: number;
  progressLabel?: string;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function MaterialImportPreviewModal({
  open,
  fileName,
  preview,
  existingMaterials,
  added,
  updated,
  loading = false,
  progress = 0,
  progressLabel,
  error = null,
  onConfirm,
  onClose,
}: MaterialImportPreviewModalProps) {
  const existingKeys = useMemo(
    () => new Set(existingMaterials.map((m) => materialKey(m))),
    [existingMaterials],
  );

  if (!open || !preview) return null;

  return (
    <ImportPreviewModalLayout
      open={open}
      fileName={fileName}
      titleId="material-import-preview-title"
      description="Revise os materiais antes de confirmar a importação para o catálogo."
      stats={[
        { label: 'Materiais', value: String(preview.materials.length) },
        { label: 'Ignorados', value: String(preview.skipped) },
        { label: 'Novos', value: String(added), accent: 'emerald' },
        { label: 'Atualizados', value: String(updated), accent: 'indigo' },
      ]}
      isEmpty={preview.materials.length === 0}
      emptyMessage="Nenhum material válido encontrado na planilha."
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
              <th className="px-3 py-2 font-mono">Produto</th>
              <th className="px-3 py-2 font-mono">Tipo</th>
              <th className="px-3 py-2 font-mono">Cor</th>
              <th className="px-3 py-2 font-mono text-right">Largura</th>
              <th className="px-3 py-2 font-mono text-right">Comp. rolo</th>
              <th className="px-3 py-2 font-mono text-right">R$/m²</th>
              <th className="px-3 py-2 font-mono text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {preview.materials.map((item) => {
              const key = materialKey(item);
              const isUpdate = existingKeys.has(key);
              const rollOpts = getMaterialRollOptions(item);
              return (
                <tr key={item.id} className="bg-slate-950/30">
                  <td className="px-3 py-2 text-slate-300">{item.brand}</td>
                  <td className="px-3 py-2 text-white max-w-[140px] truncate" title={item.name}>
                    {item.name}
                  </td>
                  <td className="px-3 py-2 text-slate-400">{item.type}</td>
                  <td className="px-3 py-2 text-slate-400 max-w-[100px] truncate" title={item.colorTexture}>
                    {item.colorTexture}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-400 tabular-nums text-[10px]">
                    {formatRollOptionList(rollOpts.widths)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-400 tabular-nums text-[10px]">
                    {formatRollOptionList(rollOpts.lengths)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-indigo-300 tabular-nums">
                    {formatCurrency(item.pricePerM2)}
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
