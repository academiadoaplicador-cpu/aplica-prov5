import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Check } from 'lucide-react';
import { Material } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import SidePanel from '../SidePanel';
import PageButton from './PageButton';

type AdjustMode = 'set' | 'percent' | 'add';

const MODES: { id: AdjustMode; label: string; hint: string }[] = [
  { id: 'set', label: 'Definir valor', hint: 'Todos passam a custar este R$/m²' },
  { id: 'percent', label: 'Reajustar %', hint: 'Ex.: 10 aumenta 10%; -5 reduz 5%' },
  { id: 'add', label: 'Somar R$', hint: 'Ex.: 5 soma R$ 5/m²; -3 subtrai' },
];

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeNewPrice(current: number, mode: AdjustMode, value: number): number {
  const next =
    mode === 'set' ? value : mode === 'percent' ? current * (1 + value / 100) : current + value;
  return Math.max(0, roundPrice(next));
}

/**
 * Edição de preço de vários materiais de uma vez. Mostra antes/depois e pede
 * confirmação antes de gravar; só os materiais selecionados são alterados.
 */
export default function MaterialBulkPricePanel({
  open,
  materials,
  onClose,
  onApply,
}: {
  open: boolean;
  /** Materiais selecionados. */
  materials: Material[];
  onClose: () => void;
  onApply: (updates: { id: string; pricePerM2: number }[]) => Promise<void>;
}) {
  const [mode, setMode] = useState<AdjustMode>('percent');
  const [rawValue, setRawValue] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRawValue('');
    setConfirming(false);
    setError(null);
  }, [open]);

  const value = parseFloat(rawValue.trim().replace(',', '.'));
  const validValue = Number.isFinite(value) && (mode !== 'set' || value >= 0);

  const preview = useMemo(
    () =>
      materials.map((m) => ({
        material: m,
        newPrice: validValue ? computeNewPrice(m.pricePerM2, mode, value) : m.pricePerM2,
      })),
    [materials, mode, value, validValue],
  );
  const changed = preview.filter((p) => p.newPrice !== p.material.pricePerM2);

  const handleApply = async () => {
    setSaving(true);
    setError(null);
    try {
      await onApply(changed.map((p) => ({ id: p.material.id, pricePerM2: p.newPrice })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar os preços.');
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      eyebrow="Edição em massa"
      title={`Alterar preço de ${materials.length} material(is)`}
      footer={
        confirming ? (
          <>
            <PageButton variant="secondary" onClick={() => setConfirming(false)} disabled={saving}>
              Voltar
            </PageButton>
            <PageButton
              variant="primary"
              icon={<Check size={16} />}
              loading={saving}
              onClick={() => void handleApply()}
            >
              Confirmar alteração
            </PageButton>
          </>
        ) : (
          <>
            <PageButton variant="secondary" onClick={onClose}>
              Cancelar
            </PageButton>
            <PageButton
              variant="primary"
              disabled={!validValue || changed.length === 0}
              onClick={() => setConfirming(true)}
            >
              Revisar e aplicar
            </PageButton>
          </>
        )
      }
    >
      <div className="space-y-5">
        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {confirming ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-100">
              {changed.length} material(is) terão o preço alterado. Orçamentos já salvos não mudam;
              os próximos orçamentos usam os novos valores. Os demais materiais do catálogo não são
              alterados.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMode(option.id)}
                  className={cn(
                    'rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors',
                    mode === option.id
                      ? 'border-emerald-500 bg-emerald-600/10 text-emerald-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-mono text-slate-500">
                {mode === 'set' ? 'Novo preço (R$/m²)' : mode === 'percent' ? 'Percentual (%)' : 'Valor (R$/m²)'}
              </label>
              <input
                value={rawValue}
                inputMode="decimal"
                autoFocus
                onChange={(e) => setRawValue(e.target.value)}
                className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2.5 text-base sm:text-sm font-mono text-emerald-400"
              />
              <span className="text-[10px] text-slate-500">
                {MODES.find((option) => option.id === mode)?.hint}
              </span>
            </div>
          </>
        )}

        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Prévia ({changed.length} com alteração)
          </p>
          <ul className="rounded-xl border border-slate-800 divide-y divide-slate-800/80 bg-slate-950/60">
            {preview.map(({ material, newPrice }) => (
              <li key={material.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{material.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {material.brand} · {material.line} · {material.type}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs tabular-nums">
                  <span className="text-slate-500">{formatCurrency(material.pricePerM2)}</span>
                  <ArrowRight size={12} className="text-slate-600" />
                  <span
                    className={cn(
                      newPrice > material.pricePerM2
                        ? 'text-emerald-400'
                        : newPrice < material.pricePerM2
                          ? 'text-amber-400'
                          : 'text-slate-400',
                    )}
                  >
                    {formatCurrency(newPrice)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SidePanel>
  );
}
