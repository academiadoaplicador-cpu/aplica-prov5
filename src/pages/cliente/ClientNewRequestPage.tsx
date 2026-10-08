import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Car,
  Check,
  Home,
  Loader2,
  Package,
  Plus,
  Search,
  Send,
  Trash2,
  Wrench,
} from 'lucide-react';
import {
  ClientCatalog,
  ClientCatalogVehicle,
  PriceEstimate,
  ServiceRequestItem,
  SupplyMode,
} from '../../types';
import { VEHICLE_PARTS_DATA } from '../../types/vehicleParts';
import {
  clientService,
  type ServiceRequestDraft,
  type ServiceRequestItemDraft,
} from '../../services/clientService';
import { ROUTES } from '../../routes/paths';
import { formatCurrency, cn } from '../../lib/utils';

const inputClass =
  'w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-4 text-base sm:text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-600';
const labelClass = 'text-xs text-slate-500 mb-2 block font-mono';

type StepKey =
  | 'cotacao'
  | 'servico'
  | 'escopo'
  | 'produto'
  | 'tipo'
  | 'marca'
  | 'linha'
  | 'cor'
  | 'enviar';

const STEP_LABEL: Record<StepKey, string> = {
  cotacao: 'Tipo de cotação',
  servico: 'Serviço',
  escopo: 'Escopo',
  produto: 'Produto',
  tipo: 'Tipo do material',
  marca: 'Marca',
  linha: 'Linha / produto',
  cor: 'Cor / textura',
  enviar: 'Enviar',
};

/** Na cotação só da aplicação, o cliente escolhe o próprio material em passos. */
const STEPS_BY_MODE: Record<SupplyMode, StepKey[]> = {
  completo: ['cotacao', 'servico', 'escopo', 'produto', 'enviar'],
  mao_de_obra: ['cotacao', 'servico', 'escopo', 'tipo', 'marca', 'linha', 'cor', 'enviar'],
};

const SUPPLY_LABEL: Record<SupplyMode, string> = {
  completo: 'Material + aplicação',
  mao_de_obra: 'Só a aplicação (material meu)',
};

const SUB_TYPES = ['Móveis', 'Eletrodomésticos', 'Parede'] as const;

/** Traduz a complexidade técnica do cálculo para algo que o cliente sabe responder. */
const SURFACE_KINDS: { complexity: number; label: string; hint: string }[] = [
  { complexity: 1, label: 'Lisa e reta', hint: 'Porta, tampo, painel plano' },
  { complexity: 2, label: 'Com curvas ou recortes', hint: 'Puxadores, cantos arredondados' },
  { complexity: 3, label: 'Muito detalhada', hint: 'Frisos, acesso difícil, muitas quinas' },
];

const PART_NAME = new Map(VEHICLE_PARTS_DATA.map((p) => [p.id, p.name]));

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function emptyItem(): ServiceRequestItem {
  return { name: '', width: 0, height: 0, quantity: 1, complexity: 1 };
}

const MAX_ITEMS = 10;

interface AddedItem {
  key: string;
  draft: ServiceRequestItemDraft;
  productLabel: string;
  estimate: PriceEstimate;
}

function itemDraftOf(draft: ServiceRequestDraft): ServiceRequestItemDraft {
  const { type: _type, supplyMode: _mode, notes: _notes, requestItems: _items, ...item } = draft;
  return item;
}

