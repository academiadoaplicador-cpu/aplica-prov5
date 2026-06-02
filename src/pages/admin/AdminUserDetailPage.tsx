import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Star,
  ShieldCheck,
  FileText,
  Save,
  Settings,
  Trash2,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import { getPasswordValidationMessage } from '../../lib/password';
import { adminService } from '../../services/adminService';
import { AdminUserDetail } from '../../types';
import { ROUTES } from '../../routes/paths';
import { formatCurrency, cn } from '../../lib/utils';

type Tab = 'conta' | 'perfil' | 'financeiro' | 'orcamentos';

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [tab, setTab] = useState<Tab>('conta');
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [verified, setVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [editBusinessName, setEditBusinessName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const loadUser = () => {
    if (!userId) return;
    adminService
      .getUser(userId)
      .then((d) => {
        setData(d);
        setEditBusinessName(d.user.businessName);
        setEditEmail(d.user.email);
        if (d.profile) {
          setRating(d.profile.rating);
          setVerified(d.profile.verifiedDocuments);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro'));
  };

  useEffect(() => {
    loadUser();
  }, [userId]);

  const handleSaveAccount = async () => {
    if (!userId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload: { businessName?: string; email?: string; newPassword?: string } = {
        businessName: editBusinessName.trim(),
        email: editEmail.trim(),
      };
      if (newPassword) {
        const err = getPasswordValidationMessage(newPassword);
        if (err) {
          setSaveMsg(err);
          setSaving(false);
          return;
        }
        payload.newPassword = newPassword;
      }
      const updated = await adminService.updateUser(userId, payload);
      setData((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                businessName: updated.businessName,
                email: updated.email,
                isActive: updated.isActive,
                lastLoginAt: updated.lastLoginAt,
              },
            }
          : prev,
      );
      setNewPassword('');
      setSaveMsg('Conta atualizada');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!userId || !data) return;
    const next = !data.user.isActive;
    if (
      !next &&
      !confirm('Desativar esta conta? O aplicador não poderá fazer login até reativar.')
    ) {
      return;
    }
    setSaving(true);
    try {
      const updated = await adminService.setUserActive(userId, next);
      setData((prev) =>
        prev ? { ...prev, user: { ...prev.user, isActive: updated.isActive } } : prev,
      );
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userId || !data) return;
    if (deleteConfirm.trim() !== data.user.businessName) {
      setSaveMsg('Digite o nome exato da oficina para confirmar');
      return;
    }
    if (!confirm('Excluir permanentemente esta conta e todos os dados?')) return;
    setSaving(true);
    try {
      await adminService.deleteUser(userId, deleteConfirm.trim());
      navigate(ROUTES.admin.users, { replace: true });
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Erro ao excluir');
      setSaving(false);
    }
  };

  const handleSaveModeration = async () => {
    if (!userId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const profile = await adminService.patchProfileVerify(userId, {
        rating,
        verifiedDocuments: verified,
      });
      setData((prev) =>
        prev && prev.profile
          ? { ...prev, profile: { ...prev.profile, ...profile } }
          : prev,
      );
      setSaveMsg('Alterações salvas');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="h-40 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  const { user: rawUser, profile, financialSettings, budgetSummary, recentBudgets } = data;
  const user = { ...rawUser, isActive: rawUser.isActive !== false };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <BackLink />
        <div>
          <h3 className="text-xl font-bold text-white">{user.businessName}</h3>
          <p className="text-sm text-slate-500">{user.email}</p>
          <p className="text-[10px] font-mono text-slate-600 mt-1">
            Cadastro: {new Date(user.createdAt).toLocaleDateString('pt-BR')}
            {user.lastLoginAt &&
              ` · Último login: ${new Date(user.lastLoginAt).toLocaleString('pt-BR')}`}
          </p>
          <span
            className={cn(
              'inline-block mt-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border',
              user.isActive
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                : 'text-red-400 border-red-500/30 bg-red-500/10',
            )}
          >
            {user.isActive ? 'Ativa' : 'Desativada'}
          </span>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(
          [
            ['conta', 'Conta'],
            ['perfil', 'Perfil'],
            ['financeiro', 'Financeiro'],
            ['orcamentos', 'Orçamentos'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              tab === id
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:bg-slate-800 border border-transparent',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'conta' && (
        <div className="space-y-6">
          <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings size={18} className="text-amber-400" />
              Dados da conta
            </h4>
            <label className="block">
              <span className="text-[10px] font-mono uppercase text-slate-500">Oficina</span>
              <input
                value={editBusinessName}
                onChange={(e) => setEditBusinessName(e.target.value)}
                className="mt-1 w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-base sm:text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-mono uppercase text-slate-500">E-mail</span>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="mt-1 w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-base sm:text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-mono uppercase text-slate-500">
                Nova senha (opcional)
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Deixe em branco para manter"
                className="mt-1 w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-base sm:text-sm"
              />
            </label>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveAccount()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold"
              >
                <Save size={16} />
                Salvar alterações
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleToggleActive()}
                className={cn(
                  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors',
                  user.isActive
                    ? 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                    : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10',
                )}
              >
                {user.isActive ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                {user.isActive ? 'Desativar conta' : 'Reativar conta'}
              </button>
            </div>
          </section>

          <section className="bg-slate-900/40 border border-red-500/20 rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-bold text-red-400 flex items-center gap-2">
              <Trash2 size={18} />
              Zona de perigo
            </h4>
            <p className="text-xs text-slate-500">
              Exclui a conta, perfil, orçamentos e configurações. Digite{' '}
              <strong className="text-white">{user.businessName}</strong> para confirmar.
            </p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={user.businessName}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-red-500/30 text-white text-base sm:text-sm"
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleDelete()}
              className="px-4 py-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 text-sm font-semibold hover:bg-red-600/30 disabled:opacity-50"
            >
              Excluir conta permanentemente
            </button>
          </section>

          {saveMsg && (
            <p
              className={cn(
                'text-xs',
                saveMsg.includes('Erro') || saveMsg.includes('Digite')
                  ? 'text-red-400'
                  : 'text-emerald-400',
              )}
            >
              {saveMsg}
            </p>
          )}
        </div>
      )}

      {tab === 'perfil' && (
        <div className="space-y-6">
          {profile ? (
            <>
              <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-white">Dados do aplicador</h4>
                <p className="text-white">{profile.fullName}</p>
                <p className="text-xs text-slate-500">
                  {profile.experienceYears} ano(s) de experiência · Nota {profile.rating}
                </p>
                <div className="flex flex-wrap gap-2">
                  {profile.areasOfExpertise.map((a) => (
                    <span
                      key={a}
                      className="text-[10px] font-mono uppercase px-2 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-400"
                    >
                      {a}
                    </span>
                  ))}
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <Phone size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>{profile.phone || '—'}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <MapPin size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>{profile.address || '—'}</span>
                </div>
                {profile.documentsUrls.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono uppercase text-slate-500">
                      Documentos ({profile.documentsUrls.length})
                    </p>
                    <ul className="text-xs text-indigo-400 space-y-1">
                      {profile.documentsUrls.map((url, i) => (
                        <li key={i}>
                          <a href={url} target="_blank" rel="noreferrer" className="hover:underline">
                            Documento {i + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <section className="bg-slate-900/40 border border-amber-500/20 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <ShieldCheck size={18} />
                  Moderação
                </h4>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500/50"
                  />
                  <span className="text-sm text-white">Documentos verificados</span>
                </label>
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1 mb-2">
                    <Star size={12} /> Rating (1–5)
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full max-w-xs py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-base sm:text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveModeration()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold"
                >
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar moderação'}
                </button>
                {saveMsg && (
                  <p
                    className={cn(
                      'text-xs',
                      saveMsg.includes('Erro') ? 'text-red-400' : 'text-emerald-400',
                    )}
                  >
                    {saveMsg}
                  </p>
                )}
              </section>
            </>
          ) : (
            <p className="text-slate-500 text-sm">Perfil não preenchido.</p>
          )}
        </div>
      )}

      {tab === 'financeiro' && (
        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
          {financialSettings ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[10px] font-mono uppercase text-slate-500">Hora técnica</dt>
                <dd className="text-white font-mono">
                  {formatCurrency(financialSettings.hourlyRate)}/h
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-mono uppercase text-slate-500">Margem</dt>
                <dd className="text-white font-mono">
                  {financialSettings.profitMarginPercentage}%
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-mono uppercase text-slate-500">Impostos</dt>
                <dd className="text-white font-mono">{financialSettings.taxPercentage}%</dd>
              </div>
              <div>
                <dt className="text-[10px] font-mono uppercase text-slate-500">Custos fixos</dt>
                <dd className="text-white font-mono">
                  {formatCurrency(financialSettings.fixedCosts)}/mês
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-slate-500">Sem configuração financeira.</p>
          )}
        </section>
      )}

      {tab === 'orcamentos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatChip label="Total" value={String(budgetSummary.total)} />
            <StatChip label="Pendentes" value={String(budgetSummary.pending)} />
            <StatChip label="Finalizados" value={String(budgetSummary.finalized)} />
            <StatChip label="Ticket médio" value={formatCurrency(budgetSummary.avgTicket)} />
          </div>
          <Link
            to={`${ROUTES.admin.budgets}?userId=${user.id}`}
            className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300"
          >
            <FileText size={16} />
            Ver todos os orçamentos desta oficina
          </Link>
          <ul className="space-y-2">
            {recentBudgets.map((b) => (
              <li
                key={b.id}
                className="flex justify-between items-center p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-sm"
              >
                <div>
                  <p className="text-white font-medium">{b.customerName}</p>
                  <p className="text-xs text-slate-500">{b.status} · {b.type}</p>
                </div>
                <p className="font-mono text-white">{formatCurrency(b.totalPrice)}</p>
              </li>
            ))}
            {recentBudgets.length === 0 && (
              <p className="text-slate-500 text-sm">Nenhum orçamento.</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to={ROUTES.admin.users}
      className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
    >
      <ArrowLeft size={16} />
      Voltar à lista
    </Link>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
      <p className="text-[10px] font-mono uppercase text-slate-500">{label}</p>
      <p className="text-lg font-bold text-white font-mono">{value}</p>
    </div>
  );
}
