import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, MapPin, Ruler } from 'lucide-react';
import { cn } from '../lib/utils';
import { packPartsOnRoll, buildFleetNestingLayout, type NestingPartInput } from '../utils/rollNesting';

interface RollNestingPreviewProps {
  rollWidth: number;
  rollLength: number;
  parts: NestingPartInput[];
  materialLabel?: string;
  accent?: 'indigo' | 'emerald';
  vehicleQuantity?: number;
}

type Accent = NonNullable<RollNestingPreviewProps['accent']>;

function accentTheme(accent: Accent) {
  if (accent === 'emerald') {
    return {
      title: 'text-emerald-400',
      dimLabel: 'text-emerald-300',
      partSelected:
        'border-[3px] border-emerald-400 bg-emerald-500/50 ring-2 ring-emerald-300/60 shadow-lg shadow-emerald-900/50',
      partDefault:
        'border-2 border-white/90 bg-slate-900/75 hover:border-emerald-300/70 hover:bg-slate-800/90',
      mapPin: 'text-emerald-400',
      hintSelected: 'text-emerald-400',
      listSelected:
        'border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500/40 shadow-md shadow-emerald-900/20',
      listDefault:
        'border-slate-800 bg-slate-950/50 hover:border-emerald-500/40 hover:bg-slate-900/80',
      listTextSelected: 'text-emerald-200',
      usedTone: 'emerald' as const,
    };
  }
  return {
    title: 'text-indigo-400',
    dimLabel: 'text-indigo-300',
    partSelected:
      'border-[3px] border-indigo-400 bg-indigo-500/50 ring-2 ring-indigo-300/60 shadow-lg shadow-indigo-900/50',
    partDefault:
      'border-2 border-white/90 bg-slate-900/75 hover:border-indigo-300/70 hover:bg-slate-800/90',
    mapPin: 'text-indigo-400',
    hintSelected: 'text-indigo-400',
    listSelected:
      'border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500/40 shadow-md shadow-indigo-900/20',
    listDefault:
      'border-slate-800 bg-slate-950/50 hover:border-indigo-500/40 hover:bg-slate-900/80',
    listTextSelected: 'text-indigo-200',
    usedTone: 'indigo' as const,
  };
}

const ROLL_VISUAL_HEIGHT_PX = 140;
const DIMENSION_GUTTER_TOP = 56;
const DIMENSION_GUTTER_LEFT = 44;
const SEGMENT_DIMENSION_TOP = 38;

