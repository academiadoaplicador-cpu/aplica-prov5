import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle2,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Save,
  Trash2,
  Truck,
  Users,
} from 'lucide-react';
import { supplierService } from '../../services/supplierService';
import { Material, Supplier, SupplierProductLink } from '../../types';
import { ROUTES } from '../../routes/paths';
import { databaseService } from '../../services/databaseService';
import SupplierFormFields, {
  supplierFormValuesFromSupplier,
  validateSupplierForm,
  type SupplierFormValues,
} from '../../components/admin/SupplierFormFields';
import SupplierProductLinksEditor from '../../components/admin/SupplierProductLinksEditor';
import SupplierContactsEditor, {
  contactsToDrafts,
  draftsToContacts,
  validateContactDrafts,
  type SupplierContactDraft,
} from '../../components/admin/SupplierContactsEditor';
import { digitsOnlyCnpj, formatCnpj } from '../../utils/cnpj';
import { cn } from '../../lib/utils';

type SupplierTab = 'empresa' | 'contatos' | 'vinculos';

function supplierPayloadFromValues(values: SupplierFormValues) {
  return {
    legalName: values.legalName.trim(),
    tradeName: values.tradeName.trim() || undefined,
    cnpj: digitsOnlyCnpj(values.cnpj),
    address: values.address.trim() || undefined,
    registrationStatus: values.registrationStatus.trim() || undefined,
    partners: values.partners.length > 0 ? values.partners : undefined,
    email: values.email.trim() || undefined,
    isActive: values.isActive,
  };
}

function registrationStatusClass(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'ATIVA') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  if (normalized) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  return 'text-slate-400 border-slate-700 bg-slate-900/40';
}

function BackLink() {
  return (
    <Link
      to={ROUTES.admin.suppliers}
      className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
    >
      <ArrowLeft size={16} />
      Voltar à lista
    </Link>
  );
}

