import { useEffect, useState } from 'react';
import { Check, ClipboardCheck, Copy, KeyRound, KeySquare, Trash2, UserPlus, X } from 'lucide-react';
import { Supplier, SupplierAccount, SupplierChangeRequest } from '../../types';
import { supplierService } from '../../services/supplierService';
import { formatCnpj } from '../../utils/cnpj';
import { ROUTES } from '../../routes/paths';
import { cn } from '../../lib/utils';
import { SupplierSectionIntro } from './supplierAdminUi';

const inputClass =
  'w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50';

/** Senha provisória que atende à política (letra, número e caractere especial). */
function generatePassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const special = '@#$%&*!';
  const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  const chars = [pick(special), pick(digits), pick(digits)];
  while (chars.length < 12) chars.push(pick(letters));
  return chars.sort(() => (crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? 1 : -1)).join('');
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const STATUS_LABEL: Record<SupplierChangeRequest['status'], string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Recusada',
  cancelled: 'Cancelada pelo fornecedor',
};

function linkLabel(l: { brand: string; line: string }) {
  return `${l.brand} · ${l.line}`;
}

/** Uma linha "campo | atual | pedido" para a análise do admin. */
function DiffRow({ label, current, requested }: { label: string; current: string; requested: string }) {
  return (
    <tr className="align-top">
      <td className="px-3 py-2.5 text-[10px] font-mono uppercase text-slate-500 whitespace-nowrap">{label}</td>
      <td className="px-3 py-2.5 text-sm text-slate-400 line-through decoration-slate-600">{current || '—'}</td>
      <td className="px-3 py-2.5 text-sm text-amber-200 font-medium">{requested || '—'}</td>
    </tr>
  );
}

function LinksDiff({ current, requested }: { current: Supplier['productLinks']; requested: { brand: string; line: string }[] }) {
  const key = (l: { brand: string; line: string }) => `${l.brand}::${l.line}`.toLowerCase();
  const currentKeys = new Set(current.map(key));
  const requestedKeys = new Set(requested.map(key));
  const added = requested.filter((l) => !currentKeys.has(key(l)));
  const removed = current.filter((l) => !requestedKeys.has(key(l)));
  const kept = requested.filter((l) => currentKeys.has(key(l)));
  return (
    <tr className="align-top">
      <td className="px-3 py-2.5 text-[10px] font-mono uppercase text-slate-500 whitespace-nowrap">Marcas / linhas</td>
      <td colSpan={2} className="px-3 py-2.5">
        <ul className="space-y-1 text-sm">
          {added.map((l) => (
            <li key={`+${key(l)}`} className="text-emerald-300">+ {linkLabel(l)}</li>
          ))}
          {removed.map((l) => (
            <li key={`-${key(l)}`} className="text-red-300 line-through">− {linkLabel(l)}{l.isPrimary ? ' (era principal)' : ''}</li>
          ))}
          {kept.map((l) => (
            <li key={`=${key(l)}`} className="text-slate-500">= {linkLabel(l)}</li>
          ))}
        </ul>
      </td>
    </tr>
  );
}

