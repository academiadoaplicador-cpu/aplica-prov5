import ImportPreviewModalLayout from '../settings/ImportPreviewModalLayout';
import type { SupplierImportPreview } from '../../utils/supplierImport';
import { formatCnpj } from '../../utils/cnpj';

interface SupplierImportPreviewModalProps {
  open: boolean;
  fileName: string;
  preview: SupplierImportPreview | null;
  loading?: boolean;
  progress?: number;
  progressLabel?: string;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function SupplierImportPreviewModal({
  open,
  fileName,
  preview,
  loading = false,
  progress = 0,
  progressLabel,
  error = null,
  onConfirm,
  onClose,
}: SupplierImportPreviewModalProps) {
  const validCount = preview?.suppliers.length ?? 0;
  const errorCount = preview?.errors.length ?? 0;
  const skipped = preview?.skipped ?? 0;

  return (
    <ImportPreviewModalLayout
      open={open}
      fileName={fileName}
      titleId="supplier-import-title"
      description="Revise os fornecedores antes de confirmar a importação."
      stats={[
        { label: 'Válidos', value: String(validCount), accent: 'emerald' },
        { label: 'Erros', value: String(errorCount) },
        { label: 'Ignorados', value: String(skipped) },
      ]}
      isEmpty={validCount === 0}
      emptyMessage="Nenhum fornecedor válido na planilha."
      loading={loading}
      progress={progress}
      progressLabel={progressLabel}
      error={error}
      errors={preview?.errors ?? []}
      confirmDisabled={validCount === 0}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      {validCount > 0 && (
        <div className="overflow-x-auto max-h-48 rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800">
                <th className="px-3 py-2 text-slate-500 font-mono uppercase">Razão social</th>
                <th className="px-3 py-2 text-slate-500 font-mono uppercase">CNPJ</th>
                <th className="px-3 py-2 text-slate-500 font-mono uppercase">Contatos</th>
                <th className="px-3 py-2 text-slate-500 font-mono uppercase">Vínculos</th>
              </tr>
            </thead>
            <tbody>
              {preview!.suppliers.slice(0, 20).map((s, i) => (
                <tr key={i} className="border-b border-slate-800/60">
                  <td className="px-3 py-2 text-white">{s.legalName}</td>
                  <td className="px-3 py-2 text-slate-400 font-mono">{formatCnpj(s.cnpj || '')}</td>
                  <td className="px-3 py-2 text-slate-400">{s.contacts?.length ?? 0}</td>
                  <td className="px-3 py-2 text-slate-400">{s.productLinks?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {validCount > 20 && (
            <p className="text-[10px] text-slate-500 p-2 font-mono">
              +{validCount - 20} fornecedor(es) não exibidos
            </p>
          )}
        </div>
      )}
    </ImportPreviewModalLayout>
  );
}
