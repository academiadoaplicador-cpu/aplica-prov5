import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Megaphone, Plus } from 'lucide-react';
import { promotionService } from '../../services/promotionService';
import { Promotion } from '../../types';
import { ROUTES } from '../../routes/paths';
import { cn } from '../../lib/utils';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function periodLabel(promotion: Promotion): string {
  if (!promotion.startsAt && !promotion.endsAt) return 'Sempre';
  if (promotion.startsAt && promotion.endsAt) {
    return `${formatDate(promotion.startsAt)} – ${formatDate(promotion.endsAt)}`;
  }
  if (promotion.startsAt) return `A partir de ${formatDate(promotion.startsAt)}`;
  return `Até ${formatDate(promotion.endsAt)}`;
}

export default function AdminPromotionsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await promotionService.getPromotions();
      setItems(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggleActive = async (promotion: Promotion) => {
    setTogglingId(promotion.id);
    try {
      const updated = await promotionService.setPromotionActive(promotion.id, !promotion.isActive);
      setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao alterar status');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link
          to={ROUTES.admin.promotionNew}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors w-fit"
        >
          <Plus size={18} />
          Nova promoção
        </Link>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          {error}
        </p>
      )}

      <p className="text-xs text-slate-500 font-mono">
        {items.length} promoç{items.length !== 1 ? 'ões' : 'ão'}
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800">
              <th className="px-4 py-3 text-[10px] font-mono uppercase text-slate-500">Banner</th>
              <th className="px-4 py-3 text-[10px] font-mono uppercase text-slate-500">Título</th>
              <th className="px-4 py-3 text-[10px] font-mono uppercase text-slate-500">Período</th>
              <th className="px-4 py-3 text-[10px] font-mono uppercase text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Megaphone size={22} className="text-slate-700" />
                    Nenhuma promoção cadastrada
                  </div>
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(ROUTES.admin.promotion(p.id))}
                  className="border-b border-slate-800/80 hover:bg-slate-900/60 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <img
                      src={p.bannerDesktopUrl}
                      alt={p.title}
                      className="w-16 h-9 object-cover rounded-md border border-slate-800"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{p.title}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{periodLabel(p)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={togglingId === p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleToggleActive(p);
                      }}
                      className={cn(
                        'text-[10px] font-mono uppercase px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50',
                        p.isActive
                          ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'
                          : 'text-slate-500 border-slate-700 bg-slate-900/50 hover:bg-slate-800',
                      )}
                    >
                      {p.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
