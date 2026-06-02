import { useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Material } from '../types';
import { cn } from '../lib/utils';
import {
  formatRollOptionList,
  getDefaultRollSelection,
  getMaterialRollOptions,
} from '../utils/materialRoll';

interface MaterialRollDimensionSelectProps {
  material: Material | undefined;
  selectedWidth: number | null;
  selectedLength: number | null;
  onSelectWidth: (width: number) => void;
  onSelectLength: (length: number) => void;
  accent?: 'indigo' | 'emerald';
  className?: string;
}

export default function MaterialRollDimensionSelect({
  material,
  selectedWidth,
  selectedLength,
  onSelectWidth,
  onSelectLength,
  accent = 'indigo',
  className,
}: MaterialRollDimensionSelectProps) {
  const { widths, lengths } = getMaterialRollOptions(material);

  useEffect(() => {
    if (!material) return;
    const defaults = getDefaultRollSelection(material);
    if (!defaults) return;
    onSelectWidth(defaults.width);
    onSelectLength(defaults.length);
  }, [material?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!material || (widths.length === 0 && lengths.length === 0)) return null;

  const focusRing =
    accent === 'emerald' ? 'focus:ring-emerald-500' : 'focus:ring-indigo-500';

  const showWidthSelect = widths.length > 1;
  const showLengthSelect = lengths.length > 1;

  if (!showWidthSelect && !showLengthSelect) {
    return (
      <div className={cn('rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-[10px] text-slate-500', className)}>
        Rolo: {formatRollOptionList(widths)} × {formatRollOptionList(lengths)}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3', className)}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
        Formato do rolo
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono text-slate-500 ml-1">Largura</label>
          {showWidthSelect ? (
            <div className="relative">
              <select
                value={selectedWidth ?? widths[0]}
                onChange={(e) => onSelectWidth(parseFloat(e.target.value))}
                className={cn(
                  'w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-base sm:text-sm text-white appearance-none font-mono',
                  focusRing,
                )}
              >
                {widths.map((w) => (
                  <option key={w} value={w}>
                    {w.toFixed(2).replace('.', ',')} m
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
              />
            </div>
          ) : (
            <p className="h-10 flex items-center px-3 text-sm font-mono text-slate-300">
              {widths[0]?.toFixed(2).replace('.', ',')} m
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono text-slate-500 ml-1">Comprimento</label>
          {showLengthSelect ? (
            <div className="relative">
              <select
                value={selectedLength ?? lengths[0]}
                onChange={(e) => onSelectLength(parseFloat(e.target.value))}
                className={cn(
                  'w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-base sm:text-sm text-white appearance-none font-mono',
                  focusRing,
                )}
              >
                {lengths.map((l) => (
                  <option key={l} value={l}>
                    {l.toFixed(2).replace('.', ',')} m
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
              />
            </div>
          ) : (
            <p className="h-10 flex items-center px-3 text-sm font-mono text-slate-300">
              {lengths[0]?.toFixed(2).replace('.', ',')} m
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
