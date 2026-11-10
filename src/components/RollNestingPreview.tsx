import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  packPartsIntoRolls,
  repeatPartsForFleet,
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
  /** Frota: as peças são repetidas por veículo e encaixadas juntas nos rolos. */
  vehicleQuantity?: number;
  /** Linha extra abaixo do material (ex.: itens que usam este rolo). */
  caption?: string;
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
    };
  }
  return {
    title: 'text-indigo-400',
    footerAccent: 'text-indigo-400',
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
  caption,
}: RollNestingPreviewProps) {
  const theme = accentTheme(accent);
  const fleetSize = Math.max(1, Math.floor(vehicleQuantity));
  const nesting = useMemo(
    () => packPartsIntoRolls(repeatPartsForFleet(parts, fleetSize), rollWidth, rollLength),
    [parts, rollWidth, rollLength, fleetSize],
  );
  const rolls = nesting.rolls;
  const displayScale = useMemo(() => computeDisplayScale(rollWidth), [rollWidth]);

  const placedAreaM2 = useMemo(() => placedPartsAreaM2(nesting.placed), [nesting.placed]);
  const billableAreaM2 = useMemo(() => billableMaterialM2(placedAreaM2), [placedAreaM2]);
  const wastePercent = Math.round((ROLL_WASTE_FACTOR - 1) * 100);

  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Cada rolo é desenhado no comprimento físico: nada passa do fim dele.
  const rollVisualWidthPx = (rollLength / rollWidth) * ROLL_VISUAL_HEIGHT_PX;
  const pxPerMeter = rollVisualWidthPx / rollLength;

  useEffect(() => {
    setSelectedPartId(null);
  }, [parts, rollWidth, rollLength, fleetSize]);

  useEffect(() => {
    if (!selectedPartId || !scrollContainerRef.current) return;
    const part = nesting.placed.find((p) => p.id === selectedPartId);
    if (!part) return;
    const container = scrollContainerRef.current;
    const center = (part.y + part.height / 2) * pxPerMeter;
    container.scrollTo({ left: Math.max(0, center - container.clientWidth / 2), behavior: 'smooth' });
  }, [selectedPartId, nesting.placed, pxPerMeter]);

  const togglePartSelection = (partId: string) => {
    setSelectedPartId((current) => (current === partId ? null : partId));
  };

  return (
    <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className={cn('text-xs font-mono uppercase tracking-widest', theme.title)}>
            Plano de corte &middot; Rolo {formatMeters(rollWidth)} &times; {formatMeters(rollLength)} m
          </h3>
          {materialLabel && (
            <p className="text-sm text-slate-400 mt-1">{materialLabel}</p>
          )}
          {caption && <p className="text-[11px] text-slate-500 mt-0.5">{caption}</p>}
          {fleetSize > 1 && nesting.usedLength > 0.001 && (
            <p className="text-[10px] text-slate-500 mt-1.5 italic">
              {fleetSize} veículos &middot; {formatMeters(nesting.usedLength / fleetSize)} m por veículo em média
            </p>
          )}
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 shrink-0">
          escala 1:{displayScale}
        </span>
      </div>

      {rolls.length > 1 && (
        <ul className="flex flex-wrap gap-2" aria-label="Metragem por rolo">
          {rolls.map((roll) => (
            <li
              key={roll.index}
              className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[11px] text-slate-300"
            >
              <span className="font-bold text-white">Rolo {roll.index + 1}</span>
              {roll.index > 0 && <span className="text-slate-500"> (complementar)</span>}
              <span className="font-mono tabular-nums">
                {' '}&middot; {formatMeters(roll.usedLength)} de {formatMeters(rollLength)} m
              </span>
              {roll.leftoverLength > 0.001 && (
                <span className="text-slate-500 font-mono tabular-nums">
                  {' '}&middot; sobra {formatMeters(roll.leftoverLength)} m
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div
        ref={scrollContainerRef}
        className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-3 sm:p-4 overflow-x-auto overscroll-x-contain"
        onClick={() => setSelectedPartId(null)}
      >
        <div className="space-y-3 mx-auto" style={{ width: rollVisualWidthPx, minWidth: 280 }}>
          {rolls.map((roll) => (
            <div key={roll.index} className="space-y-1">
              {rolls.length > 1 && (
                <p className="sticky left-0 w-fit text-[9px] font-mono uppercase tracking-widest text-slate-500">
                  Rolo {roll.index + 1} &middot; {formatMeters(roll.usedLength)} m
                </p>
              )}
              <div
                className="relative rounded-md border border-slate-800/80"
                style={{ width: rollVisualWidthPx, minWidth: 280, height: ROLL_VISUAL_HEIGHT_PX }}
              >
                {nesting.placed
                  .filter((part) => part.rollIndex === roll.index)
                  .map((part) => {
                    const leftPx = part.y * pxPerMeter;
                    const topPx = (part.x / rollWidth) * ROLL_VISUAL_HEIGHT_PX;
                    const widthPx = part.height * pxPerMeter;
                    const heightPx = (part.width / rollWidth) * ROLL_VISUAL_HEIGHT_PX;
                    const isSelected = selectedPartId === part.id;
                    const isDimmed = selectedPartId !== null && !isSelected;
                    const category = categoryForPart(part.baseId ?? part.sourceId ?? part.id);
                    const tone = category ? CATEGORY_TONE[category] : fallbackTone(accent);
                    const isNarrowTall = widthPx < 40 && heightPx > widthPx * 1.8;
                    const showName = isNarrowTall || (widthPx > 28 && heightPx > 16);

                    return (
                      <button
                        type="button"
                        key={part.id}
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

                {roll.leftoverLength > 0.001 && (
                  <div
                    className="absolute top-0 bottom-0 bg-slate-600/40 border-l-2 border-dashed border-slate-400/50 flex items-center justify-center z-0 rounded-r-md"
                    style={{ left: roll.usedLength * pxPerMeter, width: roll.leftoverLength * pxPerMeter }}
                  >
                    <div className="flex flex-col items-center text-center px-1">
                      <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                        Sobra
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-200 tabular-nums">
                        {formatMeters(roll.leftoverLength)} m
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
        <StatTile
          label="Rolos usados"
          value={String(rolls.length)}
          valueClass={rolls.length > 1 ? 'text-amber-300' : undefined}
        />
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
            Peças fora do plano
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
