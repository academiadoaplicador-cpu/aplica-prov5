import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { adminClientService } from '../../services/clientService';
import { AdminClientListItem } from '../../types';
import { formatCepInput } from '../../types/address';
import { cn } from '../../lib/utils';
import { formatStoredPhone, parseStoredPhone, formatNationalPhone } from '../../utils/phone';
import { COUNTRY_PHONE_LIST } from '../../constants/countries';

function displayPhone(stored: string): string {
  if (!stored) return '—';
  const parsed = parseStoredPhone(stored, '+55');
  const country =
    COUNTRY_PHONE_LIST.find((c) => c.dial === parsed.countryCode) || COUNTRY_PHONE_LIST[0];
  const national = formatNationalPhone(parsed.national, country);
  return national ? `${country.dial} ${national}` : formatStoredPhone(country.dial, parsed.national);
}

export default function AdminClientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<AdminClientListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');

  const page = Number(searchParams.get('page') || '1');
  const q = searchParams.get('q') || '';
  const statusParam = searchParams.get('status') || 'active';
  const statusFilter =
    statusParam === 'inactive' || statusParam === 'all' ? statusParam : 'active';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminClientService.list({
        page,
        limit: 20,
        q: q || undefined,
        status: statusFilter,
      });
      setItems(res.items);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [page, q, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const applySearch = () => {
    const next = new URLSearchParams(searchParams);
    if (searchInput.trim()) next.set('q', searchInput.trim());
    else next.delete('q');
    next.set('page', '1');
    setSearchParams(next);
  };

  const setPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  };

  const setStatusFilter = (status: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('status', status);
    next.set('page', '1');
    setSearchParams(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Contas de cliente final do marketplace — separadas da rede de aplicadores.
      </p>

      <div className="flex gap-2 flex-wrap">
        {(
          [
            ['active', 'Ativos'],
            ['inactive', 'Desativados'],
            ['all', 'Todos'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              statusFilter === value
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'text-slate-400 border-slate-800 hover:border-slate-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="Buscar nome, e-mail ou cidade..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />
        </div>
        <button
          type="button"
          onClick={applySearch}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
        >
          Buscar
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          {error}
        </p>
      )}

      <p className="text-xs text-slate-500 font-mono">
        {total} cliente{total !== 1 ? 's' : ''}
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800">
              <th className="px-4 py-3 text-[10px] font-mono uppercase text-slate-500">Cliente</th>
              <th className="px-4 py-3 text-[10px] font-mono uppercase text-slate-500">Contato</th>
              <th className="px-4 py-3 text-[10px] font-mono uppercase text-slate-500">Local</th>
              <th className="px-4 py-3 text-[10px] font-mono uppercase text-slate-500">Cadastro</th>
              <th className="px-4 py-3 text-[10px] font-mono uppercase text-slate-500">
                Último acesso
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="border-b border-slate-800/80">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white flex items-center gap-2">
                      {c.fullName}
                      {!c.isActive && (
                        <span className="text-[9px] font-mono uppercase text-red-400 border border-red-500/30 px-1.5 rounded">
                          Off
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 truncate max-w-[220px]">{c.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                    {displayPhone(c.phone)}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {c.city && c.stateCode ? `${c.city}/${c.stateCode}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                    {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                    {c.lastLoginAt ? new Date(c.lastLoginAt).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className={cn(
              'p-2 rounded-lg border border-slate-800 text-slate-400',
              page <= 1 ? 'opacity-30' : 'hover:text-white hover:bg-slate-800',
            )}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs font-mono text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className={cn(
              'p-2 rounded-lg border border-slate-800 text-slate-400',
              page >= totalPages ? 'opacity-30' : 'hover:text-white hover:bg-slate-800',
            )}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
