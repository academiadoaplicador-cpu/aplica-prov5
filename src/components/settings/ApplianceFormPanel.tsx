import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Appliance } from '../../types';
import { cn } from '../../lib/utils';
import SidePanel from '../SidePanel';
import PageButton from './PageButton';

type Dimension = 'width' | 'height' | 'depth';

const DIMENSIONS: { field: Dimension; label: string }[] = [
  { field: 'width', label: 'Largura (m) *' },
  { field: 'height', label: 'Altura (m) *' },
  { field: 'depth', label: 'Profundidade (m) *' },
];

function formatDimension(value: number): string {
  return value > 0 ? String(value).replace('.', ',') : '';
}

/** Formulário de cadastro e edição de eletrodoméstico, no painel lateral. */
export default function ApplianceFormPanel({
  appliance,
  isNew,
  onClose,
  onSave,
}: {
  /** Eletro a editar, ou o rascunho de um novo; null fecha o painel. */
  appliance: Appliance | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (appliance: Appliance) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Appliance | null>(null);
  // Medidas digitadas como texto, para aceitar vírgula.
  const [dims, setDims] = useState<Record<Dimension, string>>({ width: '', height: '', depth: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(appliance);
    setDims({
      width: appliance ? formatDimension(appliance.width) : '',
      height: appliance ? formatDimension(appliance.height) : '',
      depth: appliance ? formatDimension(appliance.depth) : '',
    });
    setError(null);
  }, [appliance]);

  const update = (updates: Partial<Appliance>) =>
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));

  const handleSave = async () => {
    if (!draft) return;
    const make = draft.make.trim();
    const model = draft.model.trim();
    const type = draft.type.trim();
    if (!make) return setError('Informe a marca.');
    if (!model) return setError('Informe o modelo.');
    if (!type) return setError('Informe o tipo (ex.: Geladeira).');

    const parsed = {} as Record<Dimension, number>;
    for (const { field, label } of DIMENSIONS) {
      const value = parseFloat(dims[field].trim().replace(',', '.'));
      if (!Number.isFinite(value) || value <= 0) {
        return setError(`Informe ${label.replace(' *', '').toLowerCase()} maior que zero.`);
      }
      parsed[field] = value;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({ ...draft, make, model, type, ...parsed });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar o eletrodoméstico.');
    } finally {
      setSaving(false);
    }
  };

  const title =
    draft && !isNew ? `${draft.make} ${draft.model}`.trim() || 'Eletrodoméstico' : 'Cadastrar eletro';

  return (
    <SidePanel
      open={Boolean(appliance)}
      onClose={onClose}
      eyebrow={isNew ? 'Novo eletro' : 'Editar eletro'}
      title={title}
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
      {draft && (
        <div className="space-y-5">
          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Marca *" value={draft.make} onChange={(v) => update({ make: v })} />
            <Field label="Modelo *" value={draft.model} onChange={(v) => update({ model: v })} />
            <div className="sm:col-span-2">
              <Field
                label="Tipo *"
                value={draft.type}
                onChange={(v) => update({ type: v })}
                hint="Ex.: Geladeira, Fogão, Lava-louças"
              />
            </div>
            {DIMENSIONS.map(({ field, label }) => (
              <Field
                key={field}
                label={label}
                value={dims[field]}
                onChange={(v) => setDims((prev) => ({ ...prev, [field]: v }))}
                inputMode="decimal"
                mono
              />
            ))}
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
  hint,
  mono,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  mono?: boolean;
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
          mono && 'font-mono',
        )}
      />
      {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
    </div>
  );
}
