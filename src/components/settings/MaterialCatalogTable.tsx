import { Info, Trash2, Pencil } from 'lucide-react';
import { Material, MaterialType } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import DataTable, { type DataTableColumn } from './DataTable';

interface MaterialCatalogTableProps {
  materials: Material[];
  editingId: string | null;
  onSelectRow: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<Material>) => void;
  onRemove: (id: string) => void;
  onToggleRecommendation: (id: string, rec: string) => void;
}

export default function MaterialCatalogTable({
  materials,
  editingId,
  onSelectRow,
  onUpdate,
  onRemove,
  onToggleRecommendation,
}: MaterialCatalogTableProps) {
  const columns: DataTableColumn<Material>[] = [
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
            onClick={() => onSelectRow(editingId === m.id ? null : m.id)}
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
      selectedId={editingId}
      onSelectRow={onSelectRow}
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
      renderExpanded={(material) => (
          <div className="space-y-5 w-full">
            <p className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">Editar registro</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Nome" value={material.name} onChange={(v) => onUpdate(material.id, { name: v })} />
              <Field label="Marca" value={material.brand} onChange={(v) => onUpdate(material.id, { brand: v })} />
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-mono text-slate-500">Tipo</label>
                <select
                  value={material.type}
                  onChange={(e) => onUpdate(material.id, { type: e.target.value as MaterialType })}
                  className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2.5 text-base sm:text-sm text-white"
                >
                  <option value="Cast">Cast</option>
                  <option value="Calandrado">Calandrado</option>
                  <option value="PPF">PPF</option>
                  <option value="Poliéster">Poliéster</option>
                </select>
              </div>
              <Field label="Linha" value={material.line} onChange={(v) => onUpdate(material.id, { line: v })} />
              <Field
                label="Preço (R$/m²)"
                value={String(material.pricePerM2)}
                onChange={(v) => onUpdate(material.id, { pricePerM2: parseFloat(v) || 0 })}
                mono
              />
              <Field
                label="Cor / textura"
                value={material.colorTexture}
                onChange={(v) => onUpdate(material.id, { colorTexture: v })}
              />
              <Field
                label="Durabilidade"
                value={material.durability}
                onChange={(v) => onUpdate(material.id, { durability: v })}
              />
              <Field
                label="Dificuldade de aplicação"
                value={
                  material.applicationDifficulty != null
                    ? String(material.applicationDifficulty).replace('.', ',')
                    : ''
                }
                onChange={(v) => {
                  const parsed = parseFloat(v.replace(',', '.'));
                  onUpdate(material.id, {
                    applicationDifficulty: Number.isFinite(parsed) ? parsed : undefined,
                  });
                }}
                hint="Grau de 1 a 3 (ex.: 1,3) — distinto da durabilidade"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-mono text-slate-500">Recomendado para</label>
              <div className="flex flex-wrap gap-2">
                {['Automotivo', 'Eletrodomésticos', 'Móveis', 'Parede', 'Sinalização'].map((rec) => (
                  <button
                    key={rec}
                    type="button"
                    onClick={() => onToggleRecommendation(material.id, rec)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all',
                      material.recommendedFor.includes(rec)
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
                value={material.details ?? ''}
                onChange={(e) => onUpdate(material.id, { details: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 h-20 resize-none"
              />
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
  mono,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] uppercase font-mono text-slate-500">{label}</label>
      <input
        value={value}
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
