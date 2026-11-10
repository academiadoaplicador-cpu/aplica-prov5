import { useMemo } from 'react';
import { AlertTriangle, Layers } from 'lucide-react';
import { BudgetLineItem, Material, Vehicle } from '../types';
import { buildBudgetCuttingPlan } from '../utils/budgetCuttingPlan';
import RollNestingPreview from './RollNestingPreview';

/**
 * Plano de corte do orçamento inteiro, um rolo por material. Só aparece com
 * mais de um item: com um item, o plano do próprio item já é o do orçamento.
 */
export default function BudgetCuttingPlan({
  lineItems,
  materials,
  vehicles,
  accent,
}: {
  lineItems: BudgetLineItem[];
  materials: Material[];
  vehicles?: Vehicle[];
  accent: 'indigo' | 'emerald';
}) {
  const plan = useMemo(
    () => buildBudgetCuttingPlan(lineItems, materials, vehicles),
    [lineItems, materials, vehicles],
  );

  if (lineItems.length < 2 || plan.groups.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <Layers size={18} className={accent === 'emerald' ? 'text-emerald-400' : 'text-indigo-400'} />
        <div>
          <h3 className="text-sm font-bold text-white">
            Plano de corte do orçamento · {plan.groups.length}{' '}
            {plan.groups.length === 1 ? 'material' : 'materiais'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cortes do mesmo material dividem o rolo; materiais diferentes ficam em rolos separados.
            Os números (#1, #2…) indicam o item do orçamento.
          </p>
        </div>
      </div>

      {plan.groups.map((group) => (
        <RollNestingPreview
          key={group.key}
          accent={accent}
          rollWidth={group.rollWidth}
          rollLength={group.rollLength}
          parts={group.parts}
          materialLabel={
            group.material
              ? `${group.material.brand} · ${group.material.line} · ${group.material.colorTexture}`
              : 'Material não encontrado no catálogo'
          }
          caption={`Itens: ${group.itemLabels.join(' · ')}`}
        />
      ))}

      {plan.itemsWithoutRoll.length > 0 && (
        <p className="flex items-start gap-2 text-xs text-amber-300/80">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          Sem medida de rolo cadastrada, fora do plano: {plan.itemsWithoutRoll.join(' · ')}
        </p>
      )}
    </section>
  );
}
