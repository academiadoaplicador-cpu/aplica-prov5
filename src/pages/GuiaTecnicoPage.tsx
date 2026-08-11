import { useState } from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/settings/PageHeader';
import GuiaTecnicoModal from '../components/GuiaTecnicoModal';
import { TECH_GUIDES, type GuideId } from '../data/guiaTecnico';
import { cn } from '../lib/utils';

export default function GuiaTecnicoPage() {
  const [selectedId, setSelectedId] = useState<GuideId | null>(null);
  const selectedGuide = TECH_GUIDES.find((guide) => guide.id === selectedId) ?? null;

  return (
    <div className="space-y-6 w-full pb-20">
      <PageHeader
        title="Guia Técnico de Aplicação"
        description="Selecione uma categoria abaixo para acessar o guia completo de ferramentas, higiene, processos e checklist de qualidade."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TECH_GUIDES.map((guide) => {
          const Icon = guide.icon;
          return (
            <div
              key={guide.id}
              className={cn(
                'p-5 rounded-2xl border flex flex-col h-full transition-colors',
                guide.border,
                guide.lightBg,
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-slate-900/50 flex items-center justify-center mb-4 border border-white/5">
                <Icon className={guide.colorClass} size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-4">{guide.cardTitle}</h3>
              <ul className="space-y-2 flex-1 mb-6 text-sm text-slate-300">
                {guide.cardItems.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 size={16} className={cn('shrink-0 mt-0.5', guide.colorClass)} />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setSelectedId(guide.id)}
                className="w-full mt-auto py-2.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <BookOpen size={14} /> Abrir Guia Técnico
              </button>
            </div>
          );
        })}
      </div>

      <GuiaTecnicoModal guide={selectedGuide} onClose={() => setSelectedId(null)} />
    </div>
  );
}
