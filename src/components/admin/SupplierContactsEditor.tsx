import { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SupplierContactInput } from '../../types';
import { BRAZILIAN_UF } from '../../constants/brazilianStates';
import { PhoneInput, phoneValueFromStored, type PhoneInputValue } from '../PhoneInput';
import { cn } from '../../lib/utils';
import { digitsOnly } from '../../utils/phone';

export type SupplierContactDraft = SupplierContactInput & {
  phone: PhoneInputValue;
};

export function emptyContactDraft(): SupplierContactDraft {
  return {
    city: '',
    state: 'SP',
    whatsapp: '',
    phone: {
      countryCode: '+55',
      national: '',
      formatted: '',
      stored: '',
    },
  };
}

export function contactsToDrafts(contacts: SupplierContactInput[]): SupplierContactDraft[] {
  if (contacts.length === 0) return [emptyContactDraft()];
  return contacts.map((contact) => ({
    ...contact,
    phone: phoneValueFromStored(contact.whatsapp),
  }));
}

export function draftsToContacts(drafts: SupplierContactDraft[]): SupplierContactInput[] {
  return drafts
    .map((draft) => ({
      id: draft.id,
      city: draft.city.trim(),
      state: draft.state.trim().toUpperCase(),
      whatsapp: draft.phone.stored || digitsOnly(draft.phone.national),
    }))
    .filter((contact) => contact.city && contact.state && contact.whatsapp.length >= 10);
}

export function validateContactDrafts(drafts: SupplierContactDraft[]): string | null {
  if (drafts.length === 0) return 'Cadastre ao menos um contato WhatsApp';

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i];
    if (!draft.city.trim()) return `Contato ${i + 1}: informe a cidade`;
    if (!draft.state.trim()) return `Contato ${i + 1}: informe o estado (UF)`;
    const phoneDigits = digitsOnly(draft.phone.national);
    if (phoneDigits.length < 10) return `Contato ${i + 1}: WhatsApp inválido`;
  }

  return null;
}

interface SupplierContactsEditorProps {
  contacts: SupplierContactDraft[];
  onChange: (contacts: SupplierContactDraft[]) => void;
  hideHeader?: boolean;
  layout?: 'stack' | 'grid';
}

export default function SupplierContactsEditor({
  contacts,
  onChange,
  hideHeader = false,
  layout = 'stack',
}: SupplierContactsEditorProps) {
  const groupedHint = useMemo(
    () => 'Os contatos aparecem no orçamento agrupados por cidade e estado.',
    [],
  );

  const updateContact = (index: number, patch: Partial<SupplierContactDraft>) => {
    onChange(contacts.map((contact, i) => (i === index ? { ...contact, ...patch } : contact)));
  };

  const updatePhone = (index: number, phone: PhoneInputValue) => {
    updateContact(index, {
      phone,
      whatsapp: phone.stored || digitsOnly(phone.national),
    });
  };

  const addContact = () => {
    onChange([...contacts, emptyContactDraft()]);
  };

  const removeContact = (index: number) => {
    if (contacts.length <= 1) return;
    onChange(contacts.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {!hideHeader && (
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-white">Contatos WhatsApp</h4>
          <button
            type="button"
            onClick={addContact}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors"
          >
            <Plus size={14} />
            Adicionar número
          </button>
        </div>
      )}

      {hideHeader && (
        <div className="flex justify-end mb-1">
          <button
            type="button"
            onClick={addContact}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors"
          >
            <Plus size={14} />
            Adicionar número
          </button>
        </div>
      )}

      <div
        className={cn(
          layout === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
            : 'space-y-3',
        )}
      >
        {contacts.map((contact, index) => (
          <div
            key={contact.id ?? `contact-${index}`}
            className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-mono uppercase text-slate-500">Contato {index + 1}</p>
              {contacts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeContact(index)}
                  className="p-2 rounded-lg text-red-400 border border-slate-800 hover:bg-red-500/10 transition-colors"
                  aria-label="Remover contato"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-400">Cidade *</span>
                <input
                  type="text"
                  value={contact.city}
                  onChange={(e) => updateContact(index, { city: e.target.value })}
                  placeholder="Ex: São Paulo"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-400">Estado (UF) *</span>
                <select
                  value={contact.state}
                  onChange={(e) => updateContact(index, { state: e.target.value })}
                  className={cn(
                    'w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800',
                    'text-white text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50',
                  )}
                >
                  {BRAZILIAN_UF.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-400">WhatsApp *</span>
              <PhoneInput value={contact.phone} onChange={(phone) => updatePhone(index, phone)} />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-500">{groupedHint}</p>
    </div>
  );
}
