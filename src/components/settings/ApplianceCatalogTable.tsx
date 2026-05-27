import { Trash2, Pencil } from 'lucide-react';
import { Appliance } from '../../types';
import DataTable, { type DataTableColumn } from './DataTable';

interface ApplianceCatalogTableProps {
  appliances: Appliance[];
  editingId: string | null;
  onSelectRow: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<Appliance>) => void;
  onRemove: (id: string) => void;
}

export default function ApplianceCatalogTable({
  appliances,
  editingId,
  onSelectRow,
  onUpdate,
  onRemove,
}: ApplianceCatalogTableProps) {
  const columns: DataTableColumn<Appliance>[] = [
    {
      id: 'make',
      header: 'Marca',
      sortable: true,
      sortValue: (a) => a.make,
      cell: (a) => <span className="font-medium text-white">{a.make || '—'}</span>,
    },
    {
      id: 'type',
      header: 'Tipo',
      sortable: true,
      sortValue: (a) => a.type,
      cell: (a) => (
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-slate-800 text-emerald-300">
          {a.type}
        </span>
      ),
    },
    {
      id: 'model',
      header: 'Modelo',
      sortable: true,
      sortValue: (a) => a.model,
      cell: (a) => <span className="text-slate-300">{a.model}</span>,
    },
    {
      id: 'width',
      header: 'Larg. (m)',
      sortable: true,
      sortValue: (a) => a.width,
      align: 'right',
      cell: (a) => <span className="font-mono text-slate-400 tabular-nums">{a.width.toFixed(2)}</span>,
    },
    {
      id: 'height',
      header: 'Alt. (m)',
      sortable: true,
      sortValue: (a) => a.height,
      align: 'right',
      cell: (a) => <span className="font-mono text-slate-400 tabular-nums">{a.height.toFixed(2)}</span>,
    },
    {
      id: 'depth',
      header: 'Prof. (m)',
      sortable: true,
      sortValue: (a) => a.depth,
      align: 'right',
      className: 'hidden sm:table-cell',
      cell: (a) => <span className="font-mono text-slate-400 tabular-nums">{a.depth.toFixed(2)}</span>,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      className: 'w-24',
      cell: (a) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onSelectRow(editingId === a.id ? null : a.id)}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(a.id)}
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
      rows={appliances}
      getRowId={(a) => a.id}
      columns={columns}
      selectedId={editingId}
      onSelectRow={onSelectRow}
      defaultSort={{ columnId: 'make', direction: 'asc' }}
      searchPlaceholder="Buscar marca, tipo, modelo..."
      filterRow={(a, q) =>
        `${a.make} ${a.type} ${a.model}`.toLowerCase().includes(q)
      }
      emptyMessage="Nenhum eletro na lista."
      itemLabel="eletrodomésticos"
      renderExpanded={(app) => (
          <div className="space-y-4 w-full max-w-2xl lg:max-w-none">
            <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Editar eletro</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Marca" value={app.make} onChange={(v) => onUpdate(app.id, { make: v })} />
              <Field label="Modelo" value={app.model} onChange={(v) => onUpdate(app.id, { model: v })} />
              <div className="col-span-2">
                <Field label="Tipo" value={app.type} onChange={(v) => onUpdate(app.id, { type: v })} />
              </div>
              <DimField label="Largura (m)" value={app.width} onChange={(v) => onUpdate(app.id, { width: v })} />
              <DimField label="Altura (m)" value={app.height} onChange={(v) => onUpdate(app.id, { height: v })} />
              <DimField label="Profundidade (m)" value={app.depth} onChange={(v) => onUpdate(app.id, { depth: v })} />
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

function DimField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] uppercase font-mono text-slate-500">{label}</label>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2.5 text-base sm:text-sm text-white font-mono"
      />
    </div>
  );
}
