import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  packPartsOnRoll,
  buildFleetNestingLayout,
  placedPartsAreaM2,
  billableMaterialM2,
  ROLL_WASTE_FACTOR,
  type NestingPartInput,
} from '../utils/rollNesting';

interface RollNestingPreviewProps {
  rollWidth: number;
  rollLength: number;
  parts: NestingPartInput[];
  materialLabel?: string;
  accent?: 'indigo' | 'emerald';
  vehicleQuantity?: number;
}

type Accent = NonNullable<RollNestingPreviewProps['accent']>;

/** Peças automotivas fixas agrupadas por natureza, para colorir o plano por categoria. */
type PartCategory = 'panel' | 'opening' | 'structural';

const PART_CATEGORY_BY_SOURCE_ID: Record<string, PartCategory> = {
  CAP: 'panel',
  TET: 'panel',
  PCD: 'panel',
  PCE: 'panel',
  PTD: 'panel',
  PTE: 'panel',
  MAL: 'opening',
  PDD: 'opening',
  PDE: 'opening',
  PTD_DOOR: 'opening',
  PTE_DOOR: 'opening',
  PCD_BUMP: 'structural',
  PCT_BUMP: 'structural',
  SAI_D: 'structural',
  SAI_E: 'structural',
  RET_D: 'structural',
  RET_E: 'structural',
  MAC_D: 'structural',
  AER: 'structural',
  COL: 'structural',
  GRA: 'structural',
};

function categoryForPart(sourceId: string): PartCategory | undefined {
  return PART_CATEGORY_BY_SOURCE_ID[sourceId];
}

const CATEGORY_TONE: Record<PartCategory, { box: string; selected: string }> = {
  panel: {
    box: 'border-indigo-500/40 bg-indigo-950/60 text-indigo-100 hover:border-indigo-400/60',
    selected:
      'border-[3px] border-indigo-300 bg-indigo-500/40 ring-2 ring-indigo-300/50 shadow-lg shadow-indigo-900/50',
  },
  opening: {
    box: 'border-emerald-500/40 bg-emerald-950/60 text-emerald-100 hover:border-emerald-400/60',
    selected:
      'border-[3px] border-emerald-300 bg-emerald-500/40 ring-2 ring-emerald-300/50 shadow-lg shadow-emerald-900/50',
  },
  structural: {
    box: 'border-slate-600/50 bg-slate-800/70 text-slate-300 hover:border-slate-500/70',
    selected:
      'border-[3px] border-slate-300 bg-slate-700/60 ring-2 ring-slate-300/40 shadow-lg shadow-slate-900/50',
  },
};

function fallbackTone(accent: Accent) {
  return accent === 'emerald' ? CATEGORY_TONE.opening : CATEGORY_TONE.panel;
}

function accentTheme(accent: Accent) {
  if (accent === 'emerald') {
    return {
      title: 'text-emerald-400',
      footerAccent: 'text-emerald-400',
      divider: 'border-emerald-400/35',
      dividerLabel: 'text-emerald-200 bg-slate-950/85 border-emerald-500/30',
    };
  }
  return {
    title: 'text-indigo-400',
    footerAccent: 'text-indigo-400',
    divider: 'border-indigo-400/35',
    dividerLabel: 'text-indigo-200 bg-slate-950/85 border-indigo-500/30',
  };
}

const ROLL_VISUAL_HEIGHT_PX = 140;

