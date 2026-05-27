import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { ApplicatorAddress, formatCepInput } from '../types/address';
import { fetchAddressByCep } from '../services/viaCep';
import { cn } from '../lib/utils';

interface AddressFieldsProps {
  value: ApplicatorAddress;
  onChange: (value: ApplicatorAddress) => void;
  inputClass?: string;
  labelClass?: string;
}

export function AddressFields({ value, onChange, inputClass, labelClass }: AddressFieldsProps) {
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  const baseInput = cn(
    'w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-600',
    inputClass,
  );
  const label = cn('text-xs text-slate-500 mb-2 block font-mono', labelClass);

  const patch = (partial: Partial<ApplicatorAddress>) => onChange({ ...value, ...partial });

  const handleCepChange = (raw: string) => {
    setCepError('');
    patch({ cep: formatCepInput(raw) });
  };

  const lookupCep = async () => {
    const digits = value.cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setCepError('Informe um CEP com 8 dígitos');
      return;
    }
    setCepLoading(true);
    setCepError('');
    try {
      const found = await fetchAddressByCep(digits);
      if (!found) {
        setCepError('CEP não encontrado');
        return;
      }
      onChange({ ...value, ...found, cep: formatCepInput(digits), addressNumber: value.addressNumber });
    } catch {
      setCepError('Não foi possível consultar o CEP');
    } finally {
      setCepLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={label}>CEP</label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={value.cep}
            onChange={(e) => handleCepChange(e.target.value)}
            onBlur={() => {
              if (value.cep.replace(/\D/g, '').length === 8) lookupCep();
            }}
            placeholder="00000-000"
            maxLength={9}
            className={cn(baseInput, 'flex-1')}
          />
          <button
            type="button"
            onClick={lookupCep}
            disabled={cepLoading}
            className="shrink-0 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
          >
            {cepLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Buscar
          </button>
        </div>
        {cepError && <p className="text-xs text-red-400 mt-1">{cepError}</p>}
      </div>

      <div>
        <label className={label}>Rua / logradouro</label>
        <input
          type="text"
          value={value.street}
          onChange={(e) => patch({ street: e.target.value })}
          placeholder="Rua, avenida..."
          className={baseInput}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Número</label>
          <input
            type="text"
            value={value.addressNumber}
            onChange={(e) => patch({ addressNumber: e.target.value })}
            placeholder="123"
            className={baseInput}
          />
        </div>
        <div>
          <label className={label}>Complemento</label>
          <input
            type="text"
            value={value.addressComplement}
            onChange={(e) => patch({ addressComplement: e.target.value })}
            placeholder="Apto, sala, bloco..."
            className={baseInput}
          />
        </div>
      </div>

      <div>
        <label className={label}>Bairro</label>
        <input
          type="text"
          value={value.neighborhood}
          onChange={(e) => patch({ neighborhood: e.target.value })}
          className={baseInput}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className={label}>Cidade</label>
          <input
            type="text"
            value={value.city}
            onChange={(e) => patch({ city: e.target.value })}
            className={baseInput}
          />
        </div>
        <div>
          <label className={label}>UF</label>
          <input
            type="text"
            value={value.stateCode}
            onChange={(e) => patch({ stateCode: e.target.value.toUpperCase().slice(0, 2) })}
            maxLength={2}
            placeholder="PR"
            className={baseInput}
          />
        </div>
      </div>

      <div>
        <label className={label}>Estado</label>
        <input
          type="text"
          value={value.stateName}
          readOnly
          className={cn(baseInput, 'opacity-70 cursor-not-allowed')}
        />
      </div>

    </div>
  );
}
