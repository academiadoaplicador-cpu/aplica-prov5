import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  Link2,
  Lock,
  MessageCircle,
  Save,
  Send,
  Truck,
  Undo2,
  Users,
  XCircle,
} from 'lucide-react';
import {
  Material,
  SupplierChangeRequest,
  SupplierOwnProfile,
  SupplierProductLink,
} from '../../types';
import { supplierPortalService } from '../../services/supplierPortalService';
import SupplierContactsEditor, {
  contactsToDrafts,
  draftsToContacts,
  validateContactDrafts,
  type SupplierContactDraft,
} from '../../components/admin/SupplierContactsEditor';
import SupplierProductLinksEditor from '../../components/admin/SupplierProductLinksEditor';
import { registrationStatusClass, SupplierSectionIntro } from '../../components/admin/supplierAdminUi';
import { digitsOnlyCnpj, formatCnpj, isValidCnpj } from '../../utils/cnpj';
import { cn } from '../../lib/utils';

const inputClass =
  'w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 disabled:opacity-60';

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function linkKeys(links: { brand: string; line: string }[]): string {
  return links
    .map((l) => `${l.brand.trim().toLowerCase()}::${l.line.trim().toLowerCase()}`)
    .sort()
    .join('|');
}

/** Resumo legível do que foi pedido numa solicitação. */
function describeChanges(request: SupplierChangeRequest): string[] {
  const lines: string[] = [];
  const { changes } = request;
  if (changes.legalName) lines.push(`Razão social: ${changes.legalName}`);
  if (changes.cnpj) lines.push(`CNPJ: ${formatCnpj(changes.cnpj)}`);
  if (changes.productLinks) {
    lines.push(
      `Marcas/linhas: ${
        changes.productLinks.length === 0
          ? 'nenhuma'
          : changes.productLinks.map((l) => `${l.brand} · ${l.line}`).join('; ')
      }`,
    );
  }
  return lines;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

export default function SupplierProfilePage() {
  const [profile, setProfile] = useState<SupplierOwnProfile | null>(null);
  const [catalog, setCatalog] = useState<Material[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Vale na hora.
  const [tradeName, setTradeName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [contactDrafts, setContactDrafts] = useState<SupplierContactDraft[]>([]);
  const [savingDirect, setSavingDirect] = useState(false);
  const [directMsg, setDirectMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  // Precisa de aprovação.
  const [legalName, setLegalName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [productLinks, setProductLinks] = useState<SupplierProductLink[]>([]);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestMsg, setRequestMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const applyProfile = (next: SupplierOwnProfile) => {
    setProfile(next);
    const { supplier, pendingRequest } = next;
    setTradeName(supplier.tradeName ?? '');
    setEmail(supplier.email ?? '');
    setAddress(supplier.address ?? '');
    setContactDrafts(contactsToDrafts(supplier.contacts));
    // Com solicitação pendente, o formulário continua de onde ela parou.
    const pending = pendingRequest?.changes;
    setLegalName(pending?.legalName ?? supplier.legalName);
    setCnpj(formatCnpj(pending?.cnpj ?? supplier.cnpj));
    setProductLinks(
      (pending?.productLinks ?? supplier.productLinks).map((l) => ({
        brand: l.brand,
        line: l.line,
        isPrimary: false,
      })),
    );
  };

  useEffect(() => {
    supplierPortalService
      .getProfile()
      .then(applyProfile)
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Erro ao carregar seu cadastro'));
    supplierPortalService.getCatalogLines().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  const supplier = profile?.supplier;

  const directDirty = useMemo(() => {
    if (!supplier) return false;
    const contacts = JSON.stringify(draftsToContacts(contactDrafts).map(({ city, state, whatsapp }) => [city, state, whatsapp]));
    const saved = JSON.stringify(supplier.contacts.map(({ city, state, whatsapp }) => [city, state, whatsapp]));
    return (
      tradeName.trim() !== (supplier.tradeName ?? '') ||
      email.trim() !== (supplier.email ?? '') ||
      address.trim() !== (supplier.address ?? '') ||
      contacts !== saved
    );
  }, [supplier, tradeName, email, address, contactDrafts]);

  const requestDiffers = useMemo(() => {
    if (!supplier) return false;
    return (
      legalName.trim() !== supplier.legalName ||
      digitsOnlyCnpj(cnpj) !== digitsOnlyCnpj(supplier.cnpj) ||
      linkKeys(productLinks) !== linkKeys(supplier.productLinks)
    );
  }, [supplier, legalName, cnpj, productLinks]);

  const handleSaveDirect = async () => {
    setDirectMsg(null);
    const contactsError = validateContactDrafts(contactDrafts);
    if (contactsError) {
      setDirectMsg({ type: 'error', text: contactsError });
      return;
    }
    setSavingDirect(true);
    try {
      const next = await supplierPortalService.updateProfile({
        tradeName: tradeName.trim(),
        email: email.trim(),
        address: address.trim(),
        contacts: draftsToContacts(contactDrafts),
      });
      applyProfile(next);
      setDirectMsg({ type: 'ok', text: 'Dados salvos. Já aparecem para as oficinas.' });
    } catch (e) {
      setDirectMsg({ type: 'error', text: e instanceof Error ? e.message : 'Erro ao salvar' });
    } finally {
      setSavingDirect(false);
    }
  };

  const handleSendRequest = async () => {
    if (!supplier) return;
    setRequestMsg(null);
    if (!legalName.trim()) {
      setRequestMsg({ type: 'error', text: 'Informe a razão social.' });
      return;
    }
    if (!isValidCnpj(digitsOnlyCnpj(cnpj))) {
      setRequestMsg({ type: 'error', text: 'CNPJ inválido.' });
      return;
    }
    setSendingRequest(true);
    try {
      const next = await supplierPortalService.requestChange({
        legalName: legalName.trim(),
        cnpj: digitsOnlyCnpj(cnpj),
        productLinks: productLinks.map(({ brand, line }) => ({ brand, line })),
      });
      applyProfile(next);
      setRequestMsg({ type: 'ok', text: 'Solicitação enviada. A administração vai analisar.' });
    } catch (e) {
      setRequestMsg({ type: 'error', text: e instanceof Error ? e.message : 'Erro ao enviar' });
    } finally {
      setSendingRequest(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!window.confirm('Cancelar a solicitação pendente?')) return;
    setRequestMsg(null);
    try {
      applyProfile(await supplierPortalService.cancelChangeRequest());
      setRequestMsg({ type: 'ok', text: 'Solicitação cancelada.' });
    } catch (e) {
      setRequestMsg({ type: 'error', text: e instanceof Error ? e.message : 'Erro ao cancelar' });
    }
  };

  if (loadError) {
    return (
      <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4">{loadError}</p>
    );
  }
  if (!profile || !supplier) {
    return <div className="h-48 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse" />;
  }

  const pending = profile.pendingRequest;
  const lastReviewed = profile.lastReviewedRequest;

  return (
    <div className="space-y-5">
      {/* Resumo do cadastro, como as oficinas veem */}
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-start">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
          <Truck className="text-amber-400" size={26} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{supplier.legalName}</h1>
            <span
              className={cn(
                'text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border',
                supplier.isActive
                  ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                  : 'text-red-400 border-red-500/30 bg-red-500/10',
              )}
            >
              {supplier.isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          {supplier.tradeName && <p className="text-sm text-slate-400 mt-1">{supplier.tradeName}</p>}
          <p className="text-xs font-mono text-slate-500 mt-2">{formatCnpj(supplier.cnpj)}</p>
          {!supplier.isActive && (
            <p className="text-xs text-red-300/80 mt-2">
              Seu cadastro está inativo: as oficinas não veem seus contatos. Fale com a administração.
            </p>
          )}
        </div>
      </section>

      {/* 1. Vale na hora */}
      <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <SupplierSectionIntro
          icon={MessageCircle}
          title="Contato e endereço"
          description="Você altera e vale na hora — é o que as oficinas usam para falar com você."
          accent="emerald"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome fantasia">
            <input value={tradeName} onChange={(e) => setTradeName(e.target.value)} maxLength={160} className={inputClass} />
          </Field>
          <Field label="E-mail comercial">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Endereço">
              <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} className={inputClass} />
            </Field>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">WhatsApp por cidade</p>
          <SupplierContactsEditor contacts={contactDrafts} onChange={setContactDrafts} hideHeader layout="grid" />
        </div>

        {directMsg && (
          <p
            className={cn(
              'text-sm rounded-xl px-4 py-3 border',
              directMsg.type === 'ok'
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-red-400 bg-red-500/10 border-red-500/20',
            )}
          >
            {directMsg.text}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            disabled={savingDirect || !directDirty}
            onClick={() => void handleSaveDirect()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            <Save size={16} />
            {savingDirect ? 'Salvando...' : 'Salvar contato e endereço'}
          </button>
        </div>
      </section>

      {/* 2. Precisa de aprovação */}
      <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <SupplierSectionIntro
          icon={Building2}
          title="Dados da empresa e produtos"
          description="Razão social, CNPJ e as marcas/linhas que você atende só mudam depois da aprovação da administração."
        />

        {pending && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
              <Clock size={16} />
              Aguardando aprovação desde {formatDate(pending.createdAt)}
            </p>
            <ul className="text-xs text-amber-100/80 space-y-1 pl-6 list-disc">
              {describeChanges(pending).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="text-[11px] text-amber-200/70">
              Enquanto isso, as oficinas continuam vendo os dados atuais. Se enviar de novo, esta solicitação é
              substituída.
            </p>
            <button
              type="button"
              onClick={() => void handleCancelRequest()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200 underline hover:text-white"
            >
              <Undo2 size={13} />
              Cancelar solicitação
            </button>
          </div>
        )}

        {!pending && lastReviewed?.status === 'rejected' && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-red-200">
              <XCircle size={16} />
              Sua última solicitação foi recusada em {formatDate(lastReviewed.reviewedAt)}
            </p>
            {lastReviewed.adminNote && (
              <p className="text-xs text-red-100/80 pl-6">Motivo: {lastReviewed.adminNote}</p>
            )}
          </div>
        )}
        {!pending && lastReviewed?.status === 'approved' && (
          <p className="flex items-center gap-2 text-xs text-emerald-300/80">
            <CheckCircle2 size={14} />
            Última solicitação aprovada em {formatDate(lastReviewed.reviewedAt)}.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Razão social">
            <input value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={200} className={inputClass} />
          </Field>
          <Field label="CNPJ">
            <input
              value={cnpj}
              onChange={(e) => setCnpj(formatCnpj(e.target.value))}
              inputMode="numeric"
              className={cn(inputClass, 'font-mono')}
            />
          </Field>
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-500">
            <Link2 size={12} />
            Marcas / linhas que você atende
          </p>
          <SupplierProductLinksEditor
            materials={catalog}
            links={productLinks}
            onChange={setProductLinks}
            hideHeader
            layout="grid"
            allowPrimary={false}
          />
        </div>

        {requestMsg && (
          <p
            className={cn(
              'text-sm rounded-xl px-4 py-3 border',
              requestMsg.type === 'ok'
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-red-400 bg-red-500/10 border-red-500/20',
            )}
          >
            {requestMsg.text}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            disabled={sendingRequest || !requestDiffers}
            onClick={() => void handleSendRequest()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            <Send size={16} />
            {sendingRequest ? 'Enviando...' : pending ? 'Atualizar solicitação' : 'Enviar para aprovação'}
          </button>
        </div>
      </section>

      {/* 3. Só leitura */}
      <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <SupplierSectionIntro
          icon={Lock}
          title="Mantido pela administração"
          description="Vem da consulta do CNPJ ou é definido pela administração."
        />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Situação cadastral:</span>
          {supplier.registrationStatus ? (
            <span
              className={cn(
                'text-[10px] font-mono uppercase px-2 py-1 rounded-lg border',
                registrationStatusClass(supplier.registrationStatus),
              )}
            >
              {supplier.registrationStatus}
            </span>
          ) : (
            <span className="text-slate-400">não informada</span>
          )}
        </div>
        {supplier.partners && supplier.partners.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-500">
              <Users size={12} />
              Quadro societário
            </p>
            <ul className="divide-y divide-slate-800/80 rounded-xl border border-slate-800">
              {supplier.partners.map((partner, index) => (
                <li key={`${partner.name}-${index}`} className="flex flex-wrap justify-between gap-2 px-4 py-2.5 text-sm">
                  <span className="text-slate-200">{partner.name}</span>
                  <span className="text-xs font-mono uppercase text-slate-500">{partner.role || '—'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-[11px] text-slate-500">
          Qual fornecedor aparece como principal de cada linha no orçamento das oficinas é definido pela
          administração.
        </p>
      </section>
    </div>
  );
}
