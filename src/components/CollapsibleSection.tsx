import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  actions?: ReactNode;
  badge?: string;
  children: ReactNode;
  className?: string;
}

export default function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  actions,
  badge,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={cn(
        'bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center gap-3 p-6 text-left hover:bg-slate-900/80 transition-colors"
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-slate-500">{title}</h3>
          {badge && (
            <p className="text-[10px] text-slate-600 font-mono mt-1 truncate">{badge}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
        <ChevronDown
          size={20}
          className={cn('text-slate-500 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 border-t border-slate-800/80 space-y-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
