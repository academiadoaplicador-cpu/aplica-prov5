import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes/paths';
import {
  Mail,
  Lock,
  Building,
  User,
  Briefcase,
  Camera,
  Upload,
  FileCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Car,
  Home,
  Monitor,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType, AreaOfExpertise } from '../types';
import { RegisterPayload } from '../types/auth';
import { databaseService } from '../services/databaseService';
import { EXPERTISE_OPTIONS } from '../constants/profile';
import { cn } from '../lib/utils';
import BrandLogo from './BrandLogo';
import { AddressFields } from './AddressFields';
import { PhoneInput, phoneValueFromStored, isValidNationalPhone } from './PhoneInput';
import { emptyApplicatorAddress, buildAddressSummary, ApplicatorAddress } from '../types/address';
import { COUNTRY_PHONE_LIST } from '../constants/countries';

interface AuthPageProps {
  onLogin: (user: UserType) => void;
}

const inputClass =
  'w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-base sm:text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-600';
const inputWithIconClass = `${inputClass} pl-11`;

const EXPERTISE_ICONS: Record<AreaOfExpertise, React.ReactNode> = {
  'Superfície Plana': <Layers size={14} />,
  Veículos: <Car size={14} />,
  'Móveis e Eletros': <Home size={14} />,
  'Comunicação Visual': <Monitor size={14} />,
  PPF: <Shield size={14} />,
};

const REGISTER_STEPS = [
  { title: 'Conta da oficina', subtitle: 'Empresa e acesso' },
  { title: 'Dados do aplicador', subtitle: 'Identificação profissional' },
  { title: 'Perfil profissional', subtitle: 'Especialidades e documentos' },
];

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();

  const handleAuthenticated = (user: UserType) => {
    onLogin(user);
    navigate(ROUTES.dashboard, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        className={cn('w-full mx-4 sm:mx-auto', mode === 'register' ? 'sm:max-w-lg' : 'sm:max-w-md')}
        layout
      >
        <AuthHeader />

        <div className="flex gap-2 mb-6 p-1 bg-slate-900/80 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all',
              mode === 'login'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200',
            )}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all',
              mode === 'register'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                : 'text-slate-400 hover:text-slate-200',
            )}
          >
            Criar conta
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'login' ? (
            <LoginForm key="login" onLogin={handleAuthenticated} onGoRegister={() => setMode('register')} />
          ) : (
            <RegisterWizard key="register" onLogin={handleAuthenticated} onGoLogin={() => setMode('login')} />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function AuthHeader() {
  return (
    <div className="text-center mb-8">
      <BrandLogo src="/login.png" className="h-10 sm:max-h-28 w-full max-w-xs mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-white tracking-tight">APLICA PRO</h1>
      <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-[0.25em] mt-1">
        A evolução do aplicador
      </p>
      <p className="text-slate-500 text-sm mt-3">Gestão profissional para envelopadores</p>
    </div>
  );
}

function LoginForm({
  onLogin,
  onGoRegister,
}: {
  onLogin: (user: UserType) => void;
  onGoRegister: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await databaseService.login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      onSubmit={handleSubmit}
      className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-5 w-full"
    >
      {error && <ErrorBanner message={error} />}

      <Field label="E-mail">
        <div className="relative">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className={inputWithIconClass}
          />
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        </div>
      </Field>

      <Field label="Senha">
        <div className="relative">
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputWithIconClass}
          />
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        </div>
      </Field>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-900/20 transition-all font-mono tracking-wider"
      >
        {loading ? 'ENTRANDO...' : 'ACESSAR PAINEL'}
      </button>

      <p className="text-center text-sm text-slate-500">
        Não tem conta?{' '}
        <button type="button" onClick={onGoRegister} className="text-indigo-400 hover:text-indigo-300 font-medium">
          Cadastre-se
        </button>
      </p>
    </motion.form>
  );
}

