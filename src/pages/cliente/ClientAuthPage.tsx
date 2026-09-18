import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, Mail, MapPin, Search, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../../types';
import { ROUTES } from '../../routes/paths';
import { databaseService } from '../../services/databaseService';
import { clientService } from '../../services/clientService';
import { fetchAddressByCep } from '../../services/viaCep';
import { formatCepInput } from '../../types/address';
import { getEmailValidationMessage, normalizeEmail } from '../../lib/email';
import {
  checkPasswordRequirements,
  getPasswordValidationMessage,
  PASSWORD_RULES,
} from '../../lib/password';
import { PhoneInput, phoneValueFromStored, isValidNationalPhone } from '../../components/PhoneInput';
import { COUNTRY_PHONE_LIST } from '../../constants/countries';
import BrandLogo from '../../components/BrandLogo';
import { cn } from '../../lib/utils';

const inputClass =
  'w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-4 text-base sm:text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-600';
const inputWithIconClass = `${inputClass} pl-11`;
const labelClass = 'text-xs text-slate-500 mb-2 block font-mono';

const authTransition = { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as const };

interface ClientAuthPageProps {
  onLogin: (user: User) => void;
}

export default function ClientAuthPage({ onLogin }: ClientAuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();

  const handleAuthenticated = (user: User) => {
    onLogin(user);
    navigate(ROUTES.client.home, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <BrandLogo variant="compact" className="mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-xs">
            {mode === 'login'
              ? 'Acompanhe seus pedidos de aplicação e encontre um profissional perto de você.'
              : 'Leva menos de um minuto. Depois é só pedir um orçamento.'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 backdrop-blur-xl shadow-2xl shadow-black/50 p-6 sm:p-7">
          <div className="flex p-1 rounded-xl bg-slate-950 border border-slate-800 mb-6">
            <ModeTab active={mode === 'login'} onClick={() => setMode('login')} label="Entrar" />
            <ModeTab
              active={mode === 'register'}
              onClick={() => setMode('register')}
              label="Criar conta"
            />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {mode === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={authTransition}
              >
                <ClientLoginForm onAuthenticated={handleAuthenticated} />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={authTransition}
              >
                <ClientRegisterForm onAuthenticated={handleAuthenticated} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          É um aplicador profissional?{' '}
          <button
            type="button"
            onClick={() => navigate(ROUTES.login)}
            className="text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Acessar a área da oficina
          </button>
        </p>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 h-9 rounded-lg text-sm font-medium transition-colors',
        active ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200',
      )}
    >
      {label}
    </button>
  );
}

function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
      {message}
    </p>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold tracking-wide transition-colors flex items-center justify-center gap-2"
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {loading ? 'Aguarde...' : label}
    </button>
  );
}

function ClientLoginForm({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const emailError = getEmailValidationMessage(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await databaseService.login(normalizeEmail(email), password);
      if (user.role !== 'client') {
        await databaseService.logout();
        setError('Esta conta é de aplicador. Use a área da oficina para entrar.');
        return;
      }
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="client-login-email">
          E-mail
        </label>
        <div className="relative">
          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            id="client-login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className={inputWithIconClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="client-login-password">
          Senha
        </label>
        <div className="relative">
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            id="client-login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputWithIconClass}
          />
        </div>
      </div>

      <FormError message={error} />
      <SubmitButton loading={loading} label="Entrar" />
    </form>
  );
}

interface CepLocation {
  city: string;
  stateCode: string;
  stateName: string;
  neighborhood: string;
  street: string;
  region: string;
  ibge: string;
}

function ClientRegisterForm({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(() => phoneValueFromStored(''));
  const [cep, setCep] = useState('');
  const [location, setLocation] = useState<CepLocation | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordChecks = checkPasswordRequirements(password);

  const lookupCep = async (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) {
      setCepError('Informe um CEP com 8 dígitos');
      setLocation(null);
      return;
    }
    setCepLoading(true);
    setCepError('');
    try {
      const found = await fetchAddressByCep(digits);
      if (!found) {
        setCepError('CEP não encontrado');
        setLocation(null);
        return;
      }
      setLocation({
        city: found.city,
        stateCode: found.stateCode,
        stateName: found.stateName,
        neighborhood: found.neighborhood,
        street: found.street,
        region: found.region,
        ibge: found.ibge,
      });
    } catch {
      setCepError('Não foi possível consultar o CEP');
      setLocation(null);
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError('Informe seu nome completo');
      return;
    }
    const emailError = getEmailValidationMessage(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    const passwordError = getPasswordValidationMessage(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    const country =
      COUNTRY_PHONE_LIST.find((c) => c.dial === phone.countryCode) || COUNTRY_PHONE_LIST[0];
    if (!isValidNationalPhone(country, phone.national)) {
      setError('Informe um telefone válido com DDD');
      return;
    }
    if (!location?.city || !location?.stateCode) {
      setError('Busque seu CEP para confirmarmos sua cidade');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = await clientService.register({
        email: normalizeEmail(email),
        password,
        profile: {
          fullName: fullName.trim(),
          phoneCountryCode: phone.countryCode,
          phoneNational: phone.national,
          cep: cep.replace(/\D/g, ''),
          city: location.city,
          stateCode: location.stateCode,
          stateName: location.stateName,
          neighborhood: location.neighborhood,
          street: location.street,
          region: location.region,
          ibge: location.ibge,
        },
      });
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="client-name">
          Nome completo
        </label>
        <div className="relative">
          <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            id="client-name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Como podemos te chamar"
            className={inputWithIconClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="client-email">
          E-mail
        </label>
        <div className="relative">
          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            id="client-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className={inputWithIconClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="client-password">
          Senha
        </label>
        <div className="relative">
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            id="client-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputWithIconClass}
          />
        </div>
        {password && (
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {PASSWORD_RULES.map((rule) => (
              <li
                key={rule.id}
                className={cn(
                  'text-[11px] font-mono',
                  passwordChecks[rule.id] ? 'text-emerald-400' : 'text-slate-600',
                )}
              >
                {passwordChecks[rule.id] ? '✓' : '·'} {rule.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className={labelClass}>Telefone</label>
        <PhoneInput value={phone} onChange={setPhone} inputClassName="h-11" />
      </div>

      <div>
        <label className={labelClass} htmlFor="client-cep">
          CEP
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              id="client-cep"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              value={cep}
              onChange={(e) => {
                setCep(formatCepInput(e.target.value));
                setCepError('');
                setLocation(null);
              }}
              onBlur={() => {
                if (cep.replace(/\D/g, '').length === 8) void lookupCep(cep);
              }}
              placeholder="00000-000"
              maxLength={9}
              className={inputWithIconClass}
            />
          </div>
          <button
            type="button"
            onClick={() => void lookupCep(cep)}
            disabled={cepLoading}
            className="shrink-0 h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
          >
            {cepLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Buscar
          </button>
        </div>
        {cepError && <p className="text-xs text-red-400 mt-2">{cepError}</p>}
        {location && (
          <p className="text-xs text-emerald-400 mt-2">
            {location.neighborhood ? `${location.neighborhood} — ` : ''}
            {location.city}/{location.stateCode}
          </p>
        )}
        <p className="text-[11px] text-slate-600 mt-2">
          Usamos seu CEP só para encontrar aplicadores perto de você.
        </p>
      </div>

      <FormError message={error} />
      <SubmitButton loading={loading} label="Criar conta" />
    </form>
  );
}
