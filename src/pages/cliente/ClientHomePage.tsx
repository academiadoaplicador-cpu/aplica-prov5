import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, ClipboardList, MapPin, Sparkles } from 'lucide-react';
import { ClientProfile, User } from '../../types';
import { ROUTES } from '../../routes/paths';
import { clientService } from '../../services/clientService';
import { formatCepInput } from '../../types/address';

export default function ClientHomePage() {
  const { user } = useOutletContext<{ user: User }>();
  const [profile, setProfile] = useState<ClientProfile | null>(null);

  useEffect(() => {
    clientService
      .getProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  const firstName = user.businessName.trim().split(/\s+/)[0] || 'tudo bem';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <p className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
          Área do Cliente
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Olá, {firstName}</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-lg">
          Aqui você pede um orçamento de aplicação e acompanha o andamento com o profissional
          que aceitar o serviço.
        </p>
      </header>

      <section className="rounded-2xl border border-emerald-600/20 bg-emerald-600/5 p-6">
        <div className="flex items-start gap-4">
          <span className="shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-emerald-600/15 text-emerald-400">
            <Sparkles size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">Pedir um orçamento</h2>
            <p className="mt-1 text-sm text-slate-400">
              Você descreve o que quer aplicar, recebe uma faixa de preço na hora e aplicadores
              verificados da sua região são avisados.
            </p>
            <Link
              to={ROUTES.client.newRequest}
              className="mt-4 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
            >
              Começar
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to={ROUTES.client.orders}
          className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-colors hover:border-slate-700"
        >
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-slate-800 text-slate-400">
            <ClipboardList size={18} />
          </span>
          <h3 className="mt-3 text-sm font-bold text-white flex items-center gap-1.5">
            Meus pedidos
            <ArrowRight
              size={14}
              className="text-slate-600 transition-transform group-hover:translate-x-0.5"
            />
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Histórico e status de cada solicitação.
          </p>
        </Link>

        <Link
          to={ROUTES.client.profile}
          className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-colors hover:border-slate-700"
        >
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-slate-800 text-slate-400">
            <MapPin size={18} />
          </span>
          <h3 className="mt-3 text-sm font-bold text-white flex items-center gap-1.5">
            Sua região
            <ArrowRight
              size={14}
              className="text-slate-600 transition-transform group-hover:translate-x-0.5"
            />
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {profile?.city
              ? `${profile.city}/${profile.stateCode}${profile.cep ? ` — CEP ${formatCepInput(profile.cep)}` : ''}`
              : 'Confirme seu CEP para encontrarmos aplicadores perto de você.'}
          </p>
        </Link>
      </div>
    </div>
  );
}
