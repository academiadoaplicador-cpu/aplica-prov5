import { Trash2, Pencil } from 'lucide-react';
import { Material } from '../../types';
import { formatCurrency } from '../../lib/utils';
import DataTable, { type DataTableColumn } from './DataTable';

interface MaterialCatalogTableProps {
  materials: Material[];
  /** Material recém-salvo, destacado na lista. */
  highlightId: string | null;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  /** Seleção para a edição de preços em massa. */
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export default function MaterialCatalogTable({
  materials,
  highlightId,
  onEdit,
  onRemove,
  selectedIds,
  onToggleSelect,
}: MaterialCatalogTableProps) {
  const columns: DataTableColumn<Material>[] = [
    {
      id: 'select',
      header: '',
      className: 'w-10',
      cell: (m) => (
        <input
          type="checkbox"
          aria-label={`Selecionar ${m.name}`}
          checked={selectedIds.has(m.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect(m.id)}
          className="h-4 w-4 accent-emerald-600 cursor-pointer"
        />
      ),
    },
    {
      id: 'name',
      header: 'Nome / produto',
      sortable: true,
      sortValue: (m) => m.name,
      cell: (m) => <span className="font-medium text-white">{m.name}</span>,
    },
    {
      id: 'brand',
      header: 'Marca',
      sortable: true,
      sortValue: (m) => m.brand,
      cell: (m) => <span className="text-slate-400">{m.brand}</span>,
    },
    {
      id: 'line',
      header: 'Linha',
      sortable: true,
      sortValue: (m) => m.line,
      className: 'hidden sm:table-cell',
      cell: (m) => <span className="text-slate-400">{m.line}</span>,
    },
    {
      id: 'type',
      header: 'Tipo',
      sortable: true,
      sortValue: (m) => m.type,
      cell: (m) => (
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300">
          {m.type}
        </span>
      ),
    },
    {
      id: 'color',
      header: 'Cor',
      sortable: true,
      sortValue: (m) => m.colorTexture,
      className: 'hidden sm:table-cell',
      cell: (m) => <span className="text-slate-400 truncate max-w-[120px] block">{m.colorTexture}</span>,
    },
    {
      id: 'price',
      header: 'R$/m²',
      sortable: true,
      sortValue: (m) => m.pricePerM2,
      align: 'right',
      cell: (m) => (
        <span className="font-mono text-emerald-400 tabular-nums">{formatCurrency(m.pricePerM2)}</span>
      ),
    },
    {
      id: 'rec',
      header: 'Uso',
      className: 'hidden xl:table-cell',
      cell: (m) => (
        <div className="flex flex-wrap gap-1 max-w-[140px]">
          {m.recommendedFor.slice(0, 2).map((r) => (
            <span key={r} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {r.slice(0, 4)}
            </span>
          ))}
          {m.recommendedFor.length > 2 && (
            <span className="text-[9px] text-slate-500">+{m.recommendedFor.length - 2}</span>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      className: 'w-24',
      cell: (m) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onEdit(m.id)}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(m.id)}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
      rows={materials}
      getRowId={(m) => m.id}
      columns={columns}
      onSelectRow={(id) => id && onEdit(id)}
      highlightId={highlightId}
      defaultSort={{ columnId: 'name', direction: 'asc' }}
      searchPlaceholder="Buscar material, marca, linha..."
      filterRow={(m, q) =>
        [m.name, m.brand, m.line, m.type, m.colorTexture, m.recommendedFor.join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(q)
      }
      emptyMessage="Nenhum material na lista."
      itemLabel="materiais"
    />
  );
}
