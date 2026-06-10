import BudgetNotice from '../budget-mobile/BudgetNotice';
import { useBudgetNotice } from '../../hooks/useBudgetNotice';
import { Trash2, Pencil, CheckCircle2, AlertCircle, Ruler, Plus } from 'lucide-react';
import { Vehicle, VehicleSize } from '../../types';
import {
  findVehiclePartWithSameName,
  getAvailableStandardPartsToAdd,
  getVehiclePartList,
  hasPartMeasurement,
  resolveCustomPartId,
} from '../../utils/vehiclePartsUtils';
import { cn } from '../../lib/utils';
import DataTable, { type DataTableColumn } from './DataTable';

interface VehicleCatalogTableProps {
  vehicles: Vehicle[];
  editingId: string | null;
  onSelectRow: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<Vehicle>) => void;
  onRemove: (id: string) => void;
  isVehicleComplete: (vehicle: Vehicle) => boolean;
}

export default function VehicleCatalogTable({
  vehicles,
  editingId,
  onSelectRow,
  onUpdate,
  onRemove,
  isVehicleComplete,
}: VehicleCatalogTableProps) {
  const columns: DataTableColumn<Vehicle>[] = [
    {
      id: 'make',
      header: 'Fabricante',
      sortable: true,
      sortValue: (v) => v.make,
      cell: (v) => <span className="font-medium text-white">{v.make || '—'}</span>,
    },
    {
      id: 'model',
      header: 'Modelo',
      sortable: true,
      sortValue: (v) => v.model,
      cell: (v) => <span className="text-slate-300">{v.model}</span>,
    },
    {
      id: 'year',
      header: 'Ano',
      sortable: true,
      sortValue: (v) => v.year,
      align: 'center',
      className: 'w-20',
      cell: (v) => <span className="font-mono text-slate-400 tabular-nums">{v.year}</span>,
    },
    {
      id: 'size',
      header: 'Porte',
      sortable: true,
      sortValue: (v) => v.size,
      className: 'hidden sm:table-cell',
      cell: (v) => (
        <span className="text-[10px] text-slate-400 max-w-[160px] truncate block" title={v.size}>
          {v.size.replace(' (', '\n(').split('\n')[0]}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Medidas',
      sortable: true,
      sortValue: (v) => (isVehicleComplete(v) ? 1 : 0),
      align: 'center',
      cell: (v) =>
        isVehicleComplete(v) ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
            <CheckCircle2 size={12} /> Completo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
            <AlertCircle size={12} /> Parcial
          </span>
        ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      className: 'w-24',
      cell: (v) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onSelectRow(editingId === v.id ? null : v.id)}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(v.id)}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      rows={vehicles}
      getRowId={(v) => v.id}
      columns={columns}
      selectedId={editingId}
      onSelectRow={onSelectRow}
      defaultSort={{ columnId: 'make', direction: 'asc' }}
      searchPlaceholder="Buscar fabricante, modelo, ano..."
      filterRow={(v, q) =>
        `${v.make} ${v.model} ${v.year} ${v.size}`.toLowerCase().includes(q)
      }
      emptyMessage="Nenhum veículo na lista."
      itemLabel="veículos"
      renderExpanded={(vehicle) => (
          <div className="space-y-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">Editar veículo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              <Field label="Fabricante" value={vehicle.make} onChange={(v) => onUpdate(vehicle.id, { make: v })} />
              <Field label="Modelo" value={vehicle.model} onChange={(v) => onUpdate(vehicle.id, { model: v })} />
              <Field label="Ano" value={vehicle.year} onChange={(v) => onUpdate(vehicle.id, { year: v })} />
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-mono text-slate-500">Porte</label>
                <select
                  value={vehicle.size}
                  onChange={(e) => onUpdate(vehicle.id, { size: e.target.value as VehicleSize })}
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
            <VehiclePartsEditor vehicle={vehicle} onUpdate={onUpdate} />
          </div>
      )}
    />
  );
}