function formatMeters(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/** Escala aproximada (estilo desenho técnico) assumindo ~96dpi de tela. */
function computeDisplayScale(rollWidthMeters: number): number {
  if (rollWidthMeters <= 0) return 1;
  const pxPerMeter = ROLL_VISUAL_HEIGHT_PX / rollWidthMeters;
  const cmPerMeterOnScreen = (pxPerMeter / 96) * 2.54;
  const rawScale = 100 / cmPerMeterOnScreen;
  return Math.max(1, Math.round(rawScale / 5) * 5);
}

export default function RollNestingPreview({
  rollWidth,
  rollLength,
  parts,
  materialLabel,
  accent = 'indigo',
  vehicleQuantity = 1,
}: RollNestingPreviewProps) {
  const theme = accentTheme(accent);
  const nestingPerVehicle = useMemo(
    () => packPartsOnRoll(parts, rollWidth, rollLength),
    [parts, rollWidth, rollLength],
  );
  const nesting = useMemo(
    () => buildFleetNestingLayout(nestingPerVehicle, vehicleQuantity),
    [nestingPerVehicle, vehicleQuantity],
  );
  const physicalRollLength = rollLength;
  const visualRollLength = nesting.rollLength;
  const lengthPerCopy = nestingPerVehicle.usedLength;
  const rollsNeeded =
    physicalRollLength > 0.001
      ? Math.max(1, Math.ceil(nesting.usedLength / physicalRollLength))
      : 1;
  const displayScale = useMemo(() => computeDisplayScale(rollWidth), [rollWidth]);

  const placedAreaM2 = useMemo(() => placedPartsAreaM2(nesting.placed), [nesting.placed]);
  const billableAreaM2 = useMemo(() => billableMaterialM2(placedAreaM2), [placedAreaM2]);
  const wastePercent = Math.round((ROLL_WASTE_FACTOR - 1) * 100);

  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rollVisualWidthPx = (visualRollLength / rollWidth) * ROLL_VISUAL_HEIGHT_PX;

  useEffect(() => {
    setSelectedPartId(null);
  }, [parts, rollWidth, rollLength, vehicleQuantity]);

  useEffect(() => {
    if (!selectedPartId || !scrollContainerRef.current) return;
    const part = nesting.placed.find((p) => p.id === selectedPartId);
    if (!part) return;

    const leftPx = (part.y / visualRollLength) * rollVisualWidthPx;
    const widthPx = (part.height / visualRollLength) * rollVisualWidthPx;
    const container = scrollContainerRef.current;
    const targetScroll = leftPx + widthPx / 2 - container.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
  }, [selectedPartId, nesting.placed, visualRollLength, rollVisualWidthPx]);

  const togglePartSelection = (partId: string) => {
    setSelectedPartId((current) => (current === partId ? null : partId));
  };

  const showLeftover =
    vehicleQuantity <= 1 && nesting.usedLength > 0.001 && nesting.usedLength < physicalRollLength - 0.001;
  const leftoverLength = showLeftover ? Math.max(0, physicalRollLength - nesting.usedLength) : 0;
  const usedWidthPx = (nesting.usedLength / visualRollLength) * rollVisualWidthPx;
  const leftoverLeftPx = usedWidthPx;
  const leftoverWidthPx = (leftoverLength / visualRollLength) * rollVisualWidthPx;

  return (
    <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className={cn('text-xs font-mono uppercase tracking-widest', theme.title)}>
            Plano de corte &middot; Rolo {formatMeters(rollWidth)} m
          </h3>
          {materialLabel && (
            <p className="text-sm text-slate-400 mt-1">{materialLabel}</p>
          )}
          {vehicleQuantity > 1 && nesting.allFit && lengthPerCopy > 0.001 && (
            <ul className="text-[10px] text-slate-500 mt-1.5 italic flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1">
              <li className="list-none">{formatMeters(lengthPerCopy)} m por veículo</li>
              <li className="hidden sm:list-none sm:inline text-slate-600" aria-hidden>
                &middot;
              </li>
              <li className="list-none">{formatMeters(nesting.usedLength)} m no total</li>
              {rollsNeeded > 1 && (
                <>
                  <li className="hidden sm:list-none sm:inline text-slate-600" aria-hidden>
                    &middot;
                  </li>
                  <li className="list-none">{rollsNeeded} rolos</li>
                </>
              )}
            </ul>
          )}
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 shrink-0">
          escala 1:{displayScale}
        </span>
      </div>

      <div
        ref={scrollContainerRef}
        className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-3 sm:p-4 overflow-x-auto overscroll-x-contain"
      >
        <div
          className="relative mx-auto"
          style={{ width: rollVisualWidthPx, minWidth: 280, height: ROLL_VISUAL_HEIGHT_PX }}
          onClick={() => setSelectedPartId(null)}
        >
          {vehicleQuantity > 1 &&
            lengthPerCopy > 0.001 &&
            Array.from({ length: vehicleQuantity }, (_, copy) => {
              const leftPx = ((copy * lengthPerCopy) / visualRollLength) * rollVisualWidthPx;
              const widthPx = (lengthPerCopy / visualRollLength) * rollVisualWidthPx;
              return (
                <div
                  key={`copy-${copy}`}
                  className={cn('absolute top-0 bottom-0 border-r-2 pointer-events-none z-[5]', theme.divider)}
                  style={{ left: leftPx, width: Math.max(0, widthPx - 1) }}
                >
                  <span
                    className={cn(
                      'absolute top-1 left-1 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border',
                      theme.dividerLabel,
                    )}
                  >
                    +{copy + 1}
                  </span>
                </div>
              );
            })}

          {rollsNeeded > 1 &&
            Array.from({ length: rollsNeeded - 1 }, (_, index) => {
              const boundary = (index + 1) * physicalRollLength;
              if (boundary >= visualRollLength - 0.001) return null;
              const leftPx = (boundary / visualRollLength) * rollVisualWidthPx;
              return (
                <div
                  key={`roll-${index}`}
                  className="absolute top-0 bottom-0 border-l border-dashed border-slate-400/40 pointer-events-none z-[4]"
                  style={{ left: leftPx }}
                />
              );
            })}

          {nesting.placed.map((part, index) => {
            const leftPx = (part.y / visualRollLength) * rollVisualWidthPx;
            const topPx = (part.x / rollWidth) * ROLL_VISUAL_HEIGHT_PX;
            const widthPx = (part.height / visualRollLength) * rollVisualWidthPx;
            const heightPx = (part.width / rollWidth) * ROLL_VISUAL_HEIGHT_PX;
            const isSelected = selectedPartId === part.id;
            const isDimmed = selectedPartId !== null && !isSelected;
            const category = categoryForPart(part.sourceId ?? part.id);
            const tone = category ? CATEGORY_TONE[category] : fallbackTone(accent);
            const isNarrowTall = widthPx < 40 && heightPx > widthPx * 1.8;
            const showName = isNarrowTall || (widthPx > 28 && heightPx > 16);

            return (
              <button
                type="button"
                key={`${part.id}-${index}`}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePartSelection(part.id);
                }}
                className={cn(
                  'absolute flex items-center justify-center text-center overflow-hidden transition-all duration-200 cursor-pointer p-0 font-inherit border-2 rounded-md',
                  isSelected ? cn(tone.selected, 'z-20 scale-[1.02]') : cn(tone.box, 'z-10'),
                  isDimmed && 'opacity-35 saturate-50',
                )}
                style={{ left: leftPx, top: topPx, width: widthPx, height: heightPx }}
                title={part.name}
                aria-pressed={isSelected}
                aria-label={part.name}
              >
                {isNarrowTall ? (
                  <span
                    className="text-[8px] font-bold uppercase tracking-wide px-0.5"
                    style={{ writingMode: 'vertical-rl' }}
                  >
                    {part.name.toUpperCase()}
                  </span>
                ) : showName ? (
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase leading-tight px-0.5 line-clamp-3">
                    {part.name.toUpperCase()}
                  </span>
                ) : (
                  <span className="text-[6px] font-bold uppercase truncate w-full px-0.5">
                    {part.name.slice(0, 4)}
                  </span>
                )}
              </button>
            );
          })}

          {leftoverLength > 0.001 && (
            <div
              className="absolute top-0 bottom-0 bg-slate-600/40 border-l-2 border-dashed border-slate-400/50 flex items-center justify-center z-0 rounded-r-md"
              style={{
                left: leftoverLeftPx,
                width: leftoverWidthPx,
              }}
            >
              <div className="flex flex-col items-center text-center px-1">
                <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Sobra
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-200 tabular-nums">
                  {formatMeters(leftoverLength)} m
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        <StatTile label="Comprimento usado" value={`${formatMeters(nesting.usedLength)} m`} />
        <StatTile label="Área das peças" value={`${placedAreaM2.toFixed(2)} m²`} />
        <StatTile
          label="Material faturado"
          value={`${billableAreaM2.toFixed(2)} m²`}
          hint={`+${wastePercent}%`}
          valueClass={theme.footerAccent}
        />
      </div>

      {nesting.unplaced.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            Peças que não cabem
          </p>
          <ul className="space-y-2">
            {nesting.unplaced.map((part) => (
              <li key={part.id} className="text-xs text-amber-100/80">
                <span className="font-medium text-amber-200 uppercase">{part.name}</span>
                <p className="text-[10px] text-amber-200/60 mt-0.5">{part.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function StatTile({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-slate-500 truncate">
        {label}
      </p>
      <p className={cn('text-sm sm:text-base font-bold tabular-nums truncate', valueClass ?? 'text-white')}>
        {value}
        {hint && <span className="ml-1.5 text-xs font-semibold">{hint}</span>}
      </p>
    </div>
  );
}
