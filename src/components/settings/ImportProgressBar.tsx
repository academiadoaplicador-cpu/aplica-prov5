import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface ImportProgressBarProps {
  progress: number;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function ImportProgressBar({
  progress,
  label,
  size = 'md',
  className,
}: ImportProgressBarProps) {
  if (progress <= 0) return null;

  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || progress > 0) && (
        <div className="flex items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-wider text-slate-500">
          <span>{label || 'Processando…'}</span>
          <span className="text-indigo-400 tabular-nums">{Math.round(progress)}%</span>
        </div>
      )}
      <div
        className={cn(
          'rounded-full bg-slate-800 overflow-hidden',
          size === 'sm' ? 'h-1.5' : 'h-2',
        )}
      >
        {size === 'sm' ? (
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-200"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        ) : (
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ ease: 'easeOut', duration: 0.25 }}
          />
        )}
      </div>
    </div>
  );
}
