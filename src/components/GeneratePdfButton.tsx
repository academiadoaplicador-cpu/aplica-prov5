import { useState } from 'react';
import { FileDown, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface GeneratePdfButtonProps {
  onGenerate: () => Promise<void>;
  disabled?: boolean;
  label?: string;
  successLabel?: string;
  className?: string;
  size?: 'md' | 'sm';
}

export default function GeneratePdfButton({
  onGenerate,
  disabled = false,
  label = 'Gerar PDF',
  successLabel = 'PDF gerado!',
  className,
  size = 'md',
}: GeneratePdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (disabled || isGenerating) return;
    setIsGenerating(true);
    setJustGenerated(false);
    setError(null);
    try {
      await onGenerate();
      setJustGenerated(true);
      setTimeout(() => setJustGenerated(false), 2200);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Não foi possível gerar o PDF. Tente novamente.';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const isSm = size === 'sm';

  return (
    <div className={cn('space-y-2', className)}>
    <motion.button
      type="button"
      disabled={disabled || isGenerating}
      onClick={handleClick}
      whileHover={disabled || isGenerating ? undefined : { scale: 1.02, y: -1 }}
      whileTap={disabled || isGenerating ? undefined : { scale: 0.98 }}
      animate={
        isGenerating
          ? { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)' }
          : justGenerated
            ? { boxShadow: '0 0 24px 4px rgba(16, 185, 129, 0.35)' }
            : { boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)' }
      }
      transition={{ duration: 0.25 }}
      className={cn(
        'relative w-full font-black rounded-xl flex items-center justify-center gap-2 uppercase tracking-wider overflow-hidden transition-colors',
        'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100',
        isSm ? 'py-3 text-xs' : 'py-4 text-xs',
        justGenerated
          ? 'bg-emerald-500 text-white'
          : 'bg-white text-slate-950 hover:bg-slate-100',
      )}
    >
      {isGenerating && (
        <motion.span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-200/40 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
          aria-hidden
        />
      )}

      {isGenerating ? (
        <Loader2 size={isSm ? 18 : 20} className="animate-spin shrink-0" />
      ) : justGenerated ? (
        <CheckCircle2 size={isSm ? 18 : 20} className="shrink-0" />
      ) : (
        <FileDown size={isSm ? 18 : 20} className="shrink-0" />
      )}

      <span className="relative z-10">
        {isGenerating ? 'Gerando PDF...' : justGenerated ? successLabel : label}
      </span>
    </motion.button>
    {error && (
      <p className="text-[10px] text-red-400 text-center leading-snug px-1" role="alert">
        {error}
      </p>
    )}
    </div>
  );
}
