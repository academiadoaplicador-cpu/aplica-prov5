import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { AreaOfExpertise } from '../../types';
import { ROUTES } from '../../routes/paths';
import { EXPERTISE_OPTIONS } from '../../constants/profile';
import { getPasswordValidationMessage } from '../../lib/password';
import { cn } from '../../lib/utils';

export default function AdminCreateUserPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNational, setPhoneNational] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [areasOfExpertise, setAreasOfExpertise] = useState<AreaOfExpertise[]>(['Veículos']);

  const toggleArea = (area: AreaOfExpertise) => {
    setAreasOfExpertise((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const passwordError = getPasswordValidationMessage(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (!businessName.trim() || !email.trim() || !fullName.trim() || !phoneNational.trim()) {
      setError('Preencha oficina, e-mail, senha, nome e telefone');
      return;
    }
    if (areasOfExpertise.length === 0) {
      setError('Selecione ao menos uma especialidade');
      return;
    }

    setLoading(true);
    try {
      const created = await adminService.createUser({
        businessName: businessName.trim(),
        email: email.trim(),
        password,
        profile: {
          fullName: fullName.trim(),
          phoneCountryCode: '+55',
          phoneNational: phoneNational.replace(/\D/g, ''),
          city: city.trim() || undefined,
          stateCode: stateCode.trim().toUpperCase() || undefined,
          areasOfExpertise,
          experienceYears: 1,
        },
      });
      navigate(ROUTES.admin.user(created.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        to={ROUTES.admin.users}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={16} />
        Voltar à lista
      </Link>

      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <UserPlus className="text-amber-400" size={22} />
          Cadastrar aplicador
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Criação manual pela administração. O usuário poderá completar o endereço no perfil depois.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-white">Conta</h4>
          <Field label="Nome da oficina" value={businessName} onChange={setBusinessName} />
          <Field label="E-mail" type="email" value={email} onChange={setEmail} />
          <Field
            label="Senha inicial"
            type="password"
            value={password}
            onChange={setPassword}
            hint="Mín. 8 caracteres, letra, número e caractere especial"
          />
        </section>

        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-white">Aplicador</h4>
          <Field label="Nome completo" value={fullName} onChange={setFullName} />
          <Field
            label="Telefone (com DDD)"
            value={phoneNational}
            onChange={setPhoneNational}
            placeholder="11999998888"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cidade (opcional)" value={city} onChange={setCity} />
            <Field label="UF (opcional)" value={stateCode} onChange={setStateCode} maxLength={2} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-500 mb-2">Especialidades</p>
            <div className="flex flex-wrap gap-2">
              {EXPERTISE_OPTIONS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleArea(area)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full border transition-colors',
                    areasOfExpertise.includes(area)
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'border-slate-700 text-slate-400 hover:border-slate-600',
                  )}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
        >
          {loading ? 'Criando...' : 'Criar conta'}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  hint,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="text-[10px] font-mono uppercase text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50"
      />
      {hint && <p className="text-[10px] text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}
