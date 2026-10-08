import { useEffect, useMemo, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import {
  FinancialSettings,
  Material,
  ServiceRequest,
  ServiceRequestItemRecord,
} from '../../types';
import { databaseService } from '../../services/databaseService';
import { applicatorService } from '../../services/applicatorService';
import { formatCurrency } from '../../lib/utils';

const selectClass =
  'w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50';
const inputClass =
  'w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-600';
const labelClass = 'text-[10px] text-slate-500 mb-1 block font-mono uppercase tracking-widest';

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function parsePositive(value: string): number | null {
  const n = Number(value.replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
}

interface ItemDraft {
  brand: string;
  line: string;
  materialId: string;
  customPrice: string;
  finalPrice: string;
}

const EMPTY_DRAFT: ItemDraft = { brand: '', line: '', materialId: '', customPrice: '', finalPrice: '' };

/** Conta de um item, igual à das calculadoras e à do servidor. */
function computeItem(
  item: ServiceRequestItemRecord,
  draft: ItemDraft,
  materials: Material[],
  settings: FinancialSettings | null,
  laborOnly: boolean,
) {
  const material = materials.find((m) => m.id === draft.materialId);
  const ready = laborOnly || Boolean(material);
  const pricePerM2 = laborOnly ? 0 : (parsePositive(draft.customPrice) ?? material?.pricePerM2 ?? 0);
  if (!settings || !ready) return { material, ready, pricePerM2, totals: null, finalValue: 0 };
  const materialCost = item.estimatedM2 * pricePerM2;
  const laborCost = item.estimatedHours * settings.hourlyRate;
  const suggested =
    (materialCost + laborCost) *
    (1 + settings.profitMarginPercentage / 100) *
    (1 + settings.taxPercentage / 100);
  return {
    material,
    ready,
    pricePerM2,
    totals: { materialCost, laborCost, suggested },
    finalValue: parsePositive(draft.finalPrice) ?? suggested,
  };
}

/** Monta a proposta com material do catálogo e valor real de cada item do pedido. */
export default function ProposalPanel({
  request,
  onSent,
  onCancel,
}: {
  request: ServiceRequest;
  onSent: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [settings, setSettings] = useState<FinancialSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [note, setNote] = useState(request.proposal?.note || '');

  const items = request.requestItems;
  const multi = items.length > 1;
  const laborOnly = request.supplyMode === 'mao_de_obra';

  useEffect(() => {
    let cancelled = false;
    Promise.all([databaseService.getMaterials(), databaseService.getFinancialSettings()])
      .then(([list, financial]) => {
        if (cancelled) return;
        const priced = list.filter((m) => m.pricePerM2 > 0);
        setMaterials(priced);
        setSettings(financial);
        // Reabre a proposta anterior como ponto de partida, item a item.
        const initial: Record<string, ItemDraft> = {};
        for (const item of items) {
          const previous = request.proposal?.items.find((p) => p.requestItemId === item.id);
          const draft = { ...EMPTY_DRAFT };
          if (previous) {
            draft.finalPrice = String(previous.price);
            const mat = priced.find((m) => m.id === previous.materialId && m.type === item.materialType);
            if (mat && !laborOnly) {
              draft.brand = mat.brand;
              draft.line = mat.line;
              draft.materialId = mat.id;
              if (previous.pricePerM2 !== mat.pricePerM2) draft.customPrice = String(previous.pricePerM2);
            }
          }
          initial[item.id] = draft;
        }
        setDrafts(initial);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar o catálogo');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const results = items.map((item) =>
    computeItem(item, drafts[item.id] ?? EMPTY_DRAFT, materials, settings, laborOnly),
  );
  const allReady = results.every((r) => r.ready);
  const total = results.reduce((acc, r) => acc + r.finalValue, 0);

  const updateDraft = (itemId: string, patch: Partial<ItemDraft>) =>
    setDrafts((prev) => ({ ...prev, [itemId]: { ...(prev[itemId] ?? EMPTY_DRAFT), ...patch } }));

  const handleSend = async () => {
    const missing = results.findIndex((r) => !r.ready);
    if (missing >= 0) {
      setError(
        `${multi ? `Item ${missing + 1}: ` : ''}escolha marca, linha e cor/textura do material.`,
      );
      return;
    }
    setSending(true);
    setError('');
    try {
      await applicatorService.sendProposal(request.id, {
        note,
        items: items.map((item, index) => {
          const draft = drafts[item.id] ?? EMPTY_DRAFT;
          return {
            requestItemId: item.id,
            materialId: laborOnly ? undefined : results[index].material?.id,
            customPricePerM2: laborOnly ? null : parsePositive(draft.customPrice),
            finalPrice: parsePositive(draft.finalPrice),
          };
        }),
      });
      await onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar a proposta');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 size={14} className="animate-spin" />
        Carregando catálogo...
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
      <p className="text-xs text-slate-300 leading-relaxed">
        {laborOnly
          ? 'Cotação só da aplicação: o cliente fornece o material e ele não entra no valor.'
          : `Escolha o material que você vai usar${multi ? ' em cada item' : ''}.`}{' '}
        O valor é calculado com as suas configurações financeiras sobre a área e as horas
        estimadas{multi ? ' de cada item' : ''}, e você pode ajustar o valor final antes de enviar
        ao cliente.
      </p>

      {items.map((item, index) => (
        <div key={item.id}>
          <ItemEditor
            item={item}
            index={index}
            multi={multi}
            laborOnly={laborOnly}
            draft={drafts[item.id] ?? EMPTY_DRAFT}
            onChange={(patch) => updateDraft(item.id, patch)}
            materials={materials}
            settings={settings}
            result={results[index]}
          />
        </div>
      ))}

      {multi && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
          <span className="text-sm font-bold text-white">Total para o cliente</span>
          <span className="text-lg font-black font-mono text-indigo-300">
            {allReady ? formatCurrency(total) : '—'}
          </span>
        </div>
      )}

      <div>
        <label className={labelClass}>Mensagem ao cliente (opcional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="Prazo, condições de pagamento, garantia..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-600"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={sending}
          className="h-10 px-4 rounded-xl border border-slate-800 text-sm text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-50"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !allReady}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Enviar proposta ao cliente
        </button>
      </div>
    </div>
  );
}

function ItemEditor({
  item,
  index,
  multi,
  laborOnly,
  draft,
  onChange,
  materials,
  settings,
  result,
}: {
  item: ServiceRequestItemRecord;
  index: number;
  multi: boolean;
  laborOnly: boolean;
  draft: ItemDraft;
  onChange: (patch: Partial<ItemDraft>) => void;
  materials: Material[];
  settings: FinancialSettings | null;
  result: ReturnType<typeof computeItem>;
}) {
  // Só materiais do tipo que o cliente pediu para este item são compatíveis.
  const compatible = useMemo(
    () => materials.filter((m) => m.type === item.materialType),
    [materials, item.materialType],
  );
  const brands = useMemo(() => uniqueSorted(compatible.map((m) => m.brand)), [compatible]);
  const lines = useMemo(
    () => uniqueSorted(compatible.filter((m) => m.brand === draft.brand).map((m) => m.line)),
    [compatible, draft.brand],
  );
  const colors = useMemo(
    () =>
      compatible
        .filter((m) => m.brand === draft.brand && m.line === draft.line)
        .sort((a, b) => a.colorTexture.localeCompare(b.colorTexture, 'pt-BR')),
    [compatible, draft.brand, draft.line],
  );
  const { material, totals, pricePerM2, finalValue } = result;

  return (
    <div className={multi ? 'space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 sm:p-4' : 'space-y-4'}>
      {multi && (
        <p className="text-sm font-bold text-white leading-snug break-words">
          <span className="text-indigo-300 font-mono text-xs mr-1.5">Item {index + 1}</span>
          {item.scopeLabel}
          <span className="text-slate-500 font-normal"> · {item.materialType}</span>
        </p>
      )}

      {laborOnly ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
            Material fornecido pelo cliente
          </p>
          <p className="mt-1 text-sm text-white">
            {item.clientMaterial
              ? `${item.clientMaterial.product} · ${item.clientMaterial.color}`
              : item.materialType}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tipo (pedido pelo cliente)</label>
            <p className="h-10 flex items-center px-3 rounded-xl border border-slate-800 bg-slate-950/50 text-sm text-slate-300">
              {item.materialType}
            </p>
          </div>
          <div>
            <label className={labelClass}>Marca</label>
            <select
              className={selectClass}
              value={draft.brand}
              disabled={brands.length === 0}
              onChange={(e) => onChange({ brand: e.target.value, line: '', materialId: '' })}
            >
              <option value="">{brands.length === 0 ? 'Nenhum produto deste tipo' : 'Selecione'}</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Linha / produto</label>
            <select
              className={selectClass}
              value={draft.line}
              disabled={!draft.brand}
              onChange={(e) => onChange({ line: e.target.value, materialId: '' })}
            >
              <option value="">Selecione</option>
              {lines.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Cor / textura</label>
            <select
              className={selectClass}
              value={draft.materialId}
              disabled={!draft.line}
              onChange={(e) => onChange({ materialId: e.target.value })}
            >
              <option value="">Selecione</option>
              {colors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.colorTexture || m.name} — {formatCurrency(m.pricePerM2)}/m²
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {totals && settings && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {material && !laborOnly && (
              <div>
                <label className={labelClass}>Preço por m² (opcional)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  value={draft.customPrice}
                  onChange={(e) => onChange({ customPrice: e.target.value })}
                  placeholder={`Catálogo: ${material.pricePerM2.toFixed(2)}`}
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className={labelClass}>Valor final (opcional)</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                value={draft.finalPrice}
                onChange={(e) => onChange({ finalPrice: e.target.value })}
                placeholder={`Sugerido: ${totals.suggested.toFixed(2)}`}
                className={inputClass}
              />
            </div>
          </div>

          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                {laborOnly
                  ? 'Material (fornecido pelo cliente)'
                  : `Material (${item.estimatedM2} m² × ${formatCurrency(pricePerM2)})`}
              </dt>
              <dd className="text-slate-300 shrink-0">{formatCurrency(totals.materialCost)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                Mão de obra ({item.estimatedHours} h × {formatCurrency(settings.hourlyRate)})
              </dt>
              <dd className="text-slate-300 shrink-0">{formatCurrency(totals.laborCost)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                Sugerido (margem {settings.profitMarginPercentage}% + imposto{' '}
                {settings.taxPercentage}%)
              </dt>
              <dd className="text-slate-300 shrink-0">{formatCurrency(totals.suggested)}</dd>
            </div>
            <div className="flex justify-between gap-4 pt-2 border-t border-slate-800">
              <dt className="text-white font-bold">
                {multi ? 'Valor deste item' : 'Valor para o cliente'}
              </dt>
              <dd className="text-white font-bold shrink-0">{formatCurrency(finalValue)}</dd>
            </div>
          </dl>
        </>
      )}
    </div>
  );
}
