import type { ReactNode } from 'react';
import { X, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import PageButton from './PageButton';
import ImportProgressBar from './ImportProgressBar';

export interface ImportPreviewStat {
  label: string;
  value: string;
  accent?: 'emerald' | 'indigo';
}

interface ImportPreviewModalLayoutProps {
  open: boolean;
  fileName: string;
  titleId: string;
  description: string;
  stats: ImportPreviewStat[];
  isEmpty: boolean;
  emptyMessage?: string;
  loading?: boolean;
  progress?: number;
  progressLabel?: string;
  error?: string | null;
  errors?: string[];
  warnings?: string[];
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
}

export default function ImportPreviewModalLayout({
  open,
  fileName,
  titleId,
  description,
  stats,
  isEmpty,
  emptyMessage = 'Nenhum registro válido encontrado na planilha.',
  loading = false,
  progress = 0,
  progressLabel,
  error = null,
  errors = [],
  warnings = [],
  confirmDisabled = false,
  onConfirm,
  onClose,
  children,
}: ImportPreviewModalLayoutProps) {
  const hasIssues = errors.length > 0 || warnings.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Fechar pré-visualização"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={loading ? undefined : onClose}
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 w-auto sm:w-full sm:max-w-3xl max-h-[min(90vh,900px)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="shrink-0 px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 mb-1">
                  Pré-visualização da importação
                </p>
                <h2 id={titleId} className="text-lg font-bold text-white truncate">
                  {fileName}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{description}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className={cn(
                'shrink-0 px-5 py-3 border-b border-slate-800 bg-slate-950/50 grid gap-3',
                stats.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3',
              )}
            >
              {stats.map((stat) => (
                <ImportPreviewStat key={stat.label} {...stat} />
              ))}
            </div>

            {isEmpty ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-2">
                  <FileSpreadsheet className="mx-auto text-slate-600" size={32} />
                  <p className="text-sm text-slate-400">{emptyMessage}</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
            )}

            {error && (
              <div className="shrink-0 px-5 py-3 border-t border-red-500/20 bg-red-500/10">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-200">{error}</p>
                </div>
              </div>
            )}

            {hasIssues && !error && (
              <div className="shrink-0 px-5 py-3 border-t border-slate-800 bg-amber-500/5 max-h-32 overflow-y-auto">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <ul className="space-y-1 text-[10px] text-amber-200/80 list-disc list-inside">
                    {[...errors, ...warnings].slice(0, 6).map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {(loading || progress > 0) && (
              <div className="shrink-0 px-5 py-3 border-t border-slate-800 bg-slate-950/60">
                <ImportProgressBar
                  progress={progress}
                  label={progressLabel || (loading ? 'Importando…' : 'Processando…')}
                />
              </div>
            )}

            <div className="shrink-0 px-5 py-4 border-t border-slate-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <PageButton variant="secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </PageButton>
              <PageButton
                variant="primary"
                loading={loading}
                disabled={confirmDisabled || isEmpty}
                onClick={onConfirm}
              >
                Confirmar importação
              </PageButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ImportPreviewStat({
  label,
  value,
  accent,
}: ImportPreviewStat) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
      <p className="text-[9px] uppercase font-mono text-slate-500">{label}</p>
      <p
        className={cn(
          'text-lg font-bold tabular-nums',
          accent === 'emerald' && 'text-emerald-400',
          accent === 'indigo' && 'text-indigo-400',
          !accent && 'text-white',
        )}
      >
        {value}
      </p>
    </div>
  );
}
