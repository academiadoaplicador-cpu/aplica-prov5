import { Trash2, Pencil } from 'lucide-react';
import { Appliance } from '../../types';
import DataTable, { type DataTableColumn } from './DataTable';

interface ApplianceCatalogTableProps {
  appliances: Appliance[];
  /** Eletro recém-salvo, destacado na lista. */
  highlightId: string | null;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function ApplianceCatalogTable({
  appliances,
  highlightId,
  onEdit,
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
            onClick={() => onEdit(a.id)}
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
      onSelectRow={(id) => id && onEdit(id)}
      highlightId={highlightId}
      defaultSort={{ columnId: 'make', direction: 'asc' }}
      searchPlaceholder="Buscar marca, tipo, modelo..."
      filterRow={(a, q) =>
        `${a.make} ${a.type} ${a.model}`.toLowerCase().includes(q)
      }
      emptyMessage="Nenhum eletro na lista."
      itemLabel="eletrodomésticos"
    />
  );
}