function VehiclePartsEditor({
  vehicle,
  onUpdate,
}: {
  vehicle: Vehicle;
  onUpdate: (id: string, updates: Partial<Vehicle>) => void;
}) {
  const [partToAdd, setPartToAdd] = useState('');
  const [customPartName, setCustomPartName] = useState('');
  const [customPartError, setCustomPartError] = useState<string | null>(null);
  const [renameErrors, setRenameErrors] = useState<Record<string, string>>({});
  const { notice, showNotice, clearNotice } = useBudgetNotice();
  const configuredParts = getVehiclePartList(vehicle);
  const availableParts = getAvailableStandardPartsToAdd(vehicle);

  const handleAddStandardPart = () => {
    if (!partToAdd) return;
    onUpdate(vehicle.id, {
      partMeasurements: {
        ...vehicle.partMeasurements,
        [partToAdd]: { width: 1.52, length: 0 },
      },
    });
    setPartToAdd('');
    showNotice('Peça padrão adicionada. Preencha as medidas.', 'success');
  };

  const handleAddCustomPart = () => {
    const name = customPartName.trim();
    if (!name) return;

    const duplicate = findVehiclePartWithSameName(vehicle, name);
    if (duplicate) {
      setCustomPartError(`Já existe uma peça com o nome "${duplicate.name}".`);
      return;
    }

    const partId = resolveCustomPartId(name, Object.keys(vehicle.partMeasurements));
    onUpdate(vehicle.id, {
      partMeasurements: {
        ...vehicle.partMeasurements,
        [partId]: { width: 1.52, length: 0, name },
      },
    });
    setCustomPartName('');
    setCustomPartError(null);
    showNotice('Nova peça adicionada. Preencha as medidas.', 'success');
  };

  const handleUpdateCustomPartName = (partId: string, name: string) => {
    const m = vehicle.partMeasurements[partId];
    if (!m) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setRenameErrors((prev) => {
        const next = { ...prev };
        delete next[partId];
        return next;
      });
      onUpdate(vehicle.id, {
        partMeasurements: {
          ...vehicle.partMeasurements,
          [partId]: { ...m, name: trimmed },
        },
      });
      return;
    }

    const duplicate = findVehiclePartWithSameName(vehicle, trimmed, partId);
    if (duplicate) {
      setRenameErrors((prev) => ({
        ...prev,
        [partId]: `Já existe uma peça com o nome "${duplicate.name}".`,
      }));
      return;
    }

    setRenameErrors((prev) => {
      const next = { ...prev };
      delete next[partId];
      return next;
    });
    onUpdate(vehicle.id, {
      partMeasurements: {
        ...vehicle.partMeasurements,
        [partId]: { ...m, name: trimmed },
      },
    });
  };

  const handleRemovePart = (partId: string) => {
    const { [partId]: _removed, ...rest } = vehicle.partMeasurements;
    onUpdate(vehicle.id, { partMeasurements: rest });
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 relative">
      <BudgetNotice notice={notice} onDismiss={clearNotice} accent="indigo" className="sm:max-w-sm" />
      <div className="space-y-3">
        <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
          <Ruler size={12} /> Medidas por peça (m)
        </h5>
        {availableParts.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-[9px] font-mono uppercase text-slate-500 sm:shrink-0">
              Peça padrão
            </label>
            <select
              value={partToAdd}
              onChange={(e) => setPartToAdd(e.target.value)}
              className="flex-1 h-9 bg-slate-950 border border-slate-800 rounded-lg px-2.5 text-xs text-white"
            >
              <option value="">Selecione capô, parachoque…</option>
              {availableParts.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!partToAdd}
              onClick={handleAddStandardPart}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={12} /> Adicionar
            </button>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-[9px] font-mono uppercase text-slate-500 sm:shrink-0">
              Nova peça
            </label>
            <input
              type="text"
              value={customPartName}
              onChange={(e) => {
                setCustomPartName(e.target.value);
                if (customPartError) setCustomPartError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomPart();
                }
              }}
              placeholder="Digite o nome da peça"
              className={cn(
                'flex-1 h-9 bg-slate-950 border rounded-lg px-2.5 text-xs text-white placeholder:text-slate-600',
                customPartError ? 'border-amber-500/50' : 'border-slate-800',
              )}
            />
            <button
              type="button"
              disabled={!customPartName.trim()}
              onClick={handleAddCustomPart}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={12} /> Adicionar
            </button>
          </div>
          {customPartError && (
            <p className="text-[10px] text-amber-400 pl-0 sm:pl-[4.5rem]">{customPartError}</p>
          )}
        </div>
      </div>

      {configuredParts.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-2">
          Nenhuma peça cadastrada. Escolha uma peça padrão ou digite um nome personalizado acima.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {configuredParts.map((part) => {
            const m = vehicle.partMeasurements[part.id] || { width: 1.52, length: 0 };
            const measured = hasPartMeasurement(vehicle, part.id);
            return (
              <div
                key={part.id}
                className={cn(
                  'p-3 rounded-lg border bg-slate-900/50 space-y-2',
                  measured ? 'border-slate-800' : 'border-amber-500/30',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  {part.isCustom ? (
                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        type="text"
                        value={m.name ?? part.name}
                        onChange={(e) => handleUpdateCustomPartName(part.id, e.target.value)}
                        className={cn(
                          'w-full text-[9px] font-bold text-slate-300 uppercase bg-slate-950 border rounded px-1.5 py-1',
                          renameErrors[part.id] ? 'border-amber-500/50' : 'border-slate-800',
                        )}
                        placeholder="Nome da peça"
                      />
                      {renameErrors[part.id] && (
                        <span className="text-[8px] text-amber-400 block leading-tight">
                          {renameErrors[part.id]}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[9px] font-bold text-slate-500 uppercase block leading-tight">
                      {part.name}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePart(part.id)}
                    className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                    title="Remover peça"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {!measured && (
                  <span className="text-[8px] font-mono uppercase text-amber-400/90 block">
                    Preencha largura e comprimento
                  </span>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] text-slate-600">Larg.</label>
                    <PartMeasurementInput
                      value={m.width}
                      onChange={(width) => {
                        onUpdate(vehicle.id, {
                          partMeasurements: {
                            ...vehicle.partMeasurements,
                            [part.id]: { ...m, width },
                          },
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[8px] text-slate-600">Comp.</label>
                    <PartMeasurementInput
                      value={m.length}
                      onChange={(length) => {
                        onUpdate(vehicle.id, {
                          partMeasurements: {
                            ...vehicle.partMeasurements,
                            [part.id]: { ...m, length },
                          },
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PartMeasurementInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);

  const displayValue = focused ? draft : value === 0 ? '' : String(value);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onFocus={() => {
        setFocused(true);
        setDraft(value === 0 ? '' : String(value));
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(',', '.');
        if (!/^\d*\.?\d*$/.test(raw)) return;
        setDraft(raw);
        if (raw === '' || raw === '.') return;
        const parsed = parseFloat(raw);
        if (!Number.isNaN(parsed)) onChange(parsed);
      }}
      onBlur={() => {
        setFocused(false);
        if (draft === '' || draft === '.') {
          onChange(0);
          return;
        }
        const parsed = parseFloat(draft);
        onChange(Number.isNaN(parsed) ? 0 : parsed);
      }}
      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-indigo-400 font-mono"
    />
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