function formatMeters(value: number): string {
  return value.toFixed(2).replace('.', ',');
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

  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rollVisualWidthPx = (visualRollLength / rollWidth) * ROLL_VISUAL_HEIGHT_PX;
  const selectedPart = nesting.placed.find((p) => p.id === selectedPartId);

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
    const targetScroll =
      DIMENSION_GUTTER_LEFT + leftPx + widthPx / 2 - container.clientWidth / 2;
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
  const perVehicleCount = parts.length;
  const fitStatusLabel = nesting.allFit
    ? vehicleQuantity > 1
      ? `${vehicleQuantity} planos (+1…+${vehicleQuantity}) · ${perVehicleCount} peça(s) cada`
      : `${perVehicleCount} peça(s) cabem no rolo`
    : `${nesting.unplaced.length} peça(s) não cabem`;

  return (
    <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className={cn('text-xs font-mono uppercase tracking-widest flex items-center gap-2', theme.title)}>
            <Ruler size={14} />
            Plano de corte no rolo
          </h3>
          {materialLabel && (
            <p className="text-sm text-slate-400 mt-1">{materialLabel}</p>
          )}
          {vehicleQuantity > 1 && nesting.allFit && lengthPerCopy > 0.001 && (
            <p className="text-[10px] text-slate-500 mt-1 italic">
              {formatMeters(lengthPerCopy)} m por veículo · {formatMeters(nesting.usedLength)} m no total
              {rollsNeeded > 1 ? ` · ${rollsNeeded} rolos` : ''}
            </p>
          )}
        </div>
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
            nesting.allFit
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
          )}
        >
          {nesting.allFit ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
          {fitStatusLabel}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 overflow-x-auto overscroll-x-contain"
      >
        <div
          className="relative mx-auto"
          style={{
            width: DIMENSION_GUTTER_LEFT + rollVisualWidthPx + 16,
            minWidth: 320,
            paddingTop: DIMENSION_GUTTER_TOP,
            paddingLeft: DIMENSION_GUTTER_LEFT,
          }}
        >
          <HorizontalDimension
            widthPx={rollVisualWidthPx}
            label={
              vehicleQuantity > 1
                ? `${formatMeters(nesting.usedLength)} m`
                : `${formatMeters(physicalRollLength)} m`
            }
            subLabel={vehicleQuantity > 1 ? 'Comprimento total usado' : 'Comprimento do rolo'}
            labelClass={theme.dimLabel}
          />
          <VerticalDimension
            heightPx={ROLL_VISUAL_HEIGHT_PX}
            label={`${formatMeters(rollWidth)} m`}
            subLabel="Largura do rolo"
            labelClass={theme.dimLabel}
          />

          {nesting.usedLength > 0.001 && nesting.placed.length > 0 && usedWidthPx > 0 && (
            <SegmentDimension
              leftPx={DIMENSION_GUTTER_LEFT}
              widthPx={usedWidthPx}
              label={`${formatMeters(nesting.usedLength)} m`}
              subLabel="Total usado"
              tone={theme.usedTone}
            />
          )}

          {leftoverLength > 0.001 && leftoverWidthPx > 0 && (
            <SegmentDimension
              leftPx={DIMENSION_GUTTER_LEFT + leftoverLeftPx}
              widthPx={leftoverWidthPx}
              label={`${formatMeters(leftoverLength)} m`}
              subLabel="Sobra"
              tone="slate"
              dashed
            />
          )}

          <div
            className="relative border-2 border-slate-500 bg-slate-800/40 overflow-hidden"
            style={{ width: rollVisualWidthPx, height: ROLL_VISUAL_HEIGHT_PX }}
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
                    className="absolute top-0 bottom-0 border-r-2 border-indigo-400/35 pointer-events-none z-[5]"
                    style={{ left: leftPx, width: Math.max(0, widthPx - 1) }}
                  >
                    <span className="absolute top-1 left-1 text-[8px] font-mono font-bold text-indigo-200 bg-slate-950/85 px-1.5 py-0.5 rounded border border-indigo-500/30">
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
              const showName = widthPx > 28 && heightPx > 16;
              const isSelected = selectedPartId === part.id;
              const isDimmed = selectedPartId !== null && !isSelected;

              return (
                <button
                  type="button"
                  key={`${part.id}-${index}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePartSelection(part.id);
                  }}
                  className={cn(
                    'absolute flex items-center justify-center text-center overflow-hidden transition-all duration-200 cursor-pointer p-0 font-inherit',
                    isSelected ? cn(theme.partSelected, 'z-20 scale-[1.02]') : cn(theme.partDefault, 'z-10'),
                    isDimmed && 'opacity-35 saturate-50',
                  )}
                  style={{ left: leftPx, top: topPx, width: widthPx, height: heightPx }}
                  title={part.name}
                  aria-pressed={isSelected}
                  aria-label={part.name}
                >
                  {showName ? (
                    <span className="text-[8px] sm:text-[9px] font-bold uppercase text-white leading-tight px-0.5 line-clamp-3">
                      {part.name.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-[6px] font-bold uppercase text-white truncate w-full px-0.5">
                      {part.name.slice(0, 4)}
                    </span>
                  )}
                </button>
              );
            })}

            {leftoverLength > 0.001 && (
              <div
                className="absolute top-0 bottom-0 bg-slate-600/40 border-l-2 border-dashed border-slate-400/50 flex items-center justify-center z-0"
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
      </div>

      {nestingPerVehicle.placed.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
            <MapPin size={11} className={theme.mapPin} />
            {vehicleQuantity > 1
              ? `Plano unitário — repetido ${vehicleQuantity}× no rolo`
              : 'Clique em uma peça para localizá-la no rolo'}
            {selectedPart && (
              <span className={cn(theme.hintSelected, 'normal-case tracking-normal font-sans')}>
                — <strong className="uppercase">{selectedPart.name}</strong> selecionada
              </span>
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {nestingPerVehicle.placed.map((part, index) => {
              const isSelected = selectedPartId?.startsWith(`${part.id}::`) || selectedPartId === part.id;
              return (
                <button
                  type="button"
                  key={`${part.id}-${index}`}
                  onClick={() => togglePartSelection(`${part.id}::c0`)}
                  className={cn(
                    'flex items-center rounded-lg border px-3 py-2 text-[10px] text-left transition-all cursor-pointer w-full',
                    isSelected ? theme.listSelected : theme.listDefault,
                  )}
                  aria-pressed={isSelected}
                >
                  <span
                    className={cn(
                      'truncate uppercase font-medium',
                      isSelected ? theme.listTextSelected : 'text-slate-300',
                    )}
                  >
                    {part.name}
                    {vehicleQuantity > 1 ? ` ×${vehicleQuantity}` : ''}
                    {part.rotated ? ' ↻' : ''}
                    {part.splitCount && part.splitCount > 1 ? ' ✂' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {nesting.unplaced.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
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

function SegmentDimension({
  leftPx,
  widthPx,
  label,
  subLabel,
  tone = 'indigo',
  dashed = false,
}: {
  leftPx: number;
  widthPx: number;
  label: string;
  subLabel: string;
  tone?: 'indigo' | 'emerald' | 'slate';
  dashed?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const startId = `seg-start-${uid}`;
  const endId = `seg-end-${uid}`;
  const arrowWidth = Math.max(widthPx, 24);

  const labelClass =
    tone === 'emerald'
      ? 'text-emerald-300'
      : tone === 'indigo'
        ? 'text-indigo-300'
        : 'text-slate-400';
  const subLabelClass =
    tone === 'emerald'
      ? 'text-emerald-400/70'
      : tone === 'indigo'
        ? 'text-indigo-400/70'
        : 'text-slate-500';
  const lineClass =
    tone === 'emerald'
      ? 'text-emerald-400/80'
      : tone === 'indigo'
        ? 'text-indigo-400/80'
        : 'text-slate-500';

  return (
    <div
      className="absolute flex flex-col items-center pointer-events-none"
      style={{ top: SEGMENT_DIMENSION_TOP, left: leftPx, width: arrowWidth }}
    >
      <span className={cn('text-[9px] font-mono font-bold tabular-nums', labelClass)}>
        {label}
      </span>
      <svg width={arrowWidth} height={14} className={cn('overflow-visible', lineClass)}>
        <defs>
          <marker id={startId} markerWidth="5" markerHeight="5" refX="0" refY="2.5" orient="auto">
            <path d="M5,0 L0,2.5 L5,5" fill="none" stroke="currentColor" strokeWidth="1" />
          </marker>
          <marker id={endId} markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5" fill="none" stroke="currentColor" strokeWidth="1" />
          </marker>
        </defs>
        <line
          x1={3}
          y1={10}
          x2={arrowWidth - 3}
          y2={10}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray={dashed ? '3 2' : undefined}
          markerStart={`url(#${startId})`}
          markerEnd={`url(#${endId})`}
        />
      </svg>
      <span className={cn('text-[7px] font-mono uppercase tracking-wider', subLabelClass)}>
        {subLabel}
      </span>
    </div>
  );
}

function HorizontalDimension({
  widthPx,
  label,
  subLabel,
  labelClass = 'text-indigo-300',
}: {
  widthPx: number;
  label: string;
  subLabel: string;
  labelClass?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const startId = `arrow-start-${uid}`;
  const endId = `arrow-end-${uid}`;

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ top: 0, left: DIMENSION_GUTTER_LEFT, width: widthPx }}
    >
      <span className={cn('text-[10px] font-mono font-bold tabular-nums', labelClass)}>{label}</span>
      <svg width={widthPx} height={18} className="overflow-visible text-slate-400">
        <defs>
          <marker id={startId} markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto">
            <path d="M6,0 L0,3 L6,6" fill="none" stroke="currentColor" strokeWidth="1" />
          </marker>
          <marker id={endId} markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke="currentColor" strokeWidth="1" />
          </marker>
        </defs>
        <line
          x1={4}
          y1={12}
          x2={widthPx - 4}
          y2={12}
          stroke="currentColor"
          strokeWidth="1"
          markerStart={`url(#${startId})`}
          markerEnd={`url(#${endId})`}
        />
      </svg>
      <span className="text-[8px] font-mono uppercase tracking-wider text-slate-500">{subLabel}</span>
    </div>
  );
}

function VerticalDimension({
  heightPx,
  label,
  subLabel,
  labelClass = 'text-indigo-300',
}: {
  heightPx: number;
  label: string;
  subLabel: string;
  labelClass?: string;
}) {
  return (
    <div
      className="absolute flex items-center"
      style={{ top: DIMENSION_GUTTER_TOP, left: 4, height: heightPx, width: DIMENSION_GUTTER_LEFT - 8 }}
    >
      <div className="flex flex-col items-center gap-0.5 w-full">
        <span className={cn('text-[9px] font-mono font-bold tabular-nums', labelClass)}>{label}</span>
        <svg width={16} height={heightPx - 24} className="text-slate-400 overflow-visible">
          <line x1={8} y1={2} x2={8} y2={heightPx - 26} stroke="currentColor" strokeWidth="1" />
          <path d="M5,2 L8,0 L11,2" fill="none" stroke="currentColor" strokeWidth="1" />
          <path
            d={`M5,${heightPx - 26} L8,${heightPx - 24} L11,${heightPx - 26}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
        <span className="text-[7px] font-mono uppercase tracking-wider text-slate-500 text-center leading-tight">
          {subLabel}
        </span>
      </div>
    </div>
  );
}
