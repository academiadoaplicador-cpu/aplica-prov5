import { useEffect, useState } from 'react';
import { Info, Save } from 'lucide-react';
import { Material, MaterialType } from '../../types';
import { cn } from '../../lib/utils';
import { getMaterialRollOptions, parseLengthValues, parseWidthValues } from '../../utils/materialRoll';
import SidePanel from '../SidePanel';
import PageButton from './PageButton';

const MATERIAL_TYPES: MaterialType[] = ['Cast', 'Calandrado', 'PPF', 'Poliéster'];
const RECOMMENDATIONS = ['Automotivo', 'Eletrodomésticos', 'Móveis', 'Parede', 'Sinalização'];

/** Campos digitados como texto, para aceitar vírgula e listas com ";". */
interface MaterialDraft {
  material: Material;
  price: string;
  difficulty: string;
  rollWidths: string;
  rollLengths: string;
}

function formatList(values: number[]): string {
  return values.map((n) => String(n).replace('.', ',')).join('; ');
}

function toDraft(material: Material): MaterialDraft {
  const roll = getMaterialRollOptions(material);
  return {
    material,
    price: String(material.pricePerM2).replace('.', ','),
    difficulty:
      material.applicationDifficulty != null
        ? String(material.applicationDifficulty).replace('.', ',')
        : '',
    rollWidths: formatList(roll.widths),
    rollLengths: formatList(roll.lengths),
  };
}

function parseDecimal(raw: string): number {
  return parseFloat(raw.trim().replace(',', '.'));
}

/** Formulário de cadastro e edição de material, no painel lateral. */
export default function MaterialFormPanel({
  material,
  isNew,
  onClose,
  onSave,
}: {
  /** Material a editar, ou o rascunho de um novo; null fecha o painel. */
  material: Material | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (material: Material) => Promise<void>;
}) {
  const [draft, setDraft] = useState<MaterialDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(material ? toDraft(material) : null);
    setError(null);
  }, [material]);

  const m = draft?.material;
  const update = (updates: Partial<Material>) =>
    setDraft((prev) => (prev ? { ...prev, material: { ...prev.material, ...updates } } : prev));
  const setText = (field: Exclude<keyof MaterialDraft, 'material'>, value: string) =>
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));

  const toggleRecommendation = (rec: string) => {
    if (!m) return;
    const current = m.recommendedFor;
    update({
      recommendedFor: current.includes(rec) ? current.filter((r) => r !== rec) : [...current, rec],
    });
  };

  const handleSave = async () => {
    if (!draft || !m) return;
    const name = m.name.trim();
    const brand = m.brand.trim();
    const price = parseDecimal(draft.price);
    if (!name) return setError('Informe o nome do produto.');
    if (!brand) return setError('Informe a marca.');
    if (!Number.isFinite(price) || price < 0) return setError('Informe um preço por m² válido.');

    const difficulty = parseDecimal(draft.difficulty);
    const widths = parseWidthValues(draft.rollWidths);
    const lengths = parseLengthValues(draft.rollLengths);

    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...m,
        name,
        brand,
        line: m.line.trim(),
        colorTexture: m.colorTexture.trim(),
        pricePerM2: price,
        applicationDifficulty: Number.isFinite(difficulty) ? difficulty : undefined,
        rollWidthsM: widths.length > 0 ? widths : undefined,
        rollLengthsM: lengths.length > 0 ? lengths : undefined,
        rollWidthM: widths.length > 0 ? Math.max(...widths) : undefined,
        rollLengthM: lengths.length > 0 ? Math.max(...lengths) : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar o material.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidePanel
      open={Boolean(material)}
      onClose={onClose}
      eyebrow={isNew ? 'Novo material' : 'Editar material'}
      title={isNew ? 'Cadastrar material' : m?.name || 'Material'}
      footer={
        <>
          <PageButton variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </PageButton>
          <PageButton
            variant="primary"
            icon={<Save size={16} />}
            loading={saving}
            onClick={() => void handleSave()}
          >
            {isNew ? 'Cadastrar' : 'Salvar'}
          </PageButton>
        </>
      }
    >
      {draft && m && (
        <div className="space-y-5">
          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome / produto *" value={m.name} onChange={(v) => update({ name: v })} />
            <Field label="Marca *" value={m.brand} onChange={(v) => update({ brand: v })} />
            <Field label="Linha" value={m.line} onChange={(v) => update({ line: v })} />
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-mono text-slate-500">Tipo</label>
              <select
                value={m.type}
                onChange={(e) => update({ type: e.target.value as MaterialType })}
                className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2.5 text-base sm:text-sm text-white"
              >
                {MATERIAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Cor / textura" value={m.colorTexture} onChange={(v) => update({ colorTexture: v })} />
            <Field
              label="Preço (R$/m²) *"
              value={draft.price}
              onChange={(v) => setText('price', v)}
              inputMode="decimal"
              mono
            />
            <Field label="Durabilidade" value={m.durability} onChange={(v) => update({ durability: v })} />
            <Field
              label="Dificuldade de aplicação"
              value={draft.difficulty}
              onChange={(v) => setText('difficulty', v)}
              inputMode="decimal"
              hint="Grau de 1 a 3 (ex.: 1,3)"
            />
            <Field
              label="Larguras do rolo (m)"
              value={draft.rollWidths}
              onChange={(v) => setText('rollWidths', v)}
              hint="Separe por ; (ex.: 1,52; 1,22)"
            />
            <Field
              label="Comprimentos do rolo (m)"
              value={draft.rollLengths}
              onChange={(v) => setText('rollLengths', v)}
              hint="Usados no plano de corte"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] uppercase font-mono text-slate-500">Recomendado para</label>
            <div className="flex flex-wrap gap-2">
              {RECOMMENDATIONS.map((rec) => (
                <button
                  key={rec}
                  type="button"
                  onClick={() => toggleRecommendation(rec)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all',
                    m.recommendedFor.includes(rec)
                      ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-600',
                  )}
                >
                  {rec}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] uppercase font-mono text-slate-500 flex items-center gap-1">
              <Info size={10} /> Detalhes
            </label>
            <textarea
              value={m.details ?? ''}
              onChange={(e) => update({ details: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 h-24 resize-none"
            />
          </div>
        </div>
      )}
    </SidePanel>
  );
}

function Field({
  label,
  value,
  onChange,
  mono,
  hint,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  hint?: string;
  inputMode?: 'decimal' | 'text';
}) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] uppercase font-mono text-slate-500">{label}</label>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2.5 text-base sm:text-sm text-white',
          mono && 'font-mono text-emerald-400',
        )}
      />
      {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
    </div>
  );
}
