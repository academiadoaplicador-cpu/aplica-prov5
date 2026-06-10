import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck } from 'lucide-react';
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
import { digitsOnlyCnpj } from '../../utils/cnpj';
import type { CnpjLookupResult } from '../../types';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateSupplierForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    const contactsError = validateContactDrafts(contactDrafts);
    if (contactsError) {
      setError(contactsError);
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
    <div className="space-y-6 max-w-2xl">
      <Link
        to={ROUTES.admin.suppliers}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={16} />
        Voltar à lista
      </Link>

      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Truck className="text-amber-400" size={22} />
          Cadastrar fornecedor
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Cadastre a empresa e os números de WhatsApp por cidade/estado.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-white">Empresa</h4>
          <SupplierFormFields
            values={values}
            onChange={setValues}
            onCnpjLoaded={handleCnpjLoaded}
          />
        </section>

        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
          <SupplierContactsEditor contacts={contactDrafts} onChange={setContactDrafts} />
        </section>

        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
          <SupplierProductLinksEditor
            materials={materials}
            links={productLinks}
            onChange={setProductLinks}
          />
        </section>

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {loading ? 'Salvando...' : 'Cadastrar fornecedor'}
        </button>
      </form>
    </div>
  );
}
