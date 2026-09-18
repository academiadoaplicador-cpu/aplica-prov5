import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Car,
  Check,
  Home,
  Loader2,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import {
  ClientCatalog,
  ClientCatalogVehicle,
  PriceEstimate,
  ServiceRequestItem,
} from '../../types';
import { VEHICLE_PARTS_DATA } from '../../types/vehicleParts';
import { clientService, type ServiceRequestDraft } from '../../services/clientService';
import { ROUTES } from '../../routes/paths';
import { formatCurrency, cn } from '../../lib/utils';

const inputClass =
  'w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-4 text-base sm:text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-600';
const labelClass = 'text-xs text-slate-500 mb-2 block font-mono';

const STEPS = ['Serviço', 'Escopo', 'Acabamento', 'Enviar'] as const;

const SUB_TYPES = ['Móveis', 'Eletrodomésticos', 'Parede'] as const;

/** Traduz a complexidade técnica do cálculo para algo que o cliente sabe responder. */
const SURFACE_KINDS: { complexity: number; label: string; hint: string }[] = [
  { complexity: 1, label: 'Lisa e reta', hint: 'Porta, tampo, painel plano' },
  { complexity: 2, label: 'Com curvas ou recortes', hint: 'Puxadores, cantos arredondados' },
  { complexity: 3, label: 'Muito detalhada', hint: 'Frisos, acesso difícil, muitas quinas' },
];

const PART_NAME = new Map(VEHICLE_PARTS_DATA.map((p) => [p.id, p.name]));

function emptyItem(): ServiceRequestItem {
  return { name: '', width: 0, height: 0, quantity: 1, complexity: 1 };
}