function RegisterWizard({
  onLogin,
  onGoLogin,
}: {
  onLogin: (user: UserType) => void;
  onGoLogin: () => void;
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState(() => phoneValueFromStored(''));
  const [address, setAddress] = useState<ApplicatorAddress>(emptyApplicatorAddress);
  const [experienceYears, setExperienceYears] = useState(1);

  const [areasOfExpertise, setAreasOfExpertise] = useState<AreaOfExpertise[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [documentsUrls, setDocumentsUrls] = useState<string[]>([]);

  const photoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const toggleExpertise = (area: AreaOfExpertise) => {
    setAreasOfExpertise((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  };

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!businessName.trim()) return 'Informe o nome da empresa';
      if (!email.trim()) return 'Informe o e-mail';
      if (password.length < 6) return 'A senha deve ter no mínimo 6 caracteres';
      if (password !== confirmPassword) return 'As senhas não coincidem';
    }
    if (step === 2) {
      if (!fullName.trim()) return 'Informe seu nome completo';
      const country = COUNTRY_PHONE_LIST.find((c) => c.dial === phone.countryCode) || COUNTRY_PHONE_LIST[0];
      if (!isValidNationalPhone(country, phone.national)) return 'Informe um telefone válido com DDD';
      if (address.cep.replace(/\D/g, '').length !== 8) return 'Informe um CEP válido';
      if (!address.street.trim()) return 'Informe a rua / logradouro';
      if (!address.addressNumber.trim()) return 'Informe o número do endereço';
      if (!address.neighborhood.trim()) return 'Informe o bairro';
      if (!address.city.trim()) return 'Informe a cidade';
      if (!address.stateCode.trim()) return 'Informe a UF';
    }
    if (step === 3) {
      if (areasOfExpertise.length === 0) return 'Selecione ao menos uma especialidade';
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep((s) => Math.min(3, s + 1));
  };

  const prevStep = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDocs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setDocumentsUrls((prev) => [...prev, ...Array.from(files).map((f) => f.name)]);
  };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError('');

    const payload: RegisterPayload = {
      businessName: businessName.trim(),
      email: email.trim(),
      password,
      profile: {
        fullName: fullName.trim(),
        phone: phone.stored,
        phoneCountryCode: phone.countryCode,
        phoneNational: phone.national,
        address: buildAddressSummary(address),
        ...address,
        experienceYears,
        areasOfExpertise,
        photoUrl: photoUrl || undefined,
        documentsUrls,
      },
    };

    try {
      const user = await databaseService.register(payload);
      onLogin(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6"
    >
      <div className="space-y-3">
        <div className="flex justify-between gap-2">
          {REGISTER_STEPS.map((s, i) => (
            <div key={s.title} className="flex-1">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-colors',
                  i + 1 <= step ? 'bg-indigo-500' : 'bg-slate-800',
                )}
              />
              <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase hidden sm:block">
                {s.title}
              </p>
            </div>
          ))}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{REGISTER_STEPS[step - 1].title}</h2>
          <p className="text-sm text-slate-400">{REGISTER_STEPS[step - 1].subtitle}</p>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="s1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <Field label="Nome da empresa / oficina">
              <div className="relative">
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ex: Prime Wrap Studios"
                  className={inputWithIconClass}
                />
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              </div>
            </Field>
            <Field label="E-mail profissional">
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={inputWithIconClass}
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              </div>
            </Field>
            <Field label="Senha">
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inputWithIconClass}
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              </div>
            </Field>
            <Field label="Confirmar senha">
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className={inputWithIconClass}
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              </div>
            </Field>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="s2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <Field label="Nome completo do aplicador">
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className={inputWithIconClass}
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              </div>
            </Field>
            <Field label="Telefone (com código do país)">
              <PhoneInput value={phone} onChange={setPhone} />
            </Field>
            <Field label="Anos de experiência">
              <input
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => setExperienceYears(parseInt(e.target.value, 10) || 0)}
                className={inputClass}
              />
            </Field>
            <Field label="Endereço (uso interno da rede)">
              <AddressFields value={address} onChange={setAddress} />
            </Field>
            <p className="text-[10px] text-slate-600 italic">
              Busque pelo CEP para preencher rua, bairro, cidade e estado automaticamente.
            </p>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="s3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <Field label="Áreas de especialidade">
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                {EXPERTISE_OPTIONS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleExpertise(area)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-all',
                      areasOfExpertise.includes(area)
                        ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-200'
                        : 'bg-slate-950/50 border-slate-800 text-slate-500',
                    )}
                  >
                    <span className="text-indigo-400">{EXPERTISE_ICONS[area]}</span>
                    <span className="flex-1 font-medium">{area}</span>
                    {areasOfExpertise.includes(area) && (
                      <CheckCircle2 size={16} className="text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            </Field>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="flex-1 flex flex-col items-center gap-2 p-4 border border-dashed border-slate-700 rounded-xl hover:border-indigo-500/50 transition-colors"
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
                ) : (
                  <Camera className="text-indigo-400" size={24} />
                )}
                <span className="text-xs text-slate-400">Foto (opcional)</span>
              </button>
              <button
                type="button"
                onClick={() => docRef.current?.click()}
                className="flex-1 flex flex-col items-center gap-2 p-4 border border-dashed border-slate-700 rounded-xl hover:border-indigo-500/50 transition-colors"
              >
                <Upload className="text-indigo-400" size={24} />
                <span className="text-xs text-slate-400">
                  Documentos {documentsUrls.length > 0 ? `(${documentsUrls.length})` : '(opcional)'}
                </span>
              </button>
            </div>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            <input ref={docRef} type="file" multiple className="hidden" onChange={handleDocs} />

            {documentsUrls.length > 0 && (
              <ul className="space-y-1">
                {documentsUrls.map((doc, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-950 px-3 py-2 rounded-lg border border-slate-800"
                  >
                    <FileCheck size={12} className="text-indigo-500 shrink-0" />
                    <span className="truncate">{doc}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-sm text-slate-400 space-y-1">
              <p className="font-medium text-white">{businessName || 'Sua oficina'}</p>
              <p className="flex items-center gap-2">
                <Briefcase size={12} className="text-indigo-400" />
                {fullName || 'Aplicador'} · {experienceYears} ano(s)
              </p>
              <p>{areasOfExpertise.length} especialidade(s) selecionada(s)</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3 pt-2">
        {step > 1 && (
          <button
            type="button"
            onClick={prevStep}
            className="flex items-center justify-center gap-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft size={18} />
            Voltar
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            onClick={nextStep}
            className="flex-1 flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Continuar
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all font-mono tracking-wider"
          >
            {loading ? 'CRIANDO CONTA...' : 'FINALIZAR CADASTRO'}
          </button>
        )}
      </div>

      <p className="text-center text-sm text-slate-500">
        Já tem conta?{' '}
        <button type="button" onClick={onGoLogin} className="text-indigo-400 hover:text-indigo-300 font-medium">
          Entrar
        </button>
      </p>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300 ml-1">{label}</label>
      {children}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
      {message}
    </p>
  );
}
