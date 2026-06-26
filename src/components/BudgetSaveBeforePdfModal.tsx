import { AlertTriangle, Save, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface BudgetSaveBeforePdfModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  accent?: 'indigo' | 'emerald';
}

export default function BudgetSaveBeforePdfModal({
  open,
  onClose,
  onSave,
  accent = 'indigo',
}: BudgetSaveBeforePdfModalProps) {
  if (!open) return null;

  const accentBtn =
    accent === 'emerald'
      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
      : 'bg-indigo-600 hover:bg-indigo-500 text-white';

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-before-pdf-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <AlertTriangle size={20} />
            </span>
            <div className="min-w-0">
              <h2
                id="save-before-pdf-title"
                className="text-base font-bold text-white leading-snug"
              >
                Salve o orçamento antes do PDF
              </h2>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Para baixar o PDF, é necessário salvar o orçamento primeiro. Assim o arquivo fica
                registrado no histórico.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Agora não
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            className={cn(
              'w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors',
              accentBtn,
            )}
          >
            <Save size={16} />
            Salvar orçamento
          </button>
        </div>
      </div>
    </div>
  );
}
