import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import type { BudgetNoticeState } from '../../hooks/useBudgetNotice';
import type { BudgetAccent } from './budgetMobileStyles';

interface BudgetNoticeProps {
  notice: BudgetNoticeState | null;
  onDismiss: () => void;
  accent?: BudgetAccent;
  className?: string;
}

export default function BudgetNotice({
  notice,
  onDismiss,
  accent = 'emerald',
  className,
}: BudgetNoticeProps) {
  const isSuccess = notice?.type === 'success';

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          role="alert"
          className={cn(
            'fixed z-[60] left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md',
            'top-[calc(0.75rem+env(safe-area-inset-top,0px))] lg:top-6',
            className,
          )}
        >
          <div
            className={cn(
              'flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md',
              isSuccess
                ? accent === 'emerald'
                  ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100'
                  : 'bg-indigo-950/95 border-indigo-500/40 text-indigo-100'
                : 'bg-amber-950/95 border-amber-500/40 text-amber-100',
            )}
          >
            {isSuccess ? (
              <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
            )}
            <p className="flex-1 text-sm leading-snug">{notice.message}</p>
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              aria-label="Fechar aviso"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
