import type { ReactNode } from 'react';
import { ChevronDown, Package } from 'lucide-react';
import { Material } from '../../types';
import { cn } from '../../lib/utils';
import BudgetMobileStepHeader from './BudgetMobileStepHeader';
import type { BudgetAccent } from './budgetMobileStyles';

interface BudgetCollapsibleMaterialPanelProps {
  accent: BudgetAccent;
  step: number;
  title: string;
  description: string;
  panelClassName: string;
  selectedMaterial?: Material;
  isExpanded: boolean;
  alwaysExpanded?: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export default function BudgetCollapsibleMaterialPanel({
  accent,
  step,
  title,
  description,
  panelClassName,
  selectedMaterial,
  isExpanded,
  alwaysExpanded = false,
  onToggle,
  children,
}: BudgetCollapsibleMaterialPanelProps) {
  const iconClass = accent === 'emerald' ? 'text-emerald-500' : 'text-indigo-500';
  const panelOpen = alwaysExpanded || isExpanded;

  if (alwaysExpanded) {
    return (
      <section className={panelClassName}>
        <div className="lg:hidden">
          <BudgetMobileStepHeader
            step={step}
            title={title}
            description={description}
            accent={accent}
          />
        </div>
        <div className="hidden lg:flex items-center gap-3 mb-4 lg:mb-6">
          <Package className={cn(iconClass, 'shrink-0')} size={20} />
          <div className="min-w-0">
            <p className="text-base lg:text-lg font-bold text-white">Escolha do material</p>
            {selectedMaterial ? (
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {selectedMaterial.brand} • {selectedMaterial.line}
              </p>
            ) : null}
          </div>
        </div>
        <div className="relative z-20 space-y-4">{children}</div>
      </section>
    );
  }

  return (
    <section className={panelClassName}>
      {panelOpen && (
        <div className="lg:hidden">
          <BudgetMobileStepHeader
            step={step}
            title={title}
            description={description}
            accent={accent}
          />
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className={cn(
          'w-full flex items-center gap-3 text-left rounded-xl transition-colors hover:bg-slate-800/30 -mx-1 px-1 py-1',
          alwaysExpanded ? 'mb-4 lg:mb-6' : isExpanded ? 'mb-4 lg:mb-6' : 'mb-0',
        )}
      >
        <Package className={cn(iconClass, 'shrink-0')} size={20} />
        <div className="flex-1 min-w-0">
          <p className="text-base lg:text-lg font-bold text-white">Escolha do material</p>
          {!isExpanded && selectedMaterial ? (
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {selectedMaterial.brand} • {selectedMaterial.line}
            </p>
          ) : (
            <p className="text-[10px] text-slate-500 mt-0.5">
              {isExpanded ? 'Toque para recolher' : 'Toque para alterar o material'}
            </p>
          )}
        </div>
        <ChevronDown
          size={20}
          className={cn(
            'text-slate-400 shrink-0 transition-transform duration-200',
            isExpanded && 'rotate-180',
          )}
        />
      </button>

      {panelOpen && <div className="relative z-20 space-y-4">{children}</div>}
    </section>
  );
}
