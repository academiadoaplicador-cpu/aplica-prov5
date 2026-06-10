import type { ReactNode } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Car,
  Home,
  Trash2,
  Package,
  Clock,
  Ruler,
  Layers,
  User,
  Calendar,
  Hash,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Budget, Material } from '../types';
import { VEHICLE_PARTS_DATA } from '../types/vehicleParts';
import { formatCurrency, cn } from '../lib/utils';
import GeneratePdfButton from './GeneratePdfButton';
import SupplierWhatsAppButton from './SupplierWhatsAppButton';
import { getMaterialProductLine } from '../utils/materialSelection';

interface BudgetDetailDrawerProps {
  budget: Budget | null;
  materials: Material[];
  open: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  onStatusChange: (status: Budget['status']) => void;
  onDelete: () => void;
  onGeneratePDF: () => void;
  /** Modo somente leitura (painel admin — orçamento de outro usuário) */
  readOnly?: boolean;
  officeLabel?: string;
}

function formatBudgetRef(id: string): string {
  const clean = id.replace(/-/g, '').toUpperCase();
  return clean.length > 8 ? clean.slice(-8) : clean;
}

function getPieceNames(budget: Budget): string[] {
  return budget.items
    .map((item) => VEHICLE_PARTS_DATA.find((p) => p.id === item.partId)?.name)
    .filter((name): name is string => Boolean(name));
}

