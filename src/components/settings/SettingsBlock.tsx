import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

type SettingsBlockVariant = 'entry' | 'registered';

interface SettingsBlockProps {
  title: string;
  description?: string;
  variant?: SettingsBlockVariant;
  count?: number;
  icon?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function SettingsBlock({
  title,
  description,
  variant = 'registered',
  count,
  icon,
  collapsible = false,
  defaultOpen = true,
  children,
}: SettingsBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isEntry = variant === 'entry';

  return (
    <div
      className={cn(
        'rounded-2xl border overflow-hidden',
        isEntry
          ? 'border-indigo-500/20 bg-gradient-to-b from-indigo-950/30 to-slate-950/20'
          : 'border-slate-800 bg-slate-950/50',
      )}
    >
      <div
        className={cn(
          'px-5 py-4 flex items-start gap-3 border-b',
          isEntry ? 'border-indigo-500/15 bg-indigo-950/25' : 'border-slate-800 bg-slate-900/60',
          collapsible && 'cursor-pointer hover:bg-slate-900/80 transition-colors',
        )}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setOpen((v) => !v);
                }
              }
            : undefined
        }
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
      >
        {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-white tracking-tight">{title}</h4>
            {count !== undefined && (
              <span
                className={cn(
                  'text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full',
                  isEntry ? 'bg-indigo-500/15 text-indigo-300' : 'bg-slate-800 text-slate-400',
                )}
              >
                {count}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>}
        </div>
        {collapsible && (
          <ChevronDown
            size={18}
            className={cn('text-slate-500 shrink-0 transition-transform mt-0.5', open && 'rotate-180')}
          />
        )}
      </div>

      {(!collapsible || open) && <div className="p-5 space-y-4">{children}</div>}
    </div>
  );
}

interface ImportFeedbackProps {
  status: string | null;
  errors: string[];
}

export function ImportFeedback({ status, errors }: ImportFeedbackProps) {
  if (!status) return null;

  return (
    <div
      className={cn(
        'p-3 rounded-xl border text-xs flex gap-2',
        errors.length > 0
          ? 'bg-amber-500/5 border-amber-500/20 text-amber-200'
          : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200',
      )}
    >
      <div className="flex-1">
        <p>{status}</p>
        {errors.length > 0 && (
          <ul className="mt-2 space-y-1 text-[10px] text-amber-300/80 list-disc list-inside">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface EmptyCatalogProps {
  message: string;
}

export function EmptyCatalog({ message }: EmptyCatalogProps) {
  return (
    <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/50">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