export default function ClientNewRequestPage() {
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<ClientCatalog | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [step, setStep] = useState(0);

  const [type, setType] = useState<'Automotivo' | 'Decorativo' | null>(null);
  const [subType, setSubType] = useState<string>('Móveis');
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [scope, setScope] = useState<'completo' | 'parcial'>('completo');
  const [partIds, setPartIds] = useState<string[]>([]);
  const [items, setItems] = useState<ServiceRequestItem[]>([emptyItem()]);
  const [materialType, setMaterialType] = useState('');
  const [notes, setNotes] = useState('');

  const [estimate, setEstimate] = useState<PriceEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    clientService
      .getCatalog()
      .then((data) => {
        setCatalog(data);
        if (data.materialTypes.length > 0) setMaterialType(data.materialTypes[0]);
      })
      .catch(() => setCatalog(null))
      .finally(() => setLoadingCatalog(false));
  }, []);

  const selectedVehicle: ClientCatalogVehicle | undefined = useMemo(
    () => catalog?.vehicles.find((v) => v.id === vehicleId),
    [catalog, vehicleId],
  );

  const filteredVehicles = useMemo(() => {
    if (!catalog) return [];
    const q = vehicleSearch.trim().toLowerCase();
    if (!q) return catalog.vehicles.slice(0, 40);
    return catalog.vehicles
      .filter((v) => `${v.make} ${v.model} ${v.year}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [catalog, vehicleSearch]);

  const draft: ServiceRequestDraft | null = useMemo(() => {
    if (!type || !materialType) return null;
    if (type === 'Automotivo') {
      if (!vehicleId) return null;
      if (scope === 'parcial' && partIds.length === 0) return null;
      return { type, materialType, vehicleId, scope, partIds, notes };
    }
    const valid = items.filter((i) => Number(i.width) > 0 && Number(i.height) > 0);
    if (valid.length === 0) return null;
    return { type, subType, materialType, items: valid, notes };
  }, [type, materialType, vehicleId, scope, partIds, items, subType, notes]);

  // Recalcula a faixa quando o escopo muda, mas só a partir da etapa do acabamento.
  useEffect(() => {
    if (step < 2 || !draft) {
      setEstimate(null);
      return;
    }
    let cancelled = false;
    setEstimating(true);
    setEstimateError('');
    const timer = setTimeout(() => {
      clientService
        .estimate(draft)
        .then((result) => {
          if (!cancelled) setEstimate(result);
        })
        .catch((e) => {
          if (!cancelled) {
            setEstimate(null);
            setEstimateError(e instanceof Error ? e.message : 'Erro ao calcular');
          }
        })
        .finally(() => {
          if (!cancelled) setEstimating(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft, step]);

  const canAdvance = (): boolean => {
    if (step === 0) return type !== null;
    if (step === 1) {
      if (type === 'Automotivo') {
        return Boolean(vehicleId) && (scope === 'completo' || partIds.length > 0);
      }
      return items.some((i) => Number(i.width) > 0 && Number(i.height) > 0);
    }
    if (step === 2) return Boolean(materialType);
    return true;
  };

  const handleSubmit = async () => {
    if (!draft) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await clientService.createRequest(draft);
      navigate(ROUTES.client.orders, { replace: true });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Não foi possível enviar o pedido');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCatalog) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!catalog || catalog.materialTypes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <h1 className="text-lg font-bold text-white">Orçamento indisponível no momento</h1>
          <p className="mt-2 text-sm text-slate-500">
            A tabela de referência da plataforma ainda não está configurada. Tente novamente
            mais tarde.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <p className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
          Área do Cliente
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Pedir um orçamento</h1>
        <p className="mt-2 text-sm text-slate-500">
          Etapa {step + 1} de {STEPS.length} — {STEPS[step]}
        </p>
      </header>

      <div className="flex gap-1.5">
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              index <= step ? 'bg-emerald-500' : 'bg-slate-800',
            )}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
        {step === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ChoiceCard
              active={type === 'Automotivo'}
              onClick={() => setType('Automotivo')}
              icon={<Car size={20} />}
              title="Veículo"
              description="Envelopamento de carro, moto, van ou frota"
            />
            <ChoiceCard
              active={type === 'Decorativo'}
              onClick={() => setType('Decorativo')}
              icon={<Home size={20} />}
              title="Móveis e ambientes"
              description="Móveis, eletrodomésticos ou parede"
            />
          </div>
        )}

        {step === 1 && type === 'Automotivo' && (
          <div className="space-y-5">
            <div>
              <label className={labelClass} htmlFor="vehicle-search">
                Qual é o veículo?
              </label>
              <input
                id="vehicle-search"
                type="search"
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                placeholder="Buscar marca ou modelo..."
                className={inputClass}
              />
              <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800/80">
                {filteredVehicles.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">
                    Nenhum veículo encontrado.
                  </p>
                ) : (
                  filteredVehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVehicleId(v.id);
                        setPartIds([]);
                      }}
                      className={cn(
                        'w-full text-left px-4 py-3 transition-colors',
                        vehicleId === v.id
                          ? 'bg-emerald-600/10 text-emerald-300'
                          : 'text-slate-300 hover:bg-slate-800/60',
                      )}
                    >
                      <span className="text-sm font-medium">
                        {v.make} {v.model}
                      </span>
                      <span className="ml-2 text-xs text-slate-500 font-mono">{v.year}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {selectedVehicle && (
              <div>
                <label className={labelClass}>O que vai ser envelopado?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ChoiceCard
                    active={scope === 'completo'}
                    onClick={() => setScope('completo')}
                    title="Carro completo"
                    description="Todas as peças externas"
                  />
                  <ChoiceCard
                    active={scope === 'parcial'}
                    onClick={() => setScope('parcial')}
                    title="Só algumas peças"
                    description="Você escolhe quais"
                  />
                </div>

                {scope === 'parcial' && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedVehicle.parts.map((part) => {
                      const active = partIds.includes(part.id);
                      return (
                        <button
                          key={part.id}
                          type="button"
                          onClick={() =>
                            setPartIds((prev) =>
                              active ? prev.filter((id) => id !== part.id) : [...prev, part.id],
                            )
                          }
                          className={cn(
                            'px-3 py-2.5 rounded-xl border text-left text-xs font-medium transition-colors',
                            active
                              ? 'bg-emerald-600/10 border-emerald-600/30 text-emerald-300'
                              : 'border-slate-800 text-slate-400 hover:border-slate-700',
                          )}
                        >
                          {PART_NAME.get(part.id) || part.id}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 1 && type === 'Decorativo' && (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>O que você quer envelopar?</label>
              <div className="flex gap-2 flex-wrap">
                {SUB_TYPES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSubType(value)}
                    className={cn(
                      'px-4 py-2 rounded-xl border text-sm font-medium transition-colors',
                      subType === value
                        ? 'bg-emerald-600/10 border-emerald-600/30 text-emerald-300'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700',
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className={labelClass}>Superfícies e medidas (em metros)</label>
              {items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.name || ''}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) =>
                            i === index ? { ...it, name: e.target.value } : it,
                          ),
                        )
                      }
                      placeholder={`Superfície ${index + 1} (ex.: porta do armário)`}
                      className={cn(inputClass, 'h-10')}
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                        aria-label="Remover superfície"
                        className="shrink-0 p-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <NumberField
                      label="Largura"
                      value={item.width}
                      onChange={(v) =>
                        setItems((prev) =>
                          prev.map((it, i) => (i === index ? { ...it, width: v } : it)),
                        )
                      }
                    />
                    <NumberField
                      label="Altura"
                      value={item.height}
                      onChange={(v) =>
                        setItems((prev) =>
                          prev.map((it, i) => (i === index ? { ...it, height: v } : it)),
                        )
                      }
                    />
                    <NumberField
                      label="Qtd."
                      value={item.quantity ?? 1}
                      step={1}
                      onChange={(v) =>
                        setItems((prev) =>
                          prev.map((it, i) =>
                            i === index ? { ...it, quantity: Math.max(1, Math.round(v)) } : it,
                          ),
                        )
                      }
                    />
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {SURFACE_KINDS.map((kind) => (
                      <button
                        key={kind.complexity}
                        type="button"
                        title={kind.hint}
                        onClick={() =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === index ? { ...it, complexity: kind.complexity } : it,
                            ),
                          )
                        }
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-colors',
                          (item.complexity ?? 1) === kind.complexity
                            ? 'bg-emerald-600/10 border-emerald-600/30 text-emerald-300'
                            : 'border-slate-800 text-slate-500 hover:border-slate-700',
                        )}
                      >
                        {kind.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {items.length < 20 && (
                <button
                  type="button"
                  onClick={() => setItems((prev) => [...prev, emptyItem()])}
                  className="flex items-center gap-2 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  <Plus size={14} />
                  Adicionar outra superfície
                </button>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Qual acabamento você prefere?</label>
              <div className="grid grid-cols-2 gap-3">
                {catalog.materialTypes.map((value) => (
                  <div key={value} className="contents">
                    <ChoiceCard
                      active={materialType === value}
                      onClick={() => setMaterialType(value)}
                      title={value}
                      description={FINISH_HINT[value] || 'Acabamento profissional'}
                    />
                  </div>
                ))}
              </div>
            </div>
            <EstimateBox
              estimate={estimate}
              loading={estimating}
              error={estimateError}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <EstimateBox estimate={estimate} loading={estimating} error={estimateError} />

            <dl className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2 text-sm">
              <SummaryRow label="Serviço" value={type || '—'} />
              <SummaryRow label="Escopo" value={estimate?.scopeLabel || '—'} />
              <SummaryRow label="Acabamento" value={materialType} />
              {estimate && (
                <SummaryRow label="Área estimada" value={`${estimate.estimatedM2} m²`} />
              )}
            </dl>

            <div>
              <label className={labelClass} htmlFor="request-notes">
                Alguma observação? (opcional)
              </label>
              <textarea
                id="request-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
                rows={3}
                placeholder="Cor desejada, prazo, detalhes do local..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-600 resize-none"
              />
            </div>

            <p className="text-[11px] text-slate-600">
              Seu pedido fica visível para aplicadores verificados de {' '}
              <strong className="text-slate-400">sua cidade</strong> por {catalog.expiryHours}{' '}
              horas. O primeiro que aceitar fica com o serviço e entra em contato com você.
            </p>

            {submitError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {submitError}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => (step === 0 ? navigate(ROUTES.client.home) : setStep(step - 1))}
          className="flex items-center gap-2 h-11 px-4 rounded-xl border border-slate-800 text-slate-400 text-sm font-medium hover:border-slate-700 hover:text-slate-200"
        >
          <ArrowLeft size={16} />
          {step === 0 ? 'Cancelar' : 'Voltar'}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!canAdvance()}
            onClick={() => setStep(step + 1)}
            className="flex items-center gap-2 h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
          >
            Continuar
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting || !estimate}
            onClick={() => void handleSubmit()}
            className="flex items-center gap-2 h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {submitting ? 'Enviando...' : 'Enviar pedido'}
          </button>
        )}
      </div>
    </div>
  );
}

const FINISH_HINT: Record<string, string> = {
  Cast: 'Premium, acompanha curvas complexas',
  Calandrado: 'Bom custo-benefício, superfícies planas',
  PPF: 'Película de proteção transparente',
  Poliéster: 'Uso interno e comunicação visual',
};

function EstimateBox({
  estimate,
  loading,
  error,
}: {
  estimate: PriceEstimate | null;
  loading: boolean;
  error: string;
}) {
  if (error) {
    return (
      <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
        {error}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-600/20 bg-emerald-600/5 p-5">
      <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
        Estimativa
      </p>
      {loading || !estimate ? (
        <div className="mt-2 flex items-center gap-2 text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Calculando...</span>
        </div>
      ) : (
        <>
          <p className="mt-1 text-2xl font-bold text-white tracking-tight">
            {formatCurrency(estimate.priceMin)}
            <span className="mx-2 text-slate-600 font-normal">a</span>
            {formatCurrency(estimate.priceMax)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {estimate.estimatedM2} m² · cerca de {estimate.estimatedHours} h de aplicação
          </p>
          <p className="mt-3 text-[11px] text-slate-600 leading-relaxed">
            Faixa de referência da plataforma. O valor final é fechado com o aplicador que
            aceitar o pedido, depois que ele confirmar as medidas e o material.
          </p>
        </>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500 shrink-0">{label}</dt>
      <dd className="text-slate-200 text-right">{value}</dd>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 0.01,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="text-[10px] text-slate-600 mb-1 block font-mono">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder="0"
        className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-700"
      />
    </div>
  );
}

function ChoiceCard({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left rounded-xl border p-4 transition-colors',
        active
          ? 'bg-emerald-600/10 border-emerald-600/30'
          : 'border-slate-800 hover:border-slate-700',
      )}
    >
      <div className="flex items-center gap-2">
        {icon && (
          <span className={active ? 'text-emerald-400' : 'text-slate-500'}>{icon}</span>
        )}
        <span className={cn('text-sm font-bold', active ? 'text-emerald-300' : 'text-white')}>
          {title}
        </span>
        {active && <Check size={14} className="ml-auto text-emerald-400" />}
      </div>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </button>
  );
}
