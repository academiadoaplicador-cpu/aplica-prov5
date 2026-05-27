import { Upload, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ImportCardProps {
  label: string;
  hint: string;
  columnsHint: string;
  accent: 'indigo' | 'emerald';
  isLoading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (file: File) => void;
}

export default function ImportCard({
  label,
  hint,
  columnsHint,
  accent,
  isLoading,
  fileInputRef,
  onFileSelect,
}: ImportCardProps) {
  const accentStyles =
    accent === 'indigo'
      ? {
          label: 'text-indigo-400',
          button: 'hover:border-indigo-500/40 text-indigo-400',
        }
      : {
          label: 'text-emerald-400',
          button: 'hover:border-emerald-500/40 text-emerald-400',
        };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn('text-[10px] font-mono uppercase tracking-widest', accentStyles.label)}>
            {label}
          </p>
          <p className="text-xs text-slate-500 mt-1">{hint}</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
        />
        <button
          type="button"
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-40 shrink-0',
            accentStyles.button,
          )}
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Planilha
        </button>
      </div>
      <p className="text-[10px] text-slate-600 leading-relaxed">{columnsHint}</p>
    </div>
  );
}