export default function SupplierAccessPanel({
  supplier,
  onApproved,
  onPendingChange,
}: {
  supplier: Supplier;
  /** Recarrega o cadastro na tela depois de aplicar uma solicitação. */
  onApproved: () => void;
  onPendingChange?: (hasPending: boolean) => void;
}) {
  const [account, setAccount] = useState<SupplierAccount | null | undefined>(undefined);
  const [requests, setRequests] = useState<SupplierChangeRequest[]>([]);
  const [email, setEmail] = useState(supplier.email ?? '');
  const [password, setPassword] = useState(generatePassword);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = () =>
    supplierService.getChangeRequests(supplier.id).then((list) => {
      setRequests(list);
      onPendingChange?.(list.some((r) => r.status === 'pending'));
    });

  useEffect(() => {
    supplierService
      .getSupplierAccount(supplier.id)
      .then((r) => setAccount(r.account))
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar o acesso'));
    void loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier.id]);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro na operação');
    } finally {
      setBusy(false);
    }
  };

  const loginUrl = `${window.location.origin}${ROUTES.login}`;
  const credentialsText = credentials
    ? `Acesso de fornecedor — Aplica PRO\nEndereço: ${loginUrl}\nE-mail: ${credentials.email}\nSenha provisória: ${credentials.password}`
    : '';

  const copyCredentials = async () => {
    try {
      await navigator.clipboard.writeText(credentialsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* sem permissão de área de transferência: o texto continua visível para copiar à mão */
    }
  };

  const pending = requests.find((r) => r.status === 'pending');
  const history = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* Solicitações do fornecedor */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 sm:p-6 lg:p-7 space-y-4">
        <SupplierSectionIntro
          icon={ClipboardCheck}
          title="Alterações pedidas pelo fornecedor"
          description="Razão social, CNPJ e marcas/linhas só mudam no cadastro depois de aprovadas aqui."
        />

        {!pending ? (
          <p className="text-sm text-slate-500">Nenhuma alteração aguardando aprovação.</p>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
            <p className="px-4 py-3 text-xs text-amber-200 border-b border-amber-500/20">
              Pedida em {formatDateTime(pending.createdAt)}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left">
                    <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500">Campo</th>
                    <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500">Atual</th>
                    <th className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500">Pedido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {pending.changes.legalName !== undefined && (
                    <DiffRow label="Razão social" current={supplier.legalName} requested={pending.changes.legalName} />
                  )}
                  {pending.changes.cnpj !== undefined && (
                    <DiffRow
                      label="CNPJ"
                      current={formatCnpj(supplier.cnpj)}
                      requested={formatCnpj(pending.changes.cnpj)}
                    />
                  )}
                  {pending.changes.productLinks !== undefined && (
                    <LinksDiff current={supplier.productLinks} requested={pending.changes.productLinks} />
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-amber-500/20 space-y-3">
              {rejecting && (
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Motivo da recusa (o fornecedor vê esta mensagem)"
                  className={inputClass}
                />
              )}
              <div className="flex flex-wrap justify-end gap-2">
                {rejecting ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setRejecting(false)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await supplierService.rejectChangeRequest(supplier.id, pending.id, rejectNote.trim());
                          setRejecting(false);
                          setRejectNote('');
                          await loadRequests();
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white"
                    >
                      <X size={14} />
                      Confirmar recusa
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setRejecting(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <X size={14} />
                      Recusar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await supplierService.approveChangeRequest(supplier.id, pending.id);
                          await loadRequests();
                          onApproved();
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
                    >
                      <Check size={14} />
                      Aprovar e aplicar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <ul className="space-y-1.5">
            {history.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-2 text-xs text-slate-500">
                <span
                  className={cn(
                    'font-mono uppercase text-[10px]',
                    r.status === 'approved' ? 'text-emerald-400' : r.status === 'rejected' ? 'text-red-400' : 'text-slate-500',
                  )}
                >
                  {STATUS_LABEL[r.status]}
                </span>
                <span>{formatDateTime(r.reviewedAt ?? r.createdAt)}</span>
                <span className="text-slate-600">
                  {[
                    r.changes.legalName !== undefined && 'razão social',
                    r.changes.cnpj !== undefined && 'CNPJ',
                    r.changes.productLinks !== undefined && 'marcas/linhas',
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </span>
                {r.adminNote && <span className="text-slate-400">— {r.adminNote}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Login do fornecedor */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 sm:p-6 lg:p-7 space-y-4">
        <SupplierSectionIntro
          icon={KeySquare}
          title="Acesso do fornecedor"
          description="Login para o fornecedor manter os próprios dados. Ele só vê e altera este cadastro."
          accent="emerald"
        />

        {credentials && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
            <p className="text-sm font-semibold text-emerald-200">
              Envie estes dados ao fornecedor. A senha não aparece de novo.
            </p>
            <pre className="whitespace-pre-wrap break-all text-xs text-emerald-100/90 bg-slate-950/60 rounded-lg p-3 font-mono">
              {credentialsText}
            </pre>
            <button
              type="button"
              onClick={() => void copyCredentials()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        )}

        {account === undefined ? (
          <div className="h-20 rounded-xl bg-slate-950/50 animate-pulse" />
        ) : account === null ? (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <label className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">E-mail de login</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Senha provisória</span>
              <div className="flex gap-2">
                <input value={password} onChange={(e) => setPassword(e.target.value)} className={cn(inputClass, 'font-mono')} />
                <button
                  type="button"
                  title="Gerar outra senha"
                  onClick={() => setPassword(generatePassword())}
                  className="shrink-0 px-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <KeyRound size={16} />
                </button>
              </div>
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await supplierService.createSupplierAccount(supplier.id, {
                    email: email.trim(),
                    password,
                  });
                  setAccount(result.account);
                  setCredentials({ email: result.account.email, password });
                  setPassword(generatePassword());
                })
              }
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold"
            >
              <UserPlus size={16} />
              Criar acesso
            </button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 text-sm">
              <div>
                <dt className="text-[10px] font-mono uppercase text-slate-500">E-mail de login</dt>
                <dd className="text-white break-all">{account.email}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-mono uppercase text-slate-500">Criado em</dt>
                <dd className="text-slate-300">{formatDateTime(account.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-mono uppercase text-slate-500">Último acesso</dt>
                <dd className="text-slate-300">{account.lastLoginAt ? formatDateTime(account.lastLoginAt) : 'nunca entrou'}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const next = generatePassword();
                    await supplierService.resetSupplierPassword(supplier.id, next);
                    setCredentials({ email: account.email, password: next });
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                <KeyRound size={14} />
                Gerar nova senha
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm(`Remover o acesso de ${account.email}? O cadastro do fornecedor continua.`)) return;
                  void run(async () => {
                    await supplierService.removeSupplierAccount(supplier.id);
                    setAccount(null);
                    setCredentials(null);
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              >
                <Trash2 size={14} />
                Remover acesso
              </button>
            </div>
          </div>
        )}
        <p className="text-[11px] text-slate-500">
          O fornecedor entra em <span className="font-mono text-slate-400">{loginUrl}</span>, o mesmo “Entrar” das
          oficinas, e cai direto na área dele.
        </p>
      </div>
    </div>
  );
}
