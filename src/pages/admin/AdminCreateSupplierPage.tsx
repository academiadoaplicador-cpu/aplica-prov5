import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Plus,
  Truck,
  Users,
} from 'lucide-react';
import { supplierService } from '../../services/supplierService';
import { Material, SupplierProductLink } from '../../types';
import { ROUTES } from '../../routes/paths';
import { databaseService } from '../../services/databaseService';
import SupplierFormFields, {
  validateSupplierForm,
  type SupplierFormValues,
} from '../../components/admin/SupplierFormFields';
import SupplierProductLinksEditor from '../../components/admin/SupplierProductLinksEditor';
import SupplierContactsEditor, {
  draftsToContacts,
  emptyContactDraft,
  validateContactDrafts,
  type SupplierContactDraft,
} from '../../components/admin/SupplierContactsEditor';
import {
  registrationStatusClass,
  SupplierAdminBackLink,
  SupplierSectionIntro,
} from '../../components/admin/supplierAdminUi';
import { digitsOnlyCnpj, formatCnpj } from '../../utils/cnpj';
import { cn } from '../../lib/utils';
import type { CnpjLookupResult } from '../../types';

type CreateTab = 'empresa' | 'contatos' | 'vinculos';

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

export default function AdminCreateSupplierPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<CreateTab>('empresa');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [productLinks, setProductLinks] = useState<SupplierProductLink[]>([]);
  const [contactDrafts, setContactDrafts] = useState<SupplierContactDraft[]>([emptyContactDraft()]);
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

  const handleCnpjLoaded = (result: CnpjLookupResult) => {
    if (!result.city || !result.state) return;
    setContactDrafts((drafts) => {
      if (drafts.length !== 1) return drafts;
      const first = drafts[0];
      if (first.city.trim() || first.whatsapp.trim()) return drafts;
      return [{ ...first, city: result.city!, state: result.state! }];
    });
  };

  useEffect(() => {
    databaseService.getMaterials().then(setMaterials);
  }, []);

  const contactCount = contactDrafts.filter(
    (c) => c.city.trim() && c.state.trim() && c.phone.national.replace(/\D/g, '').length >= 10,
  ).length;

  const hasPreview = Boolean(values.legalName.trim() || values.cnpj.replace(/\D/g, '').length === 14);

  const handleSubmit = async () => {
    setError(null);

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

    setLoading(true);
    try {
      const created = await supplierService.createSupplier({
        ...supplierPayloadFromValues(values),
        contacts: draftsToContacts(contactDrafts),
        productLinks,
      });
      navigate(ROUTES.admin.supplier(created.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar fornecedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4 pb-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SupplierAdminBackLink />
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleSubmit()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          <Plus size={16} />
          {loading ? 'Cadastrando...' : 'Cadastrar fornecedor'}
        </button>
      </div>

      {/* Hero */}
      <div className="w-full rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 overflow-hidden">
        <div className="p-5 sm:p-6 lg:p-7">
          <div className="grid grid-cols-1 xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-5 xl:gap-8 items-start">
            <div className="w-14 h-14 xl:w-16 xl:h-16 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
              <Truck className="text-amber-400" size={28} />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                {values.legalName.trim() || 'Novo fornecedor'}
              </h1>
              <p className="text-sm sm:text-base text-slate-400 mt-1">
                {values.tradeName.trim() ||
                  'Consulte o CNPJ para preencher os dados automaticamente.'}
              </p>
              {values.cnpj.replace(/\D/g, '').length === 14 && (
                <p className="text-xs sm:text-sm font-mono text-slate-500 mt-2">
                  {formatCnpj(values.cnpj)}
                </p>
              )}
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
                {!hasPreview && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-1 rounded-lg border text-amber-400/80 border-amber-500/20 bg-amber-500/5">
                    Rascunho
                  </span>
                )}
              </div>
            </div>

            <div className="min-w-0 space-y-3 xl:border-l xl:border-slate-800/80 xl:pl-8">
              {values.address.trim() ? (
                <div className="flex items-start gap-2.5 text-sm text-slate-400">
                  <MapPin size={16} className="text-slate-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{values.address}</span>
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">
                  O endereço será preenchido na consulta do CNPJ.
                </p>
              )}
              {values.email.trim() && (
                <div className="flex items-center gap-2.5 text-sm text-slate-400">
                  <Mail size={16} className="text-slate-500 shrink-0" />
                  <span className="break-all">{values.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
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

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {tab === 'empresa' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 w-full">
          <div
            className={cn(
              'bg-slate-900/40 border border-slate-800 rounded-2xl p-5 sm:p-6 lg:p-7',
              values.partners.length > 0 ? 'xl:col-span-7' : 'xl:col-span-12',
            )}
          >
            <SupplierSectionIntro
              icon={Building2}
              title="Dados da empresa"
              description="Informe o CNPJ e consulte para preencher razão social, endereço e sócios."
            />
            <SupplierFormFields
              values={values}
              onChange={setValues}
              onCnpjLoaded={handleCnpjLoaded}
              variant="detail"
            />
          </div>

          {values.partners.length > 0 && (
            <div className="xl:col-span-5 bg-slate-900/40 border border-slate-800 rounded-2xl p-5 sm:p-6 lg:p-7">
              <SupplierSectionIntro
                icon={Users}
                title="Quadro societário"
                description="Pré-visualização dos sócios retornados pela consulta."
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
          <SupplierSectionIntro
            icon={MessageCircle}
            title="Contatos WhatsApp"
            description="Cadastre ao menos um número por cidade/estado para uso no orçamento."
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
          <SupplierSectionIntro
            icon={Link2}
            title="Vínculos Marca / Linha"
            description="Opcional — defina quais produtos este fornecedor atende."
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

      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleSubmit()}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          <Plus size={16} />
          {loading ? 'Cadastrando...' : 'Cadastrar fornecedor'}
        </button>
      </div>
    </div>
  );
}
