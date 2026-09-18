import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { PlatformPricing } from '../../types';
import { adminService } from '../../services/adminService';
import { formatCurrency, cn } from '../../lib/utils';

const inputClass =
  'w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-4 text-base sm:text-sm text-white focus:ring-2 focus:ring-amber-500/50 focus:border-transparent';
const labelClass = 'text-xs text-slate-500 mb-2 block font-mono';

/** Cenário fixo só para o admin enxergar o efeito do que está editando. */
const SAMPLE_M2 = 18;
const SAMPLE_HOURS = 26;
const SAMPLE_PRICE_PER_M2 = 95;

export default function AdminPricingPage() {
  const [pricing, setPricing] = useState<PlatformPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminService
      .getPricing()
      .then(setPricing)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, []);

  const preview = useMemo(() => {
    if (!pricing) return null;
    const base = SAMPLE_M2 * SAMPLE_PRICE_PER_M2 + SAMPLE_HOURS * pricing.hourlyRate;
    const suggested =
      base *
      (1 + pricing.profitMarginPercentage / 100) *
      (1 + pricing.taxPercentage / 100);
    return {
      suggested,
      min: suggested * (1 - pricing.rangeBelowPercentage / 100),
      max: suggested * (1 + pricing.rangeAbovePercentage / 100),
    };
  }, [pricing]);

  const patch = (partial: Partial<PlatformPricing>) => {
    setPricing((prev) => (prev ? { ...prev, ...partial } : prev));
    setSaved(false);
  };

  const handleSave = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!pricing) return;
    setSaving(true);
    setError('');
    try {
      const updated = await adminService.updatePricing({
        hourlyRate: pricing.hourlyRate,
        profitMarginPercentage: pricing.profitMarginPercentage,
        taxPercentage: pricing.taxPercentage,
        rangeBelowPercentage: pricing.rangeBelowPercentage,
        rangeAbovePercentage: pricing.rangeAbovePercentage,
      });
      setPricing(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!pricing) {
    return (
      <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4">
        {error || 'Tabela de referência indisponível'}
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-slate-400">
        Base usada na estimativa que o cliente final vê antes de ter um aplicador. Não afeta os
        orçamentos das oficinas — cada uma continua com os próprios parâmetros em Custos.
      </p>

      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass} htmlFor="hourly-rate">
              Valor da hora (R$)
            </label>
            <input
              id="hourly-rate"
              type="number"
              min={1}
              step={0.01}
              value={pricing.hourlyRate}
              onChange={(e) => patch({ hourlyRate: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="margin">
              Margem (%)
            </label>
            <input
              id="margin"
              type="number"
              min={0}
              step={0.1}
              value={pricing.profitMarginPercentage}
              onChange={(e) => patch({ profitMarginPercentage: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="tax">
              Imposto (%)
            </label>
            <input
              id="tax"
              type="number"
              min={0}
              step={0.1}
              value={pricing.taxPercentage}
              onChange={(e) => patch({ taxPercentage: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="pt-1">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-3">
            Largura da faixa
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="range-below">
                Abaixo do sugerido (%)
              </label>
              <input
                id="range-below"
                type="number"
                min={0}
                max={90}
                step={1}
                value={pricing.rangeBelowPercentage}
                onChange={(e) => patch({ rangeBelowPercentage: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="range-above">
                Acima do sugerido (%)
              </label>
              <input
                id="range-above"
                type="number"
                min={0}
                step={1}
                value={pricing.rangeAbovePercentage}
                onChange={(e) => patch({ rangeAbovePercentage: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-600">
            A ponta de cima também absorve o desperdício de recorte do rolo, que só é conhecido
            quando o aplicador escolhe o material.
          </p>
        </div>

        {preview && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
              Exemplo · {SAMPLE_M2} m², {SAMPLE_HOURS} h, material a{' '}
              {formatCurrency(SAMPLE_PRICE_PER_M2)}/m²
            </p>
            <p className="mt-2 text-xl font-bold text-white tracking-tight">
              {formatCurrency(preview.min)}
              <span className="mx-2 text-slate-600 font-normal text-base">a</span>
              {formatCurrency(preview.max)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              sugerido {formatCurrency(preview.suggested)}
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className={cn(
              'h-11 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50',
              'text-white text-sm font-bold transition-colors flex items-center gap-2',
            )}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Salvando...' : 'Salvar tabela'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-400">
              <Check size={16} />
              Salvo
            </span>
          )}
          {pricing.updatedAt && (
            <span className="ml-auto text-[11px] text-slate-600 font-mono">
              atualizada em {new Date(pricing.updatedAt).toLocaleString('pt-BR')}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
