import { useEffect, useMemo, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { FinancialSettings, Material, ServiceRequest } from '../../types';
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

/** Monta a proposta com o material do catálogo e o valor real para o cliente. */
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

  const initial = request.proposal;
  const [type, setType] = useState(initial?.materialType || request.materialType);
  const [brand, setBrand] = useState('');
  const [line, setLine] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [finalPrice, setFinalPrice] = useState(initial ? String(initial.price) : '');
  const [note, setNote] = useState(initial?.note || '');

  useEffect(() => {
    let cancelled = false;
    Promise.all([databaseService.getMaterials(), databaseService.getFinancialSettings()])
      .then(([list, financial]) => {
        if (cancelled) return;
        setMaterials(list.filter((m) => m.pricePerM2 > 0));
        setSettings(financial);
        const previous = initial && list.find((m) => m.id === initial.materialId);
        if (previous) {
          setType(previous.type);
          setBrand(previous.brand);
          setLine(previous.line);
          setMaterialId(previous.id);
          if (initial.pricePerM2 !== previous.pricePerM2) {
            setCustomPrice(String(initial.pricePerM2));
          }
        }
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

  const types = useMemo(() => uniqueSorted(materials.map((m) => m.type)), [materials]);
  const brands = useMemo(
    () => uniqueSorted(materials.filter((m) => m.type === type).map((m) => m.brand)),
    [materials, type],
  );
  const lines = useMemo(
    () =>
      uniqueSorted(
        materials.filter((m) => m.type === type && m.brand === brand).map((m) => m.line),
      ),
    [materials, type, brand],
  );
  const colors = useMemo(
    () =>
      materials
        .filter((m) => m.type === type && m.brand === brand && m.line === line)
        .sort((a, b) => a.colorTexture.localeCompare(b.colorTexture, 'pt-BR')),
    [materials, type, brand, line],
  );

  const material = materials.find((m) => m.id === materialId);
  const pricePerM2 = parsePositive(customPrice) ?? material?.pricePerM2 ?? 0;

  const totals = useMemo(() => {
    if (!settings || !material) return null;
    const materialCost = request.estimatedM2 * pricePerM2;
    const laborCost = request.estimatedHours * settings.hourlyRate;
    const suggested =
      (materialCost + laborCost) *
      (1 + settings.profitMarginPercentage / 100) *
      (1 + settings.taxPercentage / 100);
    return { materialCost, laborCost, suggested };
  }, [settings, material, pricePerM2, request.estimatedM2, request.estimatedHours]);

  const finalValue = parsePositive(finalPrice) ?? totals?.suggested ?? 0;

  const handleSend = async () => {
    if (!material) {
      setError('Escolha marca, linha e cor/textura do material.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await applicatorService.sendProposal(request.id, {
        materialId: material.id,
        customPricePerM2: parsePositive(customPrice),
        finalPrice: parsePositive(finalPrice),
        note,
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
        Escolha o material que você vai usar. O valor é calculado com as suas configurações
        financeiras sobre {request.estimatedM2} m² e cerca de {request.estimatedHours} h, e
        você pode ajustar o valor final antes de enviar ao cliente.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Tipo</label>
          <select
            className={selectClass}
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setBrand('');
              setLine('');
              setMaterialId('');
            }}
          >
            {!types.includes(type) && <option value={type}>{type}</option>}
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Marca</label>
          <select
            className={selectClass}
            value={brand}
            disabled={brands.length === 0}
            onChange={(e) => {
              setBrand(e.target.value);
              setLine('');
              setMaterialId('');
            }}
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
            value={line}
            disabled={!brand}
            onChange={(e) => {
              setLine(e.target.value);
              setMaterialId('');
            }}
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
            value={materialId}
            disabled={!line}
            onChange={(e) => setMaterialId(e.target.value)}
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

      {material && totals && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Preço por m² (opcional)</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder={`Catálogo: ${material.pricePerM2.toFixed(2)}`}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Valor final (opcional)</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                placeholder={`Sugerido: ${totals.suggested.toFixed(2)}`}
                className={inputClass}
              />
            </div>
          </div>

          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                Material ({request.estimatedM2} m² × {formatCurrency(pricePerM2)})
              </dt>
              <dd className="text-slate-300">{formatCurrency(totals.materialCost)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                Mão de obra ({request.estimatedHours} h × {formatCurrency(settings!.hourlyRate)})
              </dt>
              <dd className="text-slate-300">{formatCurrency(totals.laborCost)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                Sugerido (margem {settings!.profitMarginPercentage}% + imposto{' '}
                {settings!.taxPercentage}%)
              </dt>
              <dd className="text-slate-300">{formatCurrency(totals.suggested)}</dd>
            </div>
            <div className="flex justify-between gap-4 pt-2 border-t border-slate-800">
              <dt className="text-white font-bold">Valor para o cliente</dt>
              <dd className="text-white font-bold">{formatCurrency(finalValue)}</dd>
            </div>
          </dl>
        </>
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
          disabled={sending || !material}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Enviar proposta ao cliente
        </button>
      </div>
    </div>
  );
}
