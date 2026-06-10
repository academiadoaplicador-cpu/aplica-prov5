import { useMemo } from 'react';
import { Plus, Star, Trash2 } from 'lucide-react';
import { Material, SupplierProductLink } from '../../types';
import { getMaterialBrands, getMaterialLinesForBrand } from '../../utils/materialSelection';
import { cn } from '../../lib/utils';

interface SupplierProductLinksEditorProps {
  materials: Material[];
  links: SupplierProductLink[];
  onChange: (links: SupplierProductLink[]) => void;
  hideHeader?: boolean;
  layout?: 'stack' | 'grid';
}

function linkKey(brand: string, line: string): string {
  return `${brand}::${line}`;
}

function findNextAvailablePair(
  materials: Material[],
  brands: string[],
  existingLinks: SupplierProductLink[],
): { brand: string; line: string } | null {
  const used = new Set(existingLinks.map((l) => linkKey(l.brand, l.line)));

  for (const brand of brands) {
    const lines = getMaterialLinesForBrand(materials, brand);
    for (const line of lines) {
      if (!used.has(linkKey(brand, line))) {
        return { brand, line };
      }
    }
  }

  return null;
}

export default function SupplierProductLinksEditor({
  materials,
  links,
  onChange,
  hideHeader = false,
  layout = 'stack',
}: SupplierProductLinksEditorProps) {
  const brands = useMemo(() => getMaterialBrands(materials), [materials]);
  const canAddMore = useMemo(
    () => findNextAvailablePair(materials, brands, links) !== null,
    [materials, brands, links],
  );

  const addLink = () => {
    const next = findNextAvailablePair(materials, brands, links);
    if (!next) return;
    onChange([...links, { brand: next.brand, line: next.line, isPrimary: links.length === 0 }]);
  };

  const updateLink = (index: number, patch: Partial<SupplierProductLink>) => {
    const next = links.map((link, i) => {
      if (i !== index) {
        if (patch.isPrimary && link.brand === links[index].brand && link.line === links[index].line) {
          return { ...link, isPrimary: false };
        }
        return link;
      }
      const updated = { ...link, ...patch };
      if (patch.brand && patch.brand !== link.brand) {
        const lines = getMaterialLinesForBrand(materials, patch.brand);
        updated.line = lines[0] || '';
      }
      return updated;
    });

    if (patch.isPrimary) {
      const target = next[index];
      for (let i = 0; i < next.length; i++) {
        if (i === index) continue;
        if (next[i].brand === target.brand && next[i].line === target.line) {
          next[i] = { ...next[i], isPrimary: false };
        }
      }
    }

    onChange(next);
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const setPrimary = (index: number) => {
    const target = links[index];
    onChange(
      links.map((link, i) => {
        if (link.brand === target.brand && link.line === target.line) {
          return { ...link, isPrimary: i === index };
        }
        return link;
      }),
    );
  };

  if (brands.length === 0) {
    return (
      <p className="text-sm text-slate-500 bg-slate-950/50 border border-slate-800 rounded-xl p-4">
        Cadastre materiais no catálogo antes de vincular fornecedores.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!hideHeader ? (
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-white">Vínculos Marca / Linha</h4>
          <button
            type="button"
            onClick={addLink}
            disabled={!canAddMore}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={14} />
            Adicionar
          </button>
        </div>
      ) : (
        <div className="flex justify-end mb-1">
          <button
            type="button"
            onClick={addLink}
            disabled={!canAddMore}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={14} />
            Adicionar vínculo
          </button>
        </div>
      )}

      {links.length === 0 ? (
        <p className="text-xs text-slate-500 italic">Nenhum vínculo — opcional no cadastro.</p>
      ) : (
        <div
          className={cn(
            layout === 'grid'
              ? 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3'
              : 'space-y-2',
          )}
        >
          {links.map((link, index) => {
            const lines = getMaterialLinesForBrand(materials, link.brand);
            return (
              <div
                key={`${link.brand}-${link.line}-${index}`}
                className={cn(
                  'p-3 rounded-xl bg-slate-950/60 border border-slate-800',
                  layout === 'grid'
                    ? 'flex flex-col gap-2'
                    : 'grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2',
                )}
              >
                <label className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-500 sm:sr-only">
                    Marca
                  </span>
                  <select
                    value={link.brand}
                    onChange={(e) => updateLink(index, { brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm"
                  >
                    {brands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-500 sm:sr-only">
                    Linha
                  </span>
                  <select
                    value={link.line}
                    onChange={(e) => updateLink(index, { line: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm"
                  >
                    {lines.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <div
                  className={cn(
                    'flex items-center gap-1 shrink-0',
                    layout === 'grid' ? 'justify-end pt-1' : 'justify-end sm:justify-start',
                  )}
                >
                  <button
                    type="button"
                    title="Marcar como principal"
                    onClick={() => setPrimary(index)}
                    className={cn(
                      'p-2 rounded-lg border transition-colors',
                      link.isPrimary
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'text-slate-500 border-slate-800 hover:text-amber-300',
                    )}
                  >
                    <Star size={16} className={link.isPrimary ? 'fill-current' : ''} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    className="p-2 rounded-lg text-red-400 border border-slate-800 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-slate-500">
        O fornecedor principal aparece no botão WhatsApp durante o orçamento.
        {!canAddMore && links.length > 0 && (
          <span className="block mt-1 text-amber-500/80">
            Todos os pares Marca/Linha do catálogo já foram vinculados.
          </span>
        )}
      </p>
    </div>
  );
}
