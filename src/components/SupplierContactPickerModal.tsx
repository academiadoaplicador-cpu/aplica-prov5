import { MapPin, X } from 'lucide-react';
import { Supplier, SupplierContact } from '../types';
import { formatContactLocation } from '../constants/brazilianStates';
import { cn } from '../lib/utils';

interface SupplierContactPickerModalProps {
  supplier: Supplier;
  onSelect: (contact: SupplierContact) => void;
  onClose: () => void;
}

function groupContacts(contacts: SupplierContact[]) {
  const groups = new Map<string, SupplierContact[]>();

  for (const contact of contacts) {
    const state = contact.state.trim().toUpperCase() || '—';
    const list = groups.get(state) ?? [];
    list.push(contact);
    groups.set(state, list);
  }

  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
}

export default function SupplierContactPickerModal({
  supplier,
  onSelect,
  onClose,
}: SupplierContactPickerModalProps) {
  const groups = groupContacts(supplier.contacts);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[min(85dvh,560px)] flex flex-col">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-800">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{supplier.legalName}</p>
            <p className="text-[10px] text-slate-500 mt-1">Escolha o contato por região</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-3 space-y-4">
          {groups.map(([state, contacts]) => (
            <div key={state}>
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-1 mb-2">
                {state === 'NA' ? 'Região não informada' : state}
              </p>
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => onSelect(contact)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors',
                      'bg-slate-950/60 border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-500/5',
                    )}
                  >
                    <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                      <MapPin size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-white truncate">
                        {formatContactLocation(contact.city, contact.state)}
                      </span>
                      <span className="block text-xs text-slate-500 font-mono mt-0.5">
                        WhatsApp disponível
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
