import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Linha pequena acima do título (ex.: "Novo material", "Editar veículo"). */
  eyebrow?: string;
  /** Botões fixos no rodapé (Cancelar / Salvar). */
  footer?: ReactNode;
  /** Largura no desktop; no celular o painel ocupa a tela toda. */
  size?: 'md' | 'lg';
  children: ReactNode;
}

/**
 * Painel lateral que desliza da direita: padrão dos formulários de cadastro e
 * edição. Fecha com Esc ou clique fora, e trava a rolagem da página por trás.
 */
export default function SidePanel({
  open,
  onClose,
  title,
  eyebrow,
  footer,
  size = 'md',
  children,
}: SidePanelProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Fechar painel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={cn(
              'fixed inset-y-0 right-0 z-50 w-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col',
              size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
            )}
          >
            <div className="shrink-0 flex items-start justify-between gap-3 p-5 border-b border-slate-800">
              <div className="min-w-0">
                {eyebrow && (
                  <p className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 mb-1">
                    {eyebrow}
                  </p>
                )}
                <h3 className="text-lg font-bold text-white truncate">{title}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">{children}</div>

            {footer && (
              <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4 border-t border-slate-800 bg-slate-900/95 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