export default function ClientNewRequestPage() {
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<ClientCatalog | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [step, setStep] = useState(0);

  const [supplyMode, setSupplyMode] = useState<SupplyMode | null>(null);
  const [laborType, setLaborType] = useState('');
  const [laborBrand, setLaborBrand] = useState('');
  const [laborLine, setLaborLine] = useState('');
  const [clientMaterialId, setClientMaterialId] = useState('');
  const [type, setType] = useState<'Automotivo' | 'Decorativo' | null>(null);
  const [subType, setSubType] = useState<string>('Móveis');
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [scope, setScope] = useState<'completo' | 'parcial'>('completo');
  const [partIds, setPartIds] = useState<string[]>([]);
  const [items, setItems] = useState<ServiceRequestItem[]>([emptyItem()]);
  const [materialType, setMaterialType] = useState('');
  const [notes, setNotes] = useState('');
  /** Itens já prontos; o item em montagem nos passos entra junto ao enviar. */
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);

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

  const steps = STEPS_BY_MODE[supplyMode ?? 'completo'];
  const current = steps[step];
  const laborOnly = supplyMode === 'mao_de_obra';

  const laborMaterials = catalog?.materials ?? [];
  const laborTypes = useMemo(
    () => uniqueSorted(laborMaterials.map((m) => m.type)),
    [laborMaterials],
  );
  const laborBrands = useMemo(
    () => uniqueSorted(laborMaterials.filter((m) => m.type === laborType).map((m) => m.brand)),
    [laborMaterials, laborType],
  );
  const laborLines = useMemo(
    () =>
      uniqueSorted(
        laborMaterials
          .filter((m) => m.type === laborType && m.brand === laborBrand)
          .map((m) => m.line),
      ),
    [laborMaterials, laborType, laborBrand],
  );
  const laborColors = useMemo(
    () =>
      laborMaterials.filter(
        (m) => m.type === laborType && m.brand === laborBrand && m.line === laborLine,
      ),
    [laborMaterials, laborType, laborBrand, laborLine],
  );
  const clientMaterial = laborMaterials.find((m) => m.id === clientMaterialId);

  const draft: ServiceRequestDraft | null = useMemo(() => {
    if (!type || !supplyMode) return null;
    const material = laborOnly
      ? { supplyMode, clientMaterialId, materialType: laborType }
      : { supplyMode, materialType };
    if (!material.materialType || (laborOnly && !clientMaterialId)) return null;
    if (type === 'Automotivo') {
      if (!vehicleId) return null;
      if (scope === 'parcial' && partIds.length === 0) return null;
      return { type, ...material, vehicleId, scope, partIds, notes };
    }
    const valid = items.filter((i) => Number(i.width) > 0 && Number(i.height) > 0);
    if (valid.length === 0) return null;
    return { type, subType, ...material, items: valid, notes };
  }, [
    type,
    supplyMode,
    laborOnly,
    clientMaterialId,
    laborType,
    materialType,
    vehicleId,
    scope,
    partIds,
    items,
    subType,
    notes,
  ]);

  const showEstimate = current === 'produto' || current === 'cor' || current === 'enviar';

  // Recalcula a faixa quando o escopo ou o material mudam, só nas etapas que a mostram.
  useEffect(() => {
    if (!showEstimate || !draft) {
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
  }, [draft, showEstimate]);

  const canAdvance = (): boolean => {
    switch (current) {
      case 'cotacao':
        return supplyMode !== null;
      case 'servico':
        return type !== null;
      case 'escopo':
        if (type === 'Automotivo') {
          return Boolean(vehicleId) && (scope === 'completo' || partIds.length > 0);
        }
        return items.some((i) => Number(i.width) > 0 && Number(i.height) > 0);
      case 'produto':
        return Boolean(materialType);
      case 'tipo':
        return Boolean(laborType);
      case 'marca':
        return Boolean(laborBrand);
      case 'linha':
        return Boolean(laborLine);
      case 'cor':
        return Boolean(clientMaterialId);
      default:
        return true;
    }
  };

  const currentProductLabel =
    laborOnly && clientMaterial
      ? `${clientMaterial.brand} · ${clientMaterial.line} · ${clientMaterial.colorTexture}`
      : materialType;

  /** O item montado nos passos, quando está completo e já tem estimativa. */
  const currentItem: AddedItem | null =
    draft && estimate && !estimating
      ? { key: 'current', draft: itemDraftOf(draft), productLabel: currentProductLabel, estimate }
      : null;
  const allItems = currentItem ? [...addedItems, currentItem] : addedItems;
  const escopoStep = steps.indexOf('escopo');
  const lastStep = steps.length - 1;
  // Um pedido não mistura tipos de cotação nem veículo com móveis.
  const lockedChoice = addedItems.length > 0;

  const resetCurrentItem = () => {
    setVehicleId('');
    setVehicleSearch('');
    setScope('completo');
    setPartIds([]);
    setItems([emptyItem()]);
    setLaborType('');
    setLaborBrand('');
    setLaborLine('');
    setClientMaterialId('');
  };

  const handleAddAnother = () => {
    if (!currentItem) return;
    setAddedItems((prev) => [...prev, { ...currentItem, key: crypto.randomUUID() }]);
    resetCurrentItem();
    setStep(escopoStep);
  };

  const handleRemoveItem = (key: string) => {
    setAddedItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleSubmit = async () => {
    if (!type || !supplyMode || allItems.length === 0) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await clientService.createRequest({
        type,
        supplyMode,
        notes,
        materialType: allItems[0].draft.materialType,
        requestItems: allItems.map((item) => item.draft),
      });
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
          Etapa {step + 1} de {steps.length} — {STEP_LABEL[current]}
          {addedItems.length > 0 && current !== 'enviar' && (
            <span className="text-emerald-400"> · item {addedItems.length + 1}</span>
          )}
        </p>
      </header>

      <div className="flex gap-1.5">
        {steps.map((key, index) => (
          <div
            key={key}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              index <= step ? 'bg-emerald-500' : 'bg-slate-800',
            )}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
        {current === 'cotacao' && (
          <div className="space-y-3">
            <label className={labelClass}>Como você quer a cotação?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChoiceCard
                active={supplyMode === 'completo'}
                onClick={() => !lockedChoice && setSupplyMode('completo')}
                icon={<Package size={20} />}
                title="Material + aplicação"
                description="O aplicador indica e fornece o material, e faz a aplicação"
              />
              <ChoiceCard
                active={supplyMode === 'mao_de_obra'}
                onClick={() => !lockedChoice && setSupplyMode('mao_de_obra')}
                icon={<Wrench size={20} />}
                title="Só a aplicação"
                description="Você já tem o material; o aplicador cobra apenas o serviço"
              />
            </div>
            {lockedChoice && <LockedNotice />}
          </div>
        )}

        {current === 'servico' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChoiceCard
                active={type === 'Automotivo'}
                onClick={() => !lockedChoice && setType('Automotivo')}
                icon={<Car size={20} />}
                title="Veículo"
                description="Envelopamento de carro, moto, van ou frota"
              />
              <ChoiceCard
                active={type === 'Decorativo'}
                onClick={() => !lockedChoice && setType('Decorativo')}
                icon={<Home size={20} />}
                title="Móveis e ambientes"
                description="Móveis, eletrodomésticos ou parede"
              />
            </div>
            {lockedChoice && <LockedNotice />}
          </div>
        )}

        {current === 'escopo' && addedItems.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-emerald-600/20 bg-emerald-600/5 px-4 py-3">
            <p className="text-xs text-slate-300">
              {addedItems.length} {addedItems.length === 1 ? 'item pronto' : 'itens prontos'}.
              Monte o próximo ou volte ao resumo.
            </p>
            <button
              type="button"
              onClick={() => {
                resetCurrentItem();
                setStep(lastStep);
              }}
              className="shrink-0 text-xs font-bold text-emerald-400 hover:text-emerald-300"
            >
              Ir para o resumo sem adicionar
            </button>
          </div>
        )}

        {current === 'escopo' && type === 'Automotivo' && (
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

        {current === 'escopo' && type === 'Decorativo' && (
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

        {current === 'tipo' && (
          <OptionList
            label="Qual é o tipo do material que você tem?"
            options={laborTypes.map((t) => ({
              value: t,
              title: t,
              hint: FINISH_HINT[t],
            }))}
            selected={laborType}
            onSelect={(value) => {
              if (value === laborType) return;
              setLaborType(value);
              setLaborBrand('');
              setLaborLine('');
              setClientMaterialId('');
            }}
          />
        )}

        {current === 'marca' && (
          <OptionList
            label="De qual marca?"
            options={laborBrands.map((b) => ({ value: b, title: b }))}
            selected={laborBrand}
            onSelect={(value) => {
              if (value === laborBrand) return;
              setLaborBrand(value);
              setLaborLine('');
              setClientMaterialId('');
            }}
          />
        )}

        {current === 'linha' && (
          <OptionList
            label="Qual linha / produto?"
            options={laborLines.map((l) => ({ value: l, title: l }))}
            selected={laborLine}
            onSelect={(value) => {
              if (value === laborLine) return;
              setLaborLine(value);
              setClientMaterialId('');
            }}
          />
        )}

        {current === 'cor' && (
          <div className="space-y-4">
            <OptionList
              label="Qual cor / textura?"
              options={laborColors.map((m) => ({ value: m.id, title: m.colorTexture || m.line }))}
              selected={clientMaterialId}
              onSelect={setClientMaterialId}
            />
            {clientMaterialId && (
              <EstimateBox estimate={estimate} loading={estimating} error={estimateError} />
            )}
          </div>
        )}

        {current === 'produto' && (
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

        {current === 'enviar' && (
          <div className="space-y-5">
            {addedItems.length === 0 ? (
              <>
                <EstimateBox estimate={estimate} loading={estimating} error={estimateError} />

                <dl className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2 text-sm">
                  <SummaryRow label="Cotação" value={supplyMode ? SUPPLY_LABEL[supplyMode] : '—'} />
                  <SummaryRow label="Serviço" value={type || '—'} />
                  <SummaryRow label="Escopo" value={estimate?.scopeLabel || '—'} />
                  <SummaryRow
                    label={laborOnly ? 'Seu material' : 'Produto'}
                    value={currentProductLabel || '—'}
                  />
                  {estimate && (
                    <SummaryRow label="Área estimada" value={`${estimate.estimatedM2} m²`} />
                  )}
                </dl>
              </>
            ) : (
              <ItemsSummary
                items={allItems}
                currentKey={currentItem?.key}
                laborOnly={laborOnly}
                supplyLabel={supplyMode ? SUPPLY_LABEL[supplyMode] : ''}
                onRemove={handleRemoveItem}
                estimating={estimating}
                estimateError={estimateError}
              />
            )}

            {currentItem && allItems.length < MAX_ITEMS && (
              <button
                type="button"
                onClick={handleAddAnother}
                className="w-full flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-emerald-600/30 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 text-sm font-bold transition-colors"
              >
                <Plus size={16} />
                {type === 'Automotivo' ? 'Adicionar outro veículo' : 'Adicionar outro item'}
              </button>
            )}

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
              horas. O primeiro que aceitar tem 1 hora para enviar o valor exato; se não
              enviar, o pedido passa para outro aplicador.
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

        {step < steps.length - 1 ? (
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
            disabled={submitting || estimating || allItems.length === 0}
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
  Poliéster: 'Película para aplicação em vidros',
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
        Estimativa prévia
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
          {estimate.laborOnly ? (
            <p className="mt-1 text-xs text-slate-500">
              Somente a mão de obra. O material é fornecido por você e não entra no valor.
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Com base em {estimate.productCount}{' '}
              {estimate.productCount === 1 ? 'produto' : 'produtos'} do catálogo, de{' '}
              {formatCurrency(estimate.minPricePerM2)} a {formatCurrency(estimate.maxPricePerM2)}{' '}
              por m², conforme marca, linha e cor/textura.
            </p>
          )}
          <p className="mt-3 text-[11px] text-slate-600 leading-relaxed">
            Este é um valor prévio, só para referência. O valor final é fechado com o
            aplicador que aceitar o pedido, depois que ele confirmar as medidas e o produto.
          </p>
        </>
      )}
    </div>
  );
}

function LockedNotice() {
  return (
    <p className="text-[11px] text-slate-500">
      Já há itens neste pedido. Para mudar esta escolha, remova os itens no resumo.
    </p>
  );
}

/** Resumo do pedido com vários itens: estimativa de cada um e a soma. */
function ItemsSummary({
  items,
  currentKey,
  laborOnly,
  supplyLabel,
  onRemove,
  estimating,
  estimateError,
}: {
  items: AddedItem[];
  currentKey?: string;
  laborOnly: boolean;
  supplyLabel: string;
  onRemove: (key: string) => void;
  estimating: boolean;
  estimateError: string;
}) {
  const min = items.reduce((acc, item) => acc + item.estimate.priceMin, 0);
  const max = items.reduce((acc, item) => acc + item.estimate.priceMax, 0);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-600/20 bg-emerald-600/5 p-5">
        <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
          Estimativa prévia · {items.length} itens
        </p>
        <p className="mt-1 text-2xl font-bold text-white tracking-tight">
          {formatCurrency(min)}
          <span className="mx-2 text-slate-600 font-normal">a</span>
          {formatCurrency(max)}
        </p>
        <p className="mt-2 text-[11px] text-slate-500">
          {supplyLabel}. Soma das faixas de cada item. O valor final é fechado com o aplicador
          que aceitar o pedido.
        </p>
      </div>

      <ul className="rounded-xl border border-slate-800 bg-slate-950/60 divide-y divide-slate-800/80">
        {items.map((item, index) => (
          <li key={item.key} className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 text-[10px] font-mono text-slate-600 w-5 shrink-0">
              {index + 1}.
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white break-words">
                {item.estimate.scopeLabel}
              </p>
              <p className="text-xs text-slate-500 break-words">
                {laborOnly ? 'Seu material: ' : ''}
                {item.productLabel} · {item.estimate.estimatedM2} m²
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatCurrency(item.estimate.priceMin)} a {formatCurrency(item.estimate.priceMax)}
              </p>
            </div>
            {item.key === currentKey ? (
              <span
                title="Use Voltar para ajustar este item"
                className="shrink-0 text-[10px] font-mono uppercase text-emerald-400 mt-0.5"
              >
                atual
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onRemove(item.key)}
                aria-label="Remover item"
                className="shrink-0 min-h-10 min-w-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 size={15} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {estimating && (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 size={13} className="animate-spin" />
          Calculando o último item...
        </p>
      )}
      {estimateError && <p className="text-xs text-red-400">{estimateError}</p>}
    </div>
  );
}

/** Lista de escolha única; com muitas opções, ganha uma busca no topo. */
function OptionList({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { value: string; title: string; hint?: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = q ? options.filter((o) => o.title.toLowerCase().includes(q)) : options;

  return (
    <div>
      <label className={labelClass}>{label}</label>
      {options.length > 8 && (
        <div className="relative mb-3">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className={cn(inputClass, 'pl-10')}
          />
        </div>
      )}
      <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800/80">
        {visible.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">Nada encontrado.</p>
        ) : (
          visible.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cn(
                'w-full flex items-center gap-3 text-left px-4 py-3 transition-colors',
                selected === option.value
                  ? 'bg-emerald-600/10 text-emerald-300'
                  : 'text-slate-300 hover:bg-slate-800/60',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{option.title}</span>
                {option.hint && (
                  <span className="block mt-0.5 text-xs text-slate-500">{option.hint}</span>
                )}
              </span>
              {selected === option.value && <Check size={15} className="shrink-0" />}
            </button>
          ))
        )}
      </div>
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
