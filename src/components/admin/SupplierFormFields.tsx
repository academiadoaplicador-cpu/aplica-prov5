import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { formatCnpj, isValidCnpj, digitsOnlyCnpj } from '../../utils/cnpj';
import { cn } from '../../lib/utils';
import { supplierService } from '../../services/supplierService';
import type { CnpjLookupResult, SupplierPartner } from '../../types';

export interface SupplierFormValues {
  legalName: string;
  tradeName: string;
  cnpj: string;
  address: string;
  registrationStatus: string;
  partners: SupplierPartner[];
  email: string;
  isActive: boolean;
}

interface SupplierFormFieldsProps {
  values: SupplierFormValues;
  onChange: (values: SupplierFormValues) => void;
  onCnpjLoaded?: (result: CnpjLookupResult) => void;
  /** Layout mais compacto na tela de detalhe (sócios ficam em seção separada). */
  variant?: 'default' | 'detail';
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-[10px] font-mono uppercase text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50"
      />
      {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
    </label>
  );
}

export function supplierFormValuesFromSupplier(supplier: {
  legalName: string;
  tradeName?: string;
  cnpj: string;
  address?: string;
  registrationStatus?: string;
  partners?: SupplierPartner[];
  email?: string;
  isActive: boolean;
}): SupplierFormValues {
  return {
    legalName: supplier.legalName,
    tradeName: supplier.tradeName || '',
    cnpj: formatCnpj(supplier.cnpj),
    address: supplier.address || '',
    registrationStatus: supplier.registrationStatus || '',
    partners: supplier.partners || [],
    email: supplier.email || '',
    isActive: supplier.isActive,
  };
}

export function validateSupplierForm(values: SupplierFormValues): string | null {
  if (!values.legalName.trim()) return 'Razão social é obrigatória';
  if (!isValidCnpj(values.cnpj)) return 'CNPJ inválido';
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    return 'E-mail inválido';
  }
  return null;
}

function registrationStatusClass(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'ATIVA') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  if (normalized) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  return 'text-slate-400 border-slate-700 bg-slate-900/40';
}

function CadastralSummary({
  values,
  showPartners,
}: {
  values: SupplierFormValues;
  showPartners: boolean;
}) {
  const hasData =
    values.registrationStatus.trim() ||
    values.address.trim() ||
    (showPartners && values.partners.length > 0);

  if (!hasData) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-4">
      <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
        Dados cadastrais (CNPJ)
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {values.registrationStatus.trim() && (
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500">Situação</span>
            <p
              className={cn(
                'inline-flex text-xs font-mono uppercase px-2 py-1 rounded border',
                registrationStatusClass(values.registrationStatus),
              )}
            >
              {values.registrationStatus}
            </p>
          </div>
        )}

        {values.address.trim() && (
          <div className="space-y-1 sm:col-span-2">
            <span className="text-[10px] font-mono uppercase text-slate-500">Endereço</span>
            <p className="text-sm text-slate-300 leading-relaxed">{values.address}</p>
          </div>
        )}
      </div>

      {showPartners && values.partners.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-mono uppercase text-slate-500">Sócios</span>
          <ul className="space-y-1.5">
            {values.partners.map((partner, index) => (
              <li
                key={`${partner.name}-${index}`}
                className="text-sm text-slate-300 flex flex-col sm:flex-row sm:items-baseline sm:gap-2"
              >
                <span>{partner.name}</span>
                {partner.role && (
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    {partner.role}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function SupplierFormFields({
  values,
  onChange,
  onCnpjLoaded,
  variant = 'default',
}: SupplierFormFieldsProps) {
  const [cnpjTouched, setCnpjTouched] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const isDetail = variant === 'detail';

  const cnpjDigits = digitsOnlyCnpj(values.cnpj);
  const cnpjInvalid = cnpjTouched && cnpjDigits.length === 14 && !isValidCnpj(values.cnpj);
  const canLookup = cnpjDigits.length === 14 && isValidCnpj(values.cnpj) && !lookupLoading;

  const handleLookup = async () => {
    if (!canLookup) return;
    setLookupError(null);
    setLookupLoading(true);
    try {
      const result = await supplierService.lookupCnpj(values.cnpj);
      onChange({
        ...values,
        legalName: result.legalName,
        tradeName: result.tradeName,
        address: result.address,
        registrationStatus: result.registrationStatus,
        partners: result.partners,
        email: values.email.trim() || result.email || '',
      });
      onCnpjLoaded?.(result);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Erro ao consultar CNPJ');
    } finally {
      setLookupLoading(false);
    }
  };

  const hasProfile =
    values.address.trim() ||
    values.registrationStatus.trim() ||
    values.partners.length > 0 ||
    values.tradeName.trim();

  return (
    <div className="space-y-5">
      {/* CNPJ + consulta */}
      <label className="block space-y-1.5">
        <span className="text-[10px] font-mono uppercase text-slate-500">CNPJ *</span>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={values.cnpj}
            onChange={(e) => onChange({ ...values, cnpj: formatCnpj(e.target.value) })}
            onBlur={() => setCnpjTouched(true)}
            placeholder="00.000.000/0000-00"
            maxLength={18}
            className={cn(
              'flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-slate-950 border text-white text-base sm:text-sm focus:outline-none focus:ring-1',
              cnpjInvalid
                ? 'border-red-500/50 focus:ring-red-500/50'
                : 'border-slate-800 focus:ring-amber-500/50',
            )}
          />
          <button
            type="button"
            onClick={() => void handleLookup()}
            disabled={!canLookup}
            className="inline-flex items-center justify-center gap-1.5 shrink-0 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
            title="Consultar dados do CNPJ"
          >
            {lookupLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}
            Consultar CNPJ
          </button>
        </div>
        {cnpjInvalid && <span className="text-[10px] text-red-400">CNPJ inválido</span>}
        {lookupError && <span className="text-[10px] text-red-400 block">{lookupError}</span>}
        <span className="text-[10px] text-slate-500 block">Consulta automática via Brasil API.</span>
      </label>

      {/* Identificação */}
      <div
        className={cn(
          'grid gap-4',
          isDetail ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2',
        )}
      >
        <Field
          label="Razão social *"
          value={values.legalName}
          onChange={(legalName) => onChange({ ...values, legalName })}
          placeholder="Nome legal da empresa"
        />
        <Field
          label="Nome fantasia"
          value={values.tradeName}
          onChange={(tradeName) => onChange({ ...values, tradeName })}
          placeholder="Nome comercial"
        />
      </div>

      <Field
        label="E-mail"
        type="email"
        value={values.email}
        onChange={(email) => onChange({ ...values, email })}
        placeholder="contato@fornecedor.com"
        hint="Opcional — preenchido automaticamente se disponível na consulta"
        className={isDetail ? 'lg:max-w-xl' : 'sm:max-w-md'}
      />

      {hasProfile && (
        <CadastralSummary values={values} showPartners={!isDetail} />
      )}

      <label className="flex items-center gap-3 cursor-pointer pt-1 border-t border-slate-800/80">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => onChange({ ...values, isActive: e.target.checked })}
          className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500/50"
        />
        <span className="text-sm text-white">Fornecedor ativo</span>
        <span className="text-[10px] text-slate-500">— inativos não aparecem no orçamento</span>
      </label>
    </div>
  );
}
