import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, Loader2, Phone, Plus, X } from 'lucide-react';
import { ServiceRequest, ServiceRequestStatus } from '../../types';
import { clientService } from '../../services/clientService';
import { ROUTES } from '../../routes/paths';
import { formatCurrency, cn } from '../../lib/utils';

const STATUS_STYLE: Record<ServiceRequestStatus, string> = {
  'Aguardando aceite': 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  Aceito: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  Expirado: 'text-slate-500 border-slate-700 bg-slate-800/50',
  Cancelado: 'text-red-400 border-red-500/30 bg-red-500/10',
};

function hoursLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expirando';
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h restantes`;
  return `${Math.max(1, Math.round(ms / 60_000))} min restantes`;
}

export default function ClientOrdersPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRequests(await clientService.getRequests());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar seus pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      await clientService.cancelRequest(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao cancelar');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
            Área do Cliente
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Meus pedidos</h1>
          <p className="mt-2 text-sm text-slate-500">
            Acompanhe o status de cada solicitação e o aplicador responsável.
          </p>
        </div>
        <Link
          to={ROUTES.client.newRequest}
          className="shrink-0 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
        >
          <Plus size={16} />
          Pedir orçamento
        </Link>
      </header>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-14 text-center">
          <span className="mx-auto grid place-items-center w-12 h-12 rounded-xl bg-slate-800 text-slate-500">
            <ClipboardList size={22} />
          </span>
          <h2 className="mt-4 text-base font-bold text-white">Nenhum pedido ainda</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            Peça um orçamento e aplicadores verificados da sua cidade são avisados na hora.
          </p>
          <Link
            to={ROUTES.client.newRequest}
            className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
          >
            <Plus size={16} />
            Pedir orçamento
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li
              key={request.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{request.scopeLabel}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {request.materialType} · {request.estimatedM2} m² ·{' '}
                    {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-[10px] font-mono font-bold uppercase px-2 py-1 rounded-lg border',
                    STATUS_STYLE[request.status],
                  )}
                >
                  {request.status}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-white tracking-tight">
                  {formatCurrency(request.priceMin)}
                </span>
                <span className="text-slate-600 text-sm">a</span>
                <span className="text-lg font-bold text-white tracking-tight">
                  {formatCurrency(request.priceMax)}
                </span>
                <span className="text-[11px] text-slate-600">faixa estimada</span>
              </div>

              {request.status === 'Aguardando aceite' && (
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800">
                  <p className="flex items-center gap-1.5 text-xs text-amber-400/80 pt-3">
                    <Clock size={13} />
                    {hoursLeft(request.expiresAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleCancel(request.id)}
                    disabled={cancelling === request.id}
                    className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-400 disabled:opacity-50"
                  >
                    {cancelling === request.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <X size={13} />
                    )}
                    Cancelar
                  </button>
                </div>
              )}

              {request.status === 'Aceito' && request.applicator && (
                <div className="pt-3 border-t border-slate-800">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
                    Aplicador responsável
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-white">
                    {request.applicator.businessName || request.applicator.name}
                  </p>
                  {request.applicator.phone && (
                    <a
                      href={`tel:${request.applicator.phone}`}
                      className="mt-1 inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      <Phone size={13} />
                      {request.applicator.phone}
                    </a>
                  )}
                </div>
              )}

              {request.status === 'Expirado' && (
                <p className="pt-3 border-t border-slate-800 text-xs text-slate-500">
                  Nenhum aplicador aceitou no prazo.{' '}
                  <Link
                    to={ROUTES.client.newRequest}
                    className="text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Reenviar pedido
                  </Link>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
