import { Save, CheckCircle2 } from 'lucide-react';

interface SettingsPageHeaderProps {
  title: string;
  description: string;
  onSave: () => void;
  isSaved: boolean;
  saveLabel?: string;
  savedLabel?: string;
}

export default function SettingsPageHeader({
  title,
  description,
  onSave,
  isSaved,
  saveLabel = 'Salvar alterações',
  savedLabel = 'Salvo com sucesso',
}: SettingsPageHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase">{title}</h2>
        <p className="text-slate-500 text-sm mt-1">{description}</p>
      </div>
      <button
        type="button"
        onClick={onSave}
        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/40 active:scale-95 group uppercase tracking-widest text-xs shrink-0"
      >
        {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} className="group-hover:rotate-12 transition-transform" />}
        {isSaved ? savedLabel : saveLabel}
      </button>
    </header>
  );
}
