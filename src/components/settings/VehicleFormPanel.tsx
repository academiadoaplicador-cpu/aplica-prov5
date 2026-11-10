import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Vehicle, VehicleSize } from '../../types';
import SidePanel from '../SidePanel';
import PageButton from './PageButton';
import { VehiclePartsEditor } from './VehicleCatalogTable';

/** Formulário de cadastro e edição de veículo, no painel lateral. */
export default function VehicleFormPanel({
  vehicle,
  isNew,
  onClose,
  onSave,
}: {
  /** Veículo a editar, ou o rascunho de um novo; null fecha o painel. */
  vehicle: Vehicle | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (vehicle: Vehicle) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Vehicle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(vehicle);
    setError(null);
  }, [vehicle]);

  const update = (updates: Partial<Vehicle>) =>
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));

  const handleSave = async () => {
    if (!draft) return;
    const make = draft.make.trim();
    const model = draft.model.trim();
    const year = draft.year.trim();
    if (!make) return setError('Informe o fabricante.');
    if (!model) return setError('Informe o modelo.');
    if (!year) return setError('Informe o ano.');

    setSaving(true);
    setError(null);
    try {
      await onSave({ ...draft, make, model, year });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar o veículo.');
    } finally {
      setSaving(false);
    }
  };

  const title = draft && !isNew ? `${draft.make} ${draft.model}`.trim() || 'Veículo' : 'Cadastrar veículo';

  return (
    <SidePanel
      open={Boolean(vehicle)}
      onClose={onClose}
      size="lg"
      eyebrow={isNew ? 'Novo veículo' : 'Editar veículo'}
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
            <Field label="Fabricante *" value={draft.make} onChange={(v) => update({ make: v })} />
            <Field label="Modelo *" value={draft.model} onChange={(v) => update({ model: v })} />
            <Field label="Ano *" value={draft.year} onChange={(v) => update({ year: v })} />
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-mono text-slate-500">Porte</label>
              <select
                value={draft.size}
                onChange={(e) => update({ size: e.target.value as VehicleSize })}
                className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2.5 text-base sm:text-sm text-white"
              >
                {Object.values(VehicleSize).map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <VehiclePartsEditor vehicle={draft} onUpdate={(_id, updates) => update(updates)} />
        </div>
      )}
    </SidePanel>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] uppercase font-mono text-slate-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2.5 text-base sm:text-sm text-white"
      />
    </div>
  );
}
