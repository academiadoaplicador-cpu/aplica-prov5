import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PageButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;
  loading?: boolean;
}

export default function PageButton({
  variant = 'secondary',
  icon,
  loading,
  children,
  className,
  disabled,
  ...props
}: PageButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        isPrimary
          ? 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-md shadow-emerald-950/40 border border-emerald-600/50'
          : 'bg-slate-900/90 text-slate-200 border border-slate-700 hover:bg-slate-800 hover:border-slate-600',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin shrink-0" /> : icon}
      {children}
    </button>
  );
}
