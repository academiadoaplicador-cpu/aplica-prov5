import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  FileText,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  ShieldOff,
  Wrench,
  X,
} from 'lucide-react';
import {
  PROPOSAL_BUDGET_STATUS,
  ProposalStatus,
  RegionRequestsResponse,
  ServiceRequest,
  ServiceRequestProposal,
} from '../types';
import ProposalPanel from '../components/marketplace/ProposalPanel';
import { applicatorService } from '../services/applicatorService';
import { formatCurrency, cn } from '../lib/utils';

function hoursLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expirando';
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h para aceitar`;
  return `${Math.max(1, Math.round(ms / 60_000))} min para aceitar`;
}

export default function RegionRequestsPage() {
  const [data, setData] = useState<RegionRequestsResponse | null>(null);
  const [accepted, setAccepted] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [refuseOpenId, setRefuseOpenId] = useState<string | null>(null);
  const [refuseReason, setRefuseReason] = useState('');
  const [refusing, setRefusing] = useState(false);
  const [proposalOpenId, setProposalOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [region, mine, availability] = await Promise.all([
        applicatorService.getRegionRequests(),
        applicatorService.getAcceptedRequests(),
        applicatorService.getAvailability(),
      ]);
      setData(region);
      setAccepted(mine);
      setAvailable(availability.isAvailable);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * O match é assíncrono e não há push: sem isso o aplicador só descobre um
   * pedido novo se abrir a página no momento exato. Recarrega em intervalo e
   * sempre que a aba volta ao foco.
   */
  useEffect(() => {
    const interval = setInterval(() => void load(), 30_000);
    const onFocus = () => {
      if (document.visibilityState === 'visible') void load();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [load]);

  const toggleAvailability = async () => {
    if (available === null) return;
    setTogglingAvailability(true);
    try {
      const result = await applicatorService.setAvailability(!available);
      setAvailable(result.isAvailable);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao mudar disponibilidade');
    } finally {
      setTogglingAvailability(false);
    }
  };

  const handleAccept = async (id: string) => {
    setAccepting(id);
    setError('');
    try {
      await applicatorService.acceptRequest(id);
      await load();
      setProposalOpenId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível aceitar');
      await load();
    } finally {
      setAccepting(null);
    }
  };

  const openRefuse = (id: string) => {
    setRefuseOpenId(id);
    setRefuseReason('');
  };

  const closeRefuse = () => {
    setRefuseOpenId(null);
    setRefuseReason('');
  };

  const handleRefuse = async (id: string) => {
    setRefusing(true);
    setError('');
    try {
      await applicatorService.refuseRequest(id, refuseReason);
      setRefuseOpenId(null);
      setRefuseReason('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível recusar');
      await load();
    } finally {
      setRefusing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Pedidos</h1>
          <p className="mt-1 text-sm text-slate-500 max-w-lg">
            Clientes da sua cidade que pediram orçamento. O primeiro que aceitar fica com o
            serviço.
          </p>
          {data?.city && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <MapPin size={13} />
              {data.city}/{data.stateCode}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              void load();
            }}
            aria-label="Atualizar"
            className="p-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : undefined} />
          </button>
          <AvailabilityToggle
            available={available}
            loading={togglingAvailability}
            onToggle={() => void toggleAvailability()}
          />
        </div>
      </header>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {data && !data.eligible && <IneligibleNotice reason={data.reason} />}

      {data?.eligible && (
        <section className="space-y-3">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Abertos agora ({data.items.length})
          </h2>
          {data.items.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-12 text-center">
              <p className="text-sm text-slate-500">
                Nenhum pedido aberto em {data.city} no momento.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.items.map((request) => (
                <li
                  key={request.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">{request.scopeLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {request.clientName} · {request.materialType} · {request.estimatedM2} m²
                        · cerca de {request.estimatedHours} h
                      </p>
                      <ClientSuppliedBadge request={request} />
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-mono uppercase text-amber-400">
                      <Clock size={12} />
                      {hoursLeft(request.expiresAt)}
                    </span>
                  </div>

                  {request.notes && (
                    <p className="text-xs text-slate-400 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5">
                      {request.notes}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
                        Faixa mostrada ao cliente
                      </p>
                      <p className="text-sm font-bold text-white">
                        {formatCurrency(request.priceMin)}
                        <span className="mx-1.5 text-slate-600 font-normal">a</span>
                        {formatCurrency(request.priceMax)}
                      </p>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openRefuse(request.id)}
                        disabled={accepting !== null || refuseOpenId === request.id}
                        className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-slate-800 text-sm text-slate-400 hover:text-red-300 hover:border-red-500/30 disabled:opacity-50 transition-colors"
                      >
                        <X size={16} />
                        Recusar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAccept(request.id)}
                        disabled={accepting !== null}
                        className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
                      >
                        {accepting === request.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        Aceitar pedido
                      </button>
                    </div>
                  </div>

                  {refuseOpenId === request.id && (
                    <RefusePanel
                      message="Este pedido some do seu mural e continua disponível para os outros aplicadores da região."
                      reason={refuseReason}
                      onReasonChange={setRefuseReason}
                      loading={refusing}
                      onCancel={closeRefuse}
                      onConfirm={() => void handleRefuse(request.id)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {accepted.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Você aceitou ({accepted.length})
          </h2>
          <ul className="space-y-3">
            {accepted.map((request) => (
              <li
                key={request.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">{request.scopeLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {request.client?.name}
                      {request.client?.neighborhood ? ` · ${request.client.neighborhood}` : ''}
                      {request.acceptedAt
                        ? ` · aceito em ${new Date(request.acceptedAt).toLocaleDateString('pt-BR')}`
                        : ''}
                    </p>
                    <ClientSuppliedBadge request={request} />
                    {request.client?.phone && (
                      <a
                        href={`tel:${request.client.phone}`}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        <Phone size={13} />
                        {request.client.phone}
                      </a>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] font-mono font-bold uppercase px-2 py-1 rounded-lg border text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                    Aceito
                  </span>
                </div>

                {request.proposal && <ProposalSummary proposal={request.proposal} />}

                {request.status === 'Aceito' &&
                  request.proposal?.status !== 'Aceita' &&
                  (!request.budgetStatus || request.budgetStatus === PROPOSAL_BUDGET_STATUS) &&
                  (refuseOpenId === request.id ? (
                    <RefusePanel
                      message="O pedido volta para os outros aplicadores da região e o orçamento gerado para você fica como cancelado. Você não verá mais este pedido."
                      reason={refuseReason}
                      onReasonChange={setRefuseReason}
                      loading={refusing}
                      onCancel={closeRefuse}
                      onConfirm={() => void handleRefuse(request.id)}
                    />
                  ) : proposalOpenId === request.id ? (
                    <ProposalPanel
                      request={request}
                      onCancel={() => setProposalOpenId(null)}
                      onSent={async () => {
                        setProposalOpenId(null);
                        await load();
                      }}
                    />
                  ) : (
                    <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openRefuse(request.id)}
                        className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-slate-800 text-xs text-slate-400 hover:text-red-300 hover:border-red-500/30"
                      >
                        <X size={13} />
                        Recusar orçamento
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          closeRefuse();
                          setProposalOpenId(request.id);
                        }}
                        className="flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold"
                      >
                        <FileText size={13} />
                        {request.proposal ? 'Editar proposta' : 'Montar proposta'}
                      </button>
                    </div>
                  ))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ClientSuppliedBadge({ request }: { request: ServiceRequest }) {
  if (request.supplyMode !== 'mao_de_obra') return null;
  return (
    <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
      <Wrench size={12} />
      Só a aplicação · cliente fornece
      {request.clientMaterial &&
        `: ${request.clientMaterial.product} · ${request.clientMaterial.color}`}
    </p>
  );
}

const PROPOSAL_LABEL: Record<ProposalStatus, { text: string; className: string }> = {
  Enviada: { text: 'Aguardando o cliente', className: 'text-amber-400' },
  Aceita: { text: 'Cliente aceitou', className: 'text-emerald-400' },
  Recusada: { text: 'Cliente recusou', className: 'text-red-400' },
};

function ProposalSummary({ proposal }: { proposal: ServiceRequestProposal }) {
  const label = PROPOSAL_LABEL[proposal.status];
  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 space-y-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
          Sua proposta
        </p>
        <span className={cn('text-[10px] font-mono font-bold uppercase', label.className)}>
          {label.text}
        </span>
      </div>
      <p className="text-sm text-white">
        {proposal.product} · {proposal.color}
      </p>
      <p className="text-sm font-bold text-white">{formatCurrency(proposal.price)}</p>
      {proposal.status === 'Recusada' && proposal.clientReason && (
        <p className="text-xs text-red-300/80">Motivo do cliente: {proposal.clientReason}</p>
      )}
    </div>
  );
}

function RefusePanel({
  message,
  reason,
  onReasonChange,
  loading,
  onCancel,
  onConfirm,
}: {
  message: string;
  reason: string;
  onReasonChange: (value: string) => void;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
      <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
      <textarea
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Motivo (opcional)"
        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-slate-600"
      />
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="h-10 px-4 rounded-xl border border-slate-800 text-sm text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-50"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
          Confirmar recusa
        </button>
      </div>
    </div>
  );
}

export function AvailabilityToggle({
  available,
  loading,
  onToggle,
  className,
}: {
  available: boolean | null;
  loading: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const isOn = available === true;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={loading || available === null}
      aria-pressed={isOn}
      className={cn(
        'flex items-center gap-2 h-11 px-4 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50',
        isOn
          ? 'bg-emerald-600/10 border-emerald-600/30 text-emerald-300'
          : 'border-slate-800 text-slate-400 hover:border-slate-700',
        className,
      )}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            isOn ? 'bg-emerald-400 shadow-sm shadow-emerald-400/60' : 'bg-slate-600',
          )}
        />
      )}
      {isOn ? 'Online' : 'Offline'}
    </button>
  );
}

function IneligibleNotice({
  reason,
}: {
  reason: 'sem-perfil' | 'sem-regiao' | 'nao-verificado' | 'offline';
}) {
  const content = {
    'sem-perfil': {
      icon: <AlertCircle size={20} />,
      title: 'Perfil incompleto',
      body: 'Complete seu perfil de aplicador para receber pedidos.',
    },
    'sem-regiao': {
      icon: <MapPin size={20} />,
      title: 'Cidade não informada',
      body: 'Preencha cidade e UF no seu perfil — é por elas que os pedidos chegam até você.',
    },
    'nao-verificado': {
      icon: <ShieldOff size={20} />,
      title: 'Conta ainda não verificada',
      body: 'Só aplicadores verificados pela administração recebem pedidos. Fale com a administração da rede para liberar sua conta.',
    },
    offline: {
      icon: <AlertCircle size={20} />,
      title: 'Você está offline',
      body: 'Enquanto estiver offline, pedidos novos não aparecem aqui. Use o botão acima para voltar ao rodízio.',
    },
  }[reason];

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 flex items-start gap-4">
      <span className="shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400">
        {content.icon}
      </span>
      <div>
        <h2 className="text-sm font-bold text-white">{content.title}</h2>
        <p className="mt-1 text-sm text-slate-400 max-w-lg">{content.body}</p>
      </div>
    </div>
  );
}
