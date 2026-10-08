import { ListPlus, Pencil, Trash2 } from 'lucide-react';
import { BudgetLineItem, Material } from '../types';
import { cn, formatCurrency } from '../lib/utils';

type Accent = 'indigo' | 'emerald';

const ACCENT: Record<Accent, { text: string; button: string; badge: string }> = {
  indigo: {
    text: 'text-indigo-300',
    button: 'bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border-indigo-500/30',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  emerald: {
    text: 'text-emerald-300',
    button: 'bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border-emerald-500/30',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
};

/**
 * Itens já adicionados ao orçamento + o item em edição. Cada item mantém o
 * próprio cálculo; o total do orçamento é a soma.
 */
export default function BudgetLineItemsPanel({
  lineItems,
  currentItem,
  materials,
  accent,
  itemNoun,
  onAdd,
  onEdit,
  onRemove,
}: {
  lineItems: BudgetLineItem[];
  /** Item em edição, quando completo; entra no total e no orçamento salvo. */
  currentItem: BudgetLineItem | null;
  materials: Material[];
  accent: Accent;
  /** Ex.: "veículo", "item". */
  itemNoun: string;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const colors = ACCENT[accent];
  const all = currentItem ? [...lineItems, currentItem] : lineItems;
  const total = all.reduce((acc, item) => acc + item.totalPrice, 0);
  const materialName = (id: string) => materials.find((m) => m.id === id)?.name || 'Material';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
          Itens do orçamento ({all.length})
        </p>
      </div>

      {all.length > 0 && (
        <ul className="divide-y divide-slate-800/80">
          {all.map((item, index) => {
            const editing = item === currentItem;
            return (
              <li key={item.id} className="py-2.5 flex items-start gap-3">
                <span className="mt-0.5 text-[10px] font-mono text-slate-600 w-4 shrink-0">
                  {index + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white leading-snug break-words">
                    {item.label}
                    {editing && lineItems.length > 0 && (
                      <span
                        className={cn(
                          'ml-2 align-middle text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border',
                          colors.badge,
                        )}
                      >
                        em edição
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-snug break-words">
                    {materialName(item.materialId)} · {item.totalMaterialM2.toFixed(2)} m² ·{' '}
                    {item.totalHours.toFixed(1)} h
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm font-mono font-bold text-white mr-1">
                    {formatCurrency(item.totalPrice)}
                  </span>
                  {!editing && (
                    <>
                      <button
                        type="button"
                        onClick={() => onEdit(item.id)}
                        aria-label={`Editar ${item.label}`}
                        title="Editar item"
                        className="min-h-10 min-w-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        aria-label={`Remover ${item.label}`}
                        title="Remover item"
                        className="min-h-10 min-w-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {all.length > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <span className="text-xs font-bold text-slate-300">Total do orçamento</span>
          <span className={cn('text-lg font-black font-mono', colors.text)}>
            {formatCurrency(total)}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={onAdd}
        className={cn(
          'w-full flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border text-xs font-bold uppercase tracking-widest transition-colors active:scale-[0.98]',
          colors.button,
        )}
      >
        <ListPlus size={16} />
        Adicionar e orçar outro {itemNoun}
      </button>
      {all.length <= 1 && (
        <p className="text-[10px] text-slate-500 leading-snug text-center">
          Cada {itemNoun} mantém o próprio material e cálculo; o orçamento soma todos.
        </p>
      )}
    </div>
  );
}
