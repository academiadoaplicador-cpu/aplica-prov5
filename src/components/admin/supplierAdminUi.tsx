import { Link } from 'react-router-dom';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { ROUTES } from '../../routes/paths';
import { cn } from '../../lib/utils';

export function SupplierAdminBackLink() {
  return (
    <Link
      to={ROUTES.admin.suppliers}
      className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
    >
      <ArrowLeft size={16} />
      Voltar à lista
    </Link>
  );
}

export function SupplierSectionIntro({
  icon: Icon,
  title,
  description,
  accent = 'amber',
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: 'amber' | 'emerald';
}) {
  const iconClass = accent === 'emerald' ? 'text-emerald-400' : 'text-amber-400';
  return (
    <div className="flex items-start gap-3 pb-4 mb-5 border-b border-slate-800/80">
      <div
        className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border',
          accent === 'emerald'
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-amber-500/10 border-amber-500/20',
        )}
      >
        <Icon size={18} className={iconClass} />
      </div>
      <div>
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export function registrationStatusClass(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'ATIVA') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  if (normalized) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  return 'text-slate-400 border-slate-700 bg-slate-900/40';
}
