import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Car, Home } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { databaseService } from '../../services/databaseService';
import { AdminBudgetListItem, Budget, Material } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import BudgetDetailDrawer from '../../components/BudgetDetailDrawer';

export default function AdminBudgetsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<AdminBudgetListItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const page = Number(searchParams.get('page') || '1');
  const userId = searchParams.get('userId') || '';
  const status = searchParams.get('status') || '';
  const type = searchParams.get('type') || '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [budgetsRes, mats] = await Promise.all([
        adminService.getBudgets({
          page,
          limit: 30,
          userId: userId || undefined,
          status: status || undefined,
          type: type || undefined,
        }),
        databaseService.getMaterials(),
      ]);
      setItems(budgetsRes.items);
      setTotalPages(budgetsRes.totalPages);
      setMaterials(mats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [page, userId, status, type]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (!searchInput.trim()) return items;
    const q = searchInput.toLowerCase();
    return items.filter(
      (b) =>
        b.customerName.toLowerCase().includes(q) ||
        b.businessName.toLowerCase().includes(q) ||
        (b.vehicleModel || b.applianceModel || '').toLowerCase().includes(q),
    );
  }, [items, searchInput]);

  const selectedIndex = selectedId
    ? filteredItems.findIndex((b) => b.id === selectedId)
    : -1;
  const selectedBudget: Budget | null =
    selectedIndex >= 0 ? filteredItems[selectedIndex] : null;

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  };

  const setPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filtrar cliente ou oficina..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />
        </div>
        <select
          value={status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm"
        >
          <option value="">Todos os status</option>
          <option value="Pendente">Pendente</option>
          <option value="Aprovado">Aprovado</option>
          <option value="Finalizado">Finalizado</option>
          <option value="Cancelado">Cancelado</option>
        </select>
        <select
          value={type}
          onChange={(e) => updateFilter('type', e.target.value)}
          className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm"
        >
          <option value="">Todos os tipos</option>
          <option value="Automotivo">Automotivo</option>
          <option value="Decorativo">Decorativo</option>
        </select>
        {userId && (
          <button
            type="button"
            onClick={() => updateFilter('userId', '')}
            className="text-xs text-amber-400 hover:text-amber-300 px-3 py-2 border border-amber-500/30 rounded-xl"
          >
            Limpar filtro de oficina
          </button>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Carregando orçamentos...</p>
      ) : (
        <div className="grid gap-3">
          {filteredItems.map((b) => (
            <button
              key={`${b.userId}-${b.id}`}
              type="button"
              onClick={() => setSelectedId(b.id)}
              className={cn(
                'w-full text-left p-4 rounded-xl border transition-all',
                selectedId === b.id
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700',
              )}
            >
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-amber-400/80 uppercase mb-0.5">
                    {b.businessName}
                  </p>
                  <p className="font-bold text-white truncate">{b.customerName}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {b.vehicleModel || b.applianceModel || 'Projeto'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-white">{formatCurrency(b.totalPrice)}</p>
                  <span
                    className={cn(
                      'text-[10px] font-mono uppercase',
                      b.status === 'Finalizado'
                        ? 'text-emerald-400'
                        : b.status === 'Pendente'
                          ? 'text-amber-400'
                          : 'text-slate-400',
                    )}
                  >
                    {b.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 text-slate-500">
                {b.type === 'Automotivo' ? <Car size={14} /> : <Home size={14} />}
                <span className="text-[10px] font-mono">{b.type}</span>
              </div>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">Nenhum orçamento encontrado</p>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-800 disabled:opacity-30"
          >
            Anterior
          </button>
          <span className="text-xs font-mono text-slate-500 self-center">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-800 disabled:opacity-30"
          >
            Próxima
          </button>
        </div>
      )}

      <BudgetDetailDrawer
        budget={selectedBudget}
        materials={materials}
        open={Boolean(selectedBudget)}
        onClose={() => setSelectedId(null)}
        onPrevious={() => {
          if (selectedIndex > 0) setSelectedId(filteredItems[selectedIndex - 1].id);
        }}
        onNext={() => {
          if (selectedIndex >= 0 && selectedIndex < filteredItems.length - 1) {
            setSelectedId(filteredItems[selectedIndex + 1].id);
          }
        }}
        hasPrevious={selectedIndex > 0}
        hasNext={selectedIndex >= 0 && selectedIndex < filteredItems.length - 1}
        currentIndex={selectedIndex}
        totalCount={filteredItems.length}
        onStatusChange={() => {}}
        onDelete={() => {}}
        onGeneratePDF={async () => {}}
        readOnly
        officeLabel={
          selectedBudget && 'businessName' in selectedBudget
            ? (selectedBudget as AdminBudgetListItem).businessName
            : undefined
        }
      />
    </div>
  );
}