export default function BudgetDetailDrawer({
  budget,
  materials,
  open,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  currentIndex,
  totalCount,
  onStatusChange,
  onDelete,
  onGeneratePDF,
  readOnly = false,
  officeLabel,
}: BudgetDetailDrawerProps) {
  const material = budget ? materials.find((m) => m.id === budget.materialId) : null;
  const pieceNames = budget && budget.type === 'Automotivo' ? getPieceNames(budget) : [];
  const projectLabel =
    budget?.vehicleModel || budget?.applianceModel || 'Projeto personalizado';

  return (
    <AnimatePresence>
      {open && budget && (
        <>
          <motion.button
            type="button"
            aria-label="Fechar detalhes"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Detalhes do orçamento"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="shrink-0 p-5 border-b border-slate-800 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 mb-1">
                    Orçamento #{formatBudgetRef(budget.id)}
                  </p>
                  <h3 className="text-lg font-bold text-white truncate">{budget.customerName}</h3>
                  {officeLabel && (
                    <p className="text-[10px] font-mono text-amber-400/90 truncate mt-0.5">
                      {officeLabel}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 italic truncate mt-0.5">{projectLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                  aria-label="Voltar para a lista"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  ← Voltar à lista
                </button>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-slate-500 mr-2">
                    {currentIndex + 1} / {totalCount}
                  </span>
                  <button
                    type="button"
                    disabled={!hasPrevious}
                    onClick={onPrevious}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Orçamento anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={onNext}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Próximo orçamento"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <DetailRow icon={<Calendar size={14} />} label="Data">
                {new Date(budget.date).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </DetailRow>

              <DetailRow icon={<User size={14} />} label="Cliente">
                {budget.customerName}
              </DetailRow>

              <DetailRow
                icon={budget.type === 'Automotivo' ? <Car size={14} /> : <Home size={14} />}
                label={budget.type === 'Automotivo' ? 'Veículo' : 'Projeto'}
              >
                {projectLabel}
              </DetailRow>

              <DetailRow icon={<Hash size={14} />} label="Tipo">
                {budget.subType ? `${budget.type} · ${budget.subType}` : budget.type}
              </DetailRow>

              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  Status
                </span>
                {readOnly ? (
                  <p
                    className={cn(
                      'text-xs font-mono font-bold uppercase py-2 px-3 rounded-xl bg-slate-950 border',
                      budget.status === 'Finalizado'
                        ? 'text-emerald-400 border-emerald-500/30'
                        : budget.status === 'Pendente'
                          ? 'text-amber-400 border-amber-500/30'
                          : budget.status === 'Cancelado'
                            ? 'text-red-400 border-red-500/30'
                            : 'text-indigo-400 border-indigo-500/30',
                    )}
                  >
                    {budget.status}
                  </p>
                ) : (
                  <select
                    value={budget.status}
                    onChange={(e) => onStatusChange(e.target.value as Budget['status'])}
                    className={cn(
                      'w-full text-xs font-mono font-bold uppercase py-2 px-3 rounded-xl bg-slate-950 border focus:outline-none focus:ring-1',
                      budget.status === 'Finalizado'
                        ? 'text-emerald-400 border-emerald-500/30'
                        : budget.status === 'Pendente'
                          ? 'text-amber-400 border-amber-500/30'
                          : budget.status === 'Cancelado'
                            ? 'text-red-400 border-red-500/30'
                            : 'text-indigo-400 border-indigo-500/30',
                    )}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                )}
              </div>

              {material && (
                <section className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Package size={16} />
                    <span className="text-[10px] font-mono uppercase tracking-widest">
                      Material
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white">{material.name}</p>
                  <p className="text-xs text-slate-500">
                    {material.brand} · {material.type} · Linha {material.line}
                  </p>
                  <p className="text-xs text-slate-400">{material.colorTexture}</p>
                  {budget.customPricePerM2 != null && (
                    <p className="text-[10px] text-amber-400 font-mono">
                      Preço customizado: {formatCurrency(budget.customPricePerM2)}/m²
                    </p>
                  )}
                </section>
              )}

              {pieceNames.length > 0 && (
                <section className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    Peças ({pieceNames.length})
                  </span>
                  <ul className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5 max-h-40 overflow-y-auto">
                    {pieceNames.map((name) => (
                      <li key={name} className="text-xs text-slate-300 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                        {name}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="grid grid-cols-2 gap-3">
                <MetricCard
                  icon={<Ruler size={14} />}
                  label="Consumo linear"
                  value={`${budget.totalMaterialMeters.toFixed(2)} m`}
                />
                <MetricCard
                  icon={<Layers size={14} />}
                  label="Área"
                  value={
                    budget.totalMaterialM2
                      ? `${budget.totalMaterialM2.toFixed(2)} m²`
                      : '—'
                  }
                />
                <MetricCard
                  icon={<Clock size={14} />}
                  label="Mão de obra"
                  value={`${budget.totalHours.toFixed(1)} h`}
                />
                <MetricCard
                  icon={<Package size={14} />}
                  label="Custo base"
                  value={formatCurrency(budget.totalCost)}
                />
              </section>

              <section className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4 text-center space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">
                  Investimento total
                </p>
                <p className="text-3xl font-black text-white tracking-tight">
                  {formatCurrency(budget.totalPrice)}
                </p>
                <p className="text-xs text-indigo-400/80 font-mono">
                  Lucro estimado: {formatCurrency(budget.profit)}
                </p>
              </section>
            </div>

            {/* Footer actions */}
            {!readOnly && (
              <div className="shrink-0 p-5 border-t border-slate-800 space-y-2">
                {material && (
                  <SupplierWhatsAppButton
                    brand={material.brand}
                    line={getMaterialProductLine(material)}
                    messageContext={{
                      customerName: budget.customerName,
                      projectLabel: projectLabel,
                      brand: material.brand,
                      line: getMaterialProductLine(material),
                      areaM2: budget.totalMaterialM2,
                      totalPrice: budget.totalPrice,
                      budgetType: budget.type,
                    }}
                  />
                )}
                <GeneratePdfButton
                  onGenerate={onGeneratePDF}
                  label="Gerar PDF"
                  size="sm"
                />
                <button
                  type="button"
                  onClick={onDelete}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-bold transition-colors"
                >
                  <Trash2 size={16} />
                  Excluir orçamento
                </button>
              </div>
            )}
            {readOnly && (
              <div className="shrink-0 p-5 border-t border-slate-800">
                <p className="text-[10px] text-center text-slate-500 font-mono uppercase">
                  Visualização administrativa (somente leitura)
                </p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</p>
        <p className="text-sm text-white mt-0.5">{children}</p>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-slate-500 mb-1">{icon}</div>
      <p className="text-[9px] font-mono uppercase text-slate-500">{label}</p>
      <p className="text-sm font-bold text-white font-mono mt-0.5">{value}</p>
    </div>
  );
}