function SectionIntro({
  icon: Icon,
  title,
  description,
  accent = 'amber',
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  accent?: 'amber' | 'emerald';
}) {
  const iconClass = accent === 'emerald' ? 'text-emerald-400' : 'text-amber-400';
  return (
    <div className="flex items-start gap-3 pb-4 mb-5 border-b border-slate-800/80">
      <div
        className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border',
          accent === 'emerald'
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-amber-500/10 border-amber-500/20',
        )}
      >
        <Icon size={18} className={iconClass} />
      </div>
      <div>
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function AdminSupplierDetailPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [tab, setTab] = useState<SupplierTab>('empresa');
  const [values, setValues] = useState<SupplierFormValues>({
    legalName: '',
    tradeName: '',
    cnpj: '',
    address: '',
    registrationStatus: '',
    partners: [],
    email: '',
    isActive: true,
  });
  const [contactDrafts, setContactDrafts] = useState<SupplierContactDraft[]>([]);
  const [productLinks, setProductLinks] = useState<SupplierProductLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!supplierId) return;
    supplierService
      .getSupplier(supplierId)
      .then((s) => {
        setSupplier(s);
        setValues(supplierFormValuesFromSupplier(s));
        setContactDrafts(contactsToDrafts(s.contacts));
        setProductLinks(s.productLinks || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'));
  };

  useEffect(() => {
    load();
    databaseService.getMaterials().then(setMaterials);
  }, [supplierId]);

  const handleSave = async () => {
    if (!supplierId) return;
    setError(null);
    setSaveMsg(null);

    const validationError = validateSupplierForm(values);
    if (validationError) {
      setError(validationError);
      setTab('empresa');
      return;
    }

    const contactsError = validateContactDrafts(contactDrafts);
    if (contactsError) {
      setError(contactsError);
      setTab('contatos');
      return;
    }

    setSaving(true);
    try {
      const updated = await supplierService.updateSupplier(supplierId, {
        ...supplierPayloadFromValues(values),
        contacts: draftsToContacts(contactDrafts),
        productLinks,
      });
      setSupplier(updated);
      setValues({
        ...supplierFormValuesFromSupplier(updated),
        cnpj: formatCnpj(updated.cnpj),
      });
      setSaveMsg('Fornecedor atualizado com sucesso');
      setTimeout(() => setSaveMsg(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!supplier) return;
    try {
      await supplierService.setSupplierActive(supplier.id, !supplier.isActive);
      setValues((v) => ({ ...v, isActive: !supplier.isActive }));
      setSupplier((s) => (s ? { ...s, isActive: !s.isActive } : s));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao alterar status');
    }
  };

  const handleDelete = async () => {
    if (!supplierId || !supplier) return;
    if (!window.confirm(`Excluir permanentemente o fornecedor "${supplier.legalName}"?`)) return;
    try {
      await supplierService.deleteSupplier(supplierId);
      navigate(ROUTES.admin.suppliers);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  if (error && !supplier) {
    return (
      <div className="w-full space-y-4">
        <BackLink />
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          {error}
        </p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="w-full space-y-4">
        <BackLink />
        <div className="h-48 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  const displayName = values.legalName.trim() || supplier.legalName;
  const displayTrade = values.tradeName.trim() || supplier.tradeName;
  const contactCount = contactDrafts.filter(
    (c) => c.city.trim() && c.state.trim() && c.phone.national.replace(/\D/g, '').length >= 10,
  ).length;

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Topo: voltar + ações */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <BackLink />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleToggleActive()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            {values.isActive ? <Ban size={14} /> : <CheckCircle2 size={14} />}
            {values.isActive ? 'Inativar' : 'Reativar'}
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} />
            Excluir
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
          >
            <Save size={14} />
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>

      {/* Resumo — largura total, 2 colunas no desktop */}
      <div className="w-full rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 overflow-hidden">
        <div className="p-5 sm:p-6 lg:p-7">
          <div className="grid grid-cols-1 xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-5 xl:gap-8 items-start">
            <div className="w-14 h-14 xl:w-16 xl:h-16 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
              <Truck className="text-amber-400" size={28} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{displayName}</h1>
                <span
                  className={cn(
                    'text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border shrink-0',
                    values.isActive
                      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                      : 'text-red-400 border-red-500/30 bg-red-500/10',
                  )}
                >
                  {values.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              {displayTrade && (
                <p className="text-sm sm:text-base text-slate-400 mt-1">{displayTrade}</p>
              )}
              <p className="text-xs sm:text-sm font-mono text-slate-500 mt-2">{formatCnpj(values.cnpj)}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {values.registrationStatus.trim() && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-1 rounded-lg border',
                      registrationStatusClass(values.registrationStatus),
                    )}
                  >
                    <CheckCircle2 size={11} />
                    {values.registrationStatus}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-1 rounded-lg border text-slate-400 border-slate-700 bg-slate-900/50">
                  <MessageCircle size={11} />
                  {contactCount} contato{contactCount !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-1 rounded-lg border text-slate-400 border-slate-700 bg-slate-900/50">
                  <Link2 size={11} />
                  {productLinks.length} vínculo{productLinks.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="min-w-0 space-y-3 xl:border-l xl:border-slate-800/80 xl:pl-8">
              {values.address.trim() && (
                <div className="flex items-start gap-2.5 text-sm text-slate-400">
                  <MapPin size={16} className="text-slate-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{values.address}</span>
                </div>
              )}
              {values.email.trim() && (
                <div className="flex items-center gap-2.5 text-sm text-slate-400">
                  <Mail size={16} className="text-slate-500 shrink-0" />
                  <span className="break-all">{values.email}</span>
                </div>
              )}
              {!values.address.trim() && !values.email.trim() && (
                <p className="text-xs text-slate-600 italic">
                  Endereço e e-mail aparecem aqui após consulta do CNPJ.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Abas — largura total */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2.5 bg-slate-950/95 backdrop-blur-md border-y border-slate-800/80">
        <div className="flex gap-1 overflow-x-auto pb-0.5 w-full">
          {(
            [
              ['empresa', 'Empresa', Building2],
              ['contatos', 'WhatsApp', MessageCircle],
              ['vinculos', 'Marca / Linha', Link2],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border',
                tab === id
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'text-slate-400 hover:bg-slate-800/80 border-transparent hover:border-slate-700',
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}
      {saveMsg && (
        <p className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          {saveMsg}
        </p>
      )}

      {/* Conteúdo por aba — largura total */}
      {tab === 'empresa' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 w-full">
          <div
            className={cn(
              'bg-slate-900/40 border border-slate-800 rounded-2xl p-5 sm:p-6 lg:p-7',
              values.partners.length > 0 ? 'xl:col-span-7' : 'xl:col-span-12',
            )}
          >
            <SectionIntro
              icon={Building2}
              title="Dados da empresa"
              description="Informações cadastrais e consulta de CNPJ via Brasil API."
            />
            <SupplierFormFields values={values} onChange={setValues} variant="detail" />
          </div>

          {values.partners.length > 0 && (
            <div className="xl:col-span-5 bg-slate-900/40 border border-slate-800 rounded-2xl p-5 sm:p-6 lg:p-7">
              <SectionIntro
                icon={Users}
                title="Quadro societário"
                description="Dados obtidos na consulta do CNPJ."
              />
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-950/80 text-left">
                      <th className="px-4 py-2.5 text-[10px] font-mono uppercase text-slate-500">
                        Nome
                      </th>
                      <th className="px-4 py-2.5 text-[10px] font-mono uppercase text-slate-500">
                        Qualificação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {values.partners.map((partner, index) => (
                      <tr key={`${partner.name}-${index}`} className="hover:bg-slate-950/40">
                        <td className="px-4 py-3 text-slate-200">{partner.name}</td>
                        <td className="px-4 py-3 text-xs font-mono uppercase text-slate-500 whitespace-nowrap">
                          {partner.role || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'contatos' && (
        <div className="w-full bg-slate-900/40 border border-slate-800 rounded-2xl p-5 sm:p-6 lg:p-7">
          <SectionIntro
            icon={MessageCircle}
            title="Contatos WhatsApp"
            description="Números por cidade/estado — usados no botão WhatsApp do orçamento."
            accent="emerald"
          />
          <SupplierContactsEditor
            contacts={contactDrafts}
            onChange={setContactDrafts}
            hideHeader
            layout="grid"
          />
        </div>
      )}

      {tab === 'vinculos' && (
        <div className="w-full bg-slate-900/40 border border-slate-800 rounded-2xl p-5 sm:p-6 lg:p-7">
          <SectionIntro
            icon={Link2}
            title="Vínculos Marca / Linha"
            description="Produtos atendidos por este fornecedor. A estrela indica o principal."
          />
          <SupplierProductLinksEditor
            materials={materials}
            links={productLinks}
            onChange={setProductLinks}
            hideHeader
            layout="grid"
          />
        </div>
      )}
    </div>
  );
}
