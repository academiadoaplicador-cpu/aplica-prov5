import { Trash2, Pencil, CheckCircle2, AlertCircle, Ruler } from 'lucide-react';
import { Vehicle, VehicleSize } from '../../types';
import { getVehiclePartList } from '../../utils/vehiclePartsUtils';
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
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
              <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Ruler size={12} /> Medidas por peça (m)
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {getVehiclePartList(vehicle).map((part) => {
                  const m = vehicle.partMeasurements[part.id] || { width: 1.52, length: 0 };
                  return (
                    <div key={part.id} className="p-3 rounded-lg border border-slate-800 bg-slate-900/50 space-y-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">{part.name}</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] text-slate-600">Larg.</label>
                          <input
                            type="number"
                            step="0.01"
                            value={m.width}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              onUpdate(vehicle.id, {
                                partMeasurements: {
                                  ...vehicle.partMeasurements,
                                  [part.id]: { ...m, width: val },
                                },
                              });
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-indigo-400 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] text-slate-600">Comp.</label>
                          <input
                            type="number"
                            step="0.01"
                            value={m.length}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              onUpdate(vehicle.id, {
                                partMeasurements: {
                                  ...vehicle.partMeasurements,
                                  [part.id]: { ...m, length: val },
                                },
                              });
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-indigo-400 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
      )}
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
