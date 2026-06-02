import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Material } from '../types';
import { cn } from '../lib/utils';
import {
  filterMaterialsByContext,
  getMaterialBrands,
  getMaterialColorLabel,
  getMaterialLinesForBrand,
  getMaterialColorsForBrandLine,
  resolveSelectionFromMaterialId,
  type MaterialSelectionContext,
} from '../utils/materialSelection';

interface MaterialCascadeSelectProps {
  materials: Material[];
  context: MaterialSelectionContext;
  selectedMaterialId: string;
  onSelectMaterialId: (id: string) => void;
  onSelectionChange?: () => void;
  accent?: 'indigo' | 'emerald';
  className?: string;
}

export default function MaterialCascadeSelect({
  materials,
  context,
  selectedMaterialId,
  onSelectMaterialId,
  onSelectionChange,
  accent = 'indigo',
  className,
}: MaterialCascadeSelectProps) {
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedLine, setSelectedLine] = useState('');

  const filteredMaterials = useMemo(
    () => filterMaterialsByContext(materials, context),
    [materials, context],
  );

  const brands = useMemo(
    () => getMaterialBrands(filteredMaterials),
    [filteredMaterials],
  );

  const lines = useMemo(
    () => (selectedBrand ? getMaterialLinesForBrand(filteredMaterials, selectedBrand) : []),
    [filteredMaterials, selectedBrand],
  );

  const colorOptions = useMemo(
    () =>
      selectedBrand && selectedLine
        ? getMaterialColorsForBrandLine(filteredMaterials, selectedBrand, selectedLine)
        : [],
    [filteredMaterials, selectedBrand, selectedLine],
  );

  useEffect(() => {
    if (!selectedMaterialId) return;
    const resolved = resolveSelectionFromMaterialId(filteredMaterials, selectedMaterialId);
    if (!resolved) return;
    setSelectedBrand(resolved.brand);
    setSelectedLine(resolved.line);
  }, [selectedMaterialId, filteredMaterials]);

  useEffect(() => {
    if (selectedMaterialId) return;
    setSelectedBrand('');
    setSelectedLine('');
  }, [filteredMaterials, selectedMaterialId]);

  const focusRing =
    accent === 'emerald' ? 'focus:ring-emerald-500' : 'focus:ring-indigo-500';

  const notifyChange = () => {
    onSelectionChange?.();
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-mono text-slate-500 ml-1">Marca</label>
        <div className="relative">
          <select
            value={selectedBrand}
            onChange={(e) => {
              const brand = e.target.value;
              setSelectedBrand(brand);
              setSelectedLine('');
              onSelectMaterialId('');
              notifyChange();
            }}
            className={cn(
              'w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-base sm:text-sm text-white appearance-none font-sans',
              focusRing,
            )}
          >
            <option value="">Selecione a marca…</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase font-mono text-slate-500 ml-1">Linha / Produto</label>
        <div className="relative">
          <select
            value={selectedLine}
            disabled={!selectedBrand}
            onChange={(e) => {
              setSelectedLine(e.target.value);
              onSelectMaterialId('');
              notifyChange();
            }}
            className={cn(
              'w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-base sm:text-sm text-white appearance-none font-sans disabled:opacity-40',
              focusRing,
            )}
          >
            <option value="">Selecione a linha…</option>
            {lines.map((line) => (
              <option key={line} value={line}>
                {line}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase font-mono text-slate-500 ml-1">Cor / Textura</label>
        <div className="relative">
          <select
            value={selectedMaterialId}
            disabled={!selectedBrand || !selectedLine}
            onChange={(e) => {
              onSelectMaterialId(e.target.value);
              notifyChange();
            }}
            className={cn(
              'w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-base sm:text-sm text-white appearance-none font-sans disabled:opacity-40',
              focusRing,
            )}
          >
            <option value="">Selecione a cor…</option>
            {colorOptions.map((material) => (
              <option key={material.id} value={material.id}>
                {getMaterialColorLabel(material)}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
          />
        </div>
      </div>

      {filteredMaterials.length === 0 && (
        <p className="text-[10px] text-amber-400/80 italic ml-1">
          Nenhum material disponível para este módulo. Importe materiais no catálogo.
        </p>
      )}
    </div>
  );
}
