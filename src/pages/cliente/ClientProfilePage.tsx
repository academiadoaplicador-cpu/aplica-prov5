import { useEffect, useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check, Loader2, MapPin, Search } from 'lucide-react';
import { ClientProfile, User } from '../../types';
import { clientService } from '../../services/clientService';
import { fetchAddressByCep } from '../../services/viaCep';
import { formatCepInput } from '../../types/address';
import { PhoneInput, phoneValueFromStored, isValidNationalPhone } from '../../components/PhoneInput';
import { COUNTRY_PHONE_LIST } from '../../constants/countries';
import { cn } from '../../lib/utils';

const inputClass =
  'w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-4 text-base sm:text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-600';
const labelClass = 'text-xs text-slate-500 mb-2 block font-mono';

export default function ClientProfilePage() {
  const { user } = useOutletContext<{ user: User }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState(() => phoneValueFromStored(''));
  const [cep, setCep] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [stateName, setStateName] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [street, setStreet] = useState('');
  const [region, setRegion] = useState('');
  const [ibge, setIbge] = useState('');

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  useEffect(() => {
    clientService
      .getProfile()
      .then((profile) => {
        if (!profile) return;
        setFullName(profile.fullName);
        setPhone(phoneValueFromStored(profile.phone, profile.phoneCountryCode));
        setCep(formatCepInput(profile.cep));
        setCity(profile.city);
        setStateCode(profile.stateCode);
        setStateName(profile.stateName || '');
        setNeighborhood(profile.neighborhood || '');
        setStreet(profile.street || '');
        setRegion(profile.region || '');
        setIbge(profile.ibge || '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar seus dados'))
      .finally(() => setLoading(false));
  }, []);

  const lookupCep = async () => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setCepError('Informe um CEP com 8 dígitos');
      return;
    }
    setCepLoading(true);
    setCepError('');
    try {
      const found = await fetchAddressByCep(digits);
      if (!found) {
        setCepError('CEP não encontrado');
        return;
      }
      setCity(found.city);
      setStateCode(found.stateCode);
      setStateName(found.stateName);
      setNeighborhood(found.neighborhood);
      setStreet(found.street);
      setRegion(found.region);
      setIbge(found.ibge);
    } catch {
      setCepError('Não foi possível consultar o CEP');
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);

    if (!fullName.trim()) {
      setError('Informe seu nome completo');
      return;
    }
    const country =
      COUNTRY_PHONE_LIST.find((c) => c.dial === phone.countryCode) || COUNTRY_PHONE_LIST[0];
    if (!isValidNationalPhone(country, phone.national)) {
      setError('Informe um telefone válido com DDD');
      return;
    }
    if (cep.replace(/\D/g, '').length !== 8) {
      setError('Informe um CEP válido (8 dígitos)');
      return;
    }
    if (!city.trim() || !stateCode.trim()) {
      setError('Busque seu CEP para preencher cidade e UF');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const profile: ClientProfile = {
        id: user.id,
        fullName: fullName.trim(),
        phone: phone.stored,
        phoneCountryCode: phone.countryCode,
        phoneNational: phone.national,
        cep: cep.replace(/\D/g, ''),
        city: city.trim(),
        stateCode: stateCode.trim().toUpperCase(),
        stateName,
        neighborhood,
        street,
        region,
        ibge,
      };
      await clientService.updateProfile(profile);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <p className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
          Área do Cliente
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Meus dados</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-lg">
          É com esses dados que o aplicador entra em contato depois de aceitar o seu pedido.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5"
      >
        <div>
          <label className={labelClass} htmlFor="profile-name">
            Nome completo
          </label>
          <input
            id="profile-name"
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setSaved(false);
            }}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>E-mail</label>
          <input
            type="email"
            value={user.email}
            readOnly
            className={cn(inputClass, 'opacity-60 cursor-not-allowed')}
          />
          <p className="mt-2 text-[11px] text-slate-600">
            O e-mail é seu login e não pode ser alterado por aqui.
          </p>
        </div>

        <div>
          <label className={labelClass}>Telefone</label>
          <PhoneInput
            value={phone}
            onChange={(v) => {
              setPhone(v);
              setSaved(false);
            }}
            inputClassName="h-11"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="profile-cep">
            CEP
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                id="profile-cep"
                type="text"
                inputMode="numeric"
                value={cep}
                onChange={(e) => {
                  setCep(formatCepInput(e.target.value));
                  setCepError('');
                  setSaved(false);
                }}
                onBlur={() => {
                  if (cep.replace(/\D/g, '').length === 8) void lookupCep();
                }}
                placeholder="00000-000"
                maxLength={9}
                className={cn(inputClass, 'pl-11')}
              />
            </div>
            <button
              type="button"
              onClick={() => void lookupCep()}
              disabled={cepLoading}
              className="shrink-0 h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
            >
              {cepLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Buscar
            </button>
          </div>
          {cepError && <p className="text-xs text-red-400 mt-2">{cepError}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="profile-city">
              Cidade
            </label>
            <input
              id="profile-city"
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="profile-uf">
              UF
            </label>
            <input
              id="profile-uf"
              type="text"
              value={stateCode}
              onChange={(e) => {
                setStateCode(e.target.value.toUpperCase().slice(0, 2));
                setSaved(false);
              }}
              maxLength={2}
              placeholder="PR"
              className={inputClass}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold tracking-wide transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-400">
              <Check size={16} />
              Salvo
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
