import type { ReactNode } from 'react';
import { Box, CheckCircle2, Droplets, Eye, ThumbsUp, Wrench, X } from 'lucide-react';
import type { TechGuide } from '../data/guiaTecnico';
import { cn } from '../lib/utils';

interface GuiaTecnicoModalProps {
  guide: TechGuide | null;
  onClose: () => void;
}

function ChecklistColumn({
  icon,
  label,
  colorClass,
  bgClass,
  items,
}: {
  icon: ReactNode;
  label: string;
  colorClass: string;
  bgClass: string;
  items: string[];
}) {
  return (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
      <h4 className={cn('font-bold text-sm mb-3 flex items-center gap-2', colorClass)}>
        {icon} {label}
      </h4>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="text-xs text-slate-300 flex items-start gap-2">
            <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', bgClass)} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function GuiaTecnicoModal({ guide, onClose }: GuiaTecnicoModalProps) {
  if (!guide) return null;

  const Icon = guide.icon;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm overflow-y-auto">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div
        className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl my-8 flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guia-tecnico-modal-title"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-800/50 rounded-t-2xl sticky top-0 z-10 backdrop-blur">
          <div className="min-w-0">
            <h2
              id="guia-tecnico-modal-title"
              className="text-xl sm:text-2xl font-black text-white flex items-center gap-2"
            >
              <Icon className={guide.colorClass} />
              {guide.title}
            </h2>
            <p className="text-slate-400 text-sm mt-1">Passo a passo técnico profissional.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 md:p-8 pb-10 overflow-y-auto space-y-8">
          <section>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
              <span
                className={cn(
                  'text-slate-900 w-6 h-6 rounded flex items-center justify-center text-sm font-bold',
                  guide.bgClass,
                )}
              >
                1
              </span>
              Checklist Pré-Instalação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ChecklistColumn
                icon={<Wrench size={12} />}
                label="Ferramentas"
                colorClass={guide.colorClass}
                bgClass={guide.bgClass}
                items={guide.checklist.tools}
              />
              <ChecklistColumn
                icon={<Droplets size={12} />}
                label="Higiene"
                colorClass="text-emerald-400"
                bgClass="bg-emerald-500"
                items={guide.checklist.hygiene}
              />
              <ChecklistColumn
                icon={<Eye size={12} />}
                label="Inspeção"
                colorClass="text-orange-400"
                bgClass="bg-orange-500"
                items={guide.checklist.inspection}
              />
              <ChecklistColumn
                icon={<Box size={12} />}
                label="Material"
                colorClass="text-purple-400"
                bgClass="bg-purple-500"
                items={guide.checklist.material}
              />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
              <span
                className={cn(
                  'text-slate-900 w-6 h-6 rounded flex items-center justify-center text-sm font-bold',
                  guide.bgClass,
                )}
              >
                2
              </span>
              Execução do Serviço
            </h3>
            <div className="space-y-3">
              {guide.process.map((step, idx) => (
                <div
                  key={step.title}
                  className={cn(
                    'flex gap-4 p-4 bg-slate-800/30 rounded-xl border border-white/5 transition-colors group',
                    guide.hoverBorder,
                  )}
                >
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-sm font-bold transition-colors',
                        guide.colorClass,
                      )}
                    >
                      {idx + 1}
                    </div>
                    {idx < guide.process.length - 1 && (
                      <div className="w-0.5 flex-1 bg-slate-800 my-1" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">{step.title}</h4>
                    <p className="text-sm text-slate-400">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className={cn('border rounded-2xl p-6', guide.lightBg, guide.border)}>
              <h3
                className={cn(
                  'text-lg font-bold mb-4 flex items-center gap-2 uppercase tracking-wide',
                  guide.colorClass,
                )}
              >
                <ThumbsUp size={20} /> Checklist Final de Entrega
              </h3>
              <div className="space-y-3">
                {guide.final.map((item, idx) => (
                  <div
                    key={item}
                    className={cn(
                      'flex items-start gap-3 border-b pb-2',
                      guide.border,
                      idx === guide.final.length - 1 && 'border-0 pb-0',
                    )}
                  >
                    <div className={cn('p-1 rounded mt-0.5', guide.lightBg)}>
                      <CheckCircle2 size={12} className={guide.colorClass} />
                    </div>
                    <span className="text-sm text-slate-300 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
