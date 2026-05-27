import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DataTableColumn<T> {
  id: string;
  header: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'center' | 'right';
  className?: string;
  cell: (row: T, rowIndex: number) => ReactNode;
}

interface DataTableProps<T> {
  rows: T[];
  getRowId: (row: T) => string;
  columns: DataTableColumn<T>[];
  selectedId?: string | null;
  onSelectRow?: (id: string | null) => void;
  renderExpanded?: (row: T) => ReactNode;
  emptyMessage?: string;
  searchPlaceholder?: string;
  filterRow?: (row: T, query: string) => boolean;
  defaultSort?: { columnId: string; direction: 'asc' | 'desc' };
  stickyHeader?: boolean;
  itemLabel?: string;
}

export default function DataTable<T>({
  rows,
  getRowId,
  columns,
  selectedId,
  onSelectRow,
  renderExpanded,
  emptyMessage = 'Nenhum registro encontrado.',
  searchPlaceholder = 'Buscar na lista...',
  filterRow,
  defaultSort,
  stickyHeader = true,
  itemLabel = 'registro(s)',
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(
    defaultSort ?? { columnId: columns[0]?.id ?? '', direction: 'asc' as const },
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !filterRow) return rows;
    return rows.filter((row) => filterRow(row, q));
  }, [rows, query, filterRow]);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.id === sort.columnId);
    if (!col?.sortable || !col.sortValue) return filtered;

    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'pt-BR', { sensitivity: 'base' });
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort, columns]);

  const toggleSort = (columnId: string, sortable?: boolean) => {
    if (!sortable) return;
    setSort((prev) =>
      prev.columnId === columnId
        ? { columnId, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId, direction: 'asc' },
    );
  };

  const colSpan = columns.length + 1;

  return (
    <div className="space-y-4 p-4 sm:p-5">
      {filterRow && (
        <div className="relative w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-10 bg-slate-950 border border-slate-700/80 rounded-xl pl-11 pr-4 text-base sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600/40"
          />
        </div>
      )}

      {rows.length > 0 && (
        <p className={cn('text-sm text-slate-500', filterRow && 'mt-2 sm:mt-0')}>
          Exibindo{' '}
          <span className="font-semibold text-slate-300">{sorted.length}</span> de{' '}
          <span className="font-semibold text-slate-300">{rows.length}</span> {itemLabel}
          {query && filtered.length !== rows.length && (
            <span className="text-slate-600"> · filtro ativo</span>
          )}
        </p>
      )}

      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
        <div className="relative">
          {/* Scroll hint gradient — mobile */}
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950/90 to-transparent z-[1] sm:hidden"
            aria-hidden
          />
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 max-h-[calc(100vh-20rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
            <div className="min-w-[600px] sm:min-w-0">
              <table className="w-full border-collapse text-sm">
                <thead
                  className={cn(
                    'bg-slate-900/95 text-[10px] font-mono uppercase tracking-widest text-slate-500',
                    stickyHeader && 'sticky top-0 z-10 backdrop-blur-sm border-b border-slate-800',
                  )}
                >
                  <tr>
                    <th className="w-12 px-3 py-3.5 text-center font-semibold border-r border-slate-800/80">#</th>
                    {columns.map((col) => (
                      <th
                        key={col.id}
                        className={cn(
                          'px-4 py-3.5 font-semibold whitespace-nowrap',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.sortable && 'cursor-pointer select-none hover:text-slate-300 transition-colors',
                          col.className,
                        )}
                        onClick={() => toggleSort(col.id, col.sortable)}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {col.header}
                          {col.sortable && (
                            <span className="text-slate-600">
                              {sort.columnId !== col.id ? (
                                <ArrowUpDown size={12} />
                              ) : sort.direction === 'asc' ? (
                                <ArrowUp size={12} className="text-indigo-400" />
                              ) : (
                                <ArrowDown size={12} className="text-indigo-400" />
                              )}
                            </span>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={colSpan} className="px-6 py-16 text-center text-slate-500 text-sm">
                        {emptyMessage}
                      </td>
                    </tr>
                  ) : (
                    sorted.map((row, index) => {
                      const id = getRowId(row);
                      const isSelected = selectedId === id;
                      return (
                        <Fragment key={id}>
                          <tr
                            onClick={() => onSelectRow?.(isSelected ? null : id)}
                            className={cn(
                              'border-b border-slate-800/60 transition-colors',
                              onSelectRow && 'cursor-pointer',
                              index % 2 === 0 ? 'bg-slate-950/40' : 'bg-slate-900/20',
                              isSelected
                                ? 'bg-indigo-950/40 ring-1 ring-inset ring-indigo-500/30'
                                : onSelectRow && 'hover:bg-slate-800/50',
                            )}
                          >
                            <td className="px-3 py-3 text-center text-[11px] font-mono text-slate-600 border-r border-slate-800/50 tabular-nums">
                              {index + 1}
                            </td>
                            {columns.map((col) => (
                              <td
                                key={col.id}
                                className={cn(
                                  'px-4 py-3 text-slate-200 align-middle',
                                  col.align === 'right' && 'text-right',
                                  col.align === 'center' && 'text-center',
                                  col.className,
                                )}
                                onClick={(e) => {
                                  if ((e.target as HTMLElement).closest('button')) {
                                    e.stopPropagation();
                                  }
                                }}
                              >
                                {col.cell(row, index)}
                              </td>
                            ))}
                          </tr>
                          {isSelected && renderExpanded && (
                            <tr key={`${id}-detail`} className="bg-slate-900/60 border-b border-slate-800">
                              <td colSpan={colSpan} className="px-4 py-5">
                                {renderExpanded(row)}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
