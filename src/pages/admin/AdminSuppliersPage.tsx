import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Truck,
  UserPlus,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { supplierService } from '../../services/supplierService';
import { SupplierListItem } from '../../types';
import { ROUTES } from '../../routes/paths';
import { formatCnpj } from '../../utils/cnpj';
import { cn } from '../../lib/utils';
import { useImportPreviewFlow } from '../../hooks/useImportPreviewFlow';
import { parseSuppliersSpreadsheet, type SupplierImportPreview } from '../../utils/supplierImport';
import { downloadSuppliersTemplate } from '../../utils/spreadsheetTemplates';
import SupplierImportPreviewModal from '../../components/admin/SupplierImportPreviewModal';

export default function AdminSuppliersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<SupplierListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [importPreview, setImportPreview] = useState<SupplierImportPreview | null>(null);

  const importFlow = useImportPreviewFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const page = Number(searchParams.get('page') || '1');
  const q = searchParams.get('q') || '';
  const statusParam = searchParams.get('status') || 'active';
  const statusFilter =
    statusParam === 'inactive' || statusParam === 'all' ? statusParam : 'active';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await supplierService.getSuppliers({
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

  const handleFileSelect = (file: File) => {
    void importFlow.handleFileSelect(
      file,
      parseSuppliersSpreadsheet,
      (result) => setImportPreview(result),
      (message) => setError(message),
    );
  };

  const handleConfirmImport = () => {
    if (!importPreview || importPreview.suppliers.length === 0) return;
    void importFlow.handleConfirmImport(
      async () => {
        await supplierService.importSuppliers(importPreview.suppliers);
        await load();
      },
      {
        errorFallback: 'Erro ao importar fornecedores.',
        onSuccess: () => setImportPreview(null),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link
            to={ROUTES.admin.supplierNew}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
          >
            <UserPlus size={18} />
            Cadastrar fornecedor
          </Link>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition-colors"
          >
            <FileSpreadsheet size={18} />
            Importar
          </button>
          <button
            type="button"
            onClick={downloadSuppliersTemplate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-sm border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <Download size={18} />
            Modelo
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {(
          [
            ['active', 'Ativos'],
            ['inactive', 'Inativos'],
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
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="Buscar nome, WhatsApp ou e-mail..."
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
        {total} fornecedor{total !== 1 ? 'es' : ''}
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800">
              <th className="px-4 py-3 text-[10px] font-mono uppercase text-slate-500">Razão social</th>
              <th className="px-4 py-3 text-[10px] font-mono uppercase text-slate-500">CNPJ</th>
              <th className="px-4 py-3 text-[10px] font-mono uppercase text-slate-500">Contatos</th>
              <th className="px-4 py-3 text-[10px] font-mono uppercase text-slate-500">Vínculos</th>
              <th className="px-4 py-3 text-[10px] font-mono uppercase text-slate-500">Status</th>
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
                  Nenhum fornecedor encontrado
                </td>
              </tr>
            ) : (
              items.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(ROUTES.admin.supplier(s.id))}
                  className="border-b border-slate-800/80 hover:bg-slate-900/60 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white flex items-center gap-2">
                      <Truck size={14} className="text-amber-400 shrink-0" />
                      {s.legalName}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">{formatCnpj(s.cnpj)}</td>
                  <td className="px-4 py-3 text-white font-mono text-xs">{s.contactCount}</td>
                  <td className="px-4 py-3 text-white font-mono text-xs">{s.productLinkCount}</td>
                  <td className="px-4 py-3">
                    {s.isActive ? (
                      <span className="text-[10px] font-mono uppercase text-emerald-400">Ativo</span>
                    ) : (
                      <span className="text-[10px] font-mono uppercase text-red-400">Inativo</span>
                    )}
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

      <SupplierImportPreviewModal
        open={importFlow.isPreviewOpen}
        fileName={importFlow.importFileName}
        preview={importPreview}
        loading={importFlow.isConfirmingImport}
        progress={importFlow.importProgress}
        progressLabel={importFlow.importProgressLabel}
        error={importFlow.importModalError}
        onConfirm={() => void handleConfirmImport()}
        onClose={importFlow.closePreview}
      />
    </div>
  );
}
