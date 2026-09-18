import { useNavigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { ArrowRight, Car, Sparkles, Wrench } from 'lucide-react';
import { motion } from 'motion/react';
import BrandLogo from '../components/BrandLogo';
import { ROUTES } from '../routes/paths';
import { cn } from '../lib/utils';

/**
 * Porta de entrada de quem não tem sessão. As duas áreas têm cadastro, dados e
 * navegação próprios, então a escolha vem antes do formulário — e a cor de cada
 * cartão é a mesma que a pessoa vai encontrar depois de entrar.
 */
export default function ChooseRolePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="w-full max-w-3xl">
        <div className="flex flex-col items-center text-center">
          <BrandLogo className="mb-5" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
            Como você quer entrar?
          </h1>
          <p className="mt-3 text-sm text-slate-500 max-w-md">
            Selecione o seu perfil de acesso para continuar.
          </p>
        </div>

        <div className="mt-9 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RoleCard
            accent="emerald"
            icon={<Car size={24} />}
            title="Sou cliente"
            description="Quero envelopar meu carro, móvel ou eletro e encontrar um profissional perto de mim."
            action="Entrar como cliente"
            delay={0}
            onClick={() => navigate(ROUTES.client.login)}
          />
          <RoleCard
            accent="indigo"
            icon={<Wrench size={24} />}
            title="Sou aplicador"
            description="Tenho uma oficina e quero orçar serviços, gerenciar meu catálogo e receber pedidos."
            action="Entrar como aplicador"
            delay={0.06}
            onClick={() => navigate(ROUTES.login)}
          />
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-slate-600">
          <Sparkles size={13} className="shrink-0" />
          Ainda não tem conta? Escolha o seu perfil acima — dá para se cadastrar na
          mesma tela.
        </p>
      </div>
    </div>
  );
}

const ACCENT = {
  emerald: {
    ring: 'hover:border-emerald-600/40 focus-visible:ring-emerald-500',
    glow: 'bg-emerald-600/10 border-emerald-600/25 text-emerald-400',
    title: 'group-hover:text-emerald-300',
    action: 'text-emerald-400',
  },
  indigo: {
    ring: 'hover:border-indigo-600/40 focus-visible:ring-indigo-500',
    glow: 'bg-indigo-600/10 border-indigo-600/25 text-indigo-400',
    title: 'group-hover:text-indigo-300',
    action: 'text-indigo-400',
  },
} as const;

function RoleCard({
  accent,
  icon,
  title,
  description,
  action,
  onClick,
  delay,
}: {
  accent: keyof typeof ACCENT;
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
  delay: number;
}) {
  const style = ACCENT[accent];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        'group text-left rounded-2xl border border-slate-800/90 bg-slate-900/60 backdrop-blur-xl',
        'p-6 sm:p-7 transition-colors duration-200 shadow-xl shadow-black/30',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        style.ring,
      )}
    >
      <span
        className={cn(
          'grid place-items-center w-12 h-12 rounded-xl border transition-colors',
          style.glow,
        )}
      >
        {icon}
      </span>

      <h2
        className={cn(
          'mt-5 text-lg font-bold tracking-tight text-white transition-colors',
          style.title,
        )}
      >
        {title}
      </h2>
      <p className="mt-2 text-sm text-slate-500 leading-relaxed">{description}</p>

      <span
        className={cn(
          'mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider',
          style.action,
        )}
      >
        {action}
        <ArrowRight
          size={14}
          className="transition-transform duration-200 group-hover:translate-x-1"
        />
      </span>
    </motion.button>
  );
}
