import { COUNTRY_PHONE_LIST, CountryDial } from '../constants/countries';
import {
  digitsOnly,
  formatNationalPhone,
  formatStoredPhone,
  isValidNationalPhone,
  maxNationalDigits,
  parseStoredPhone,
} from '../utils/phone';
import { cn } from '../lib/utils';

export interface PhoneInputValue {
  countryCode: string;
  national: string;
  formatted: string;
  stored: string;
}

interface PhoneInputProps {
  value: PhoneInputValue;
  onChange: (value: PhoneInputValue) => void;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

function toValue(country: CountryDial, nationalDigits: string): PhoneInputValue {
  const national = digitsOnly(nationalDigits).slice(0, maxNationalDigits(country));
  const formatted = formatNationalPhone(national, country);
  const stored = formatStoredPhone(country.dial, national);
  return { countryCode: country.dial, national, formatted, stored };
}

export function phoneValueFromStored(stored: string, countryCode?: string): PhoneInputValue {
  const parsed = parseStoredPhone(stored, countryCode || '+55');
  const country =
    COUNTRY_PHONE_LIST.find((c) => c.dial === parsed.countryCode) || COUNTRY_PHONE_LIST[0];
  return toValue(country, parsed.national);
}

export function PhoneInput({
  value,
  onChange,
  className,
  inputClassName,
  disabled,
}: PhoneInputProps) {
  const country =
    COUNTRY_PHONE_LIST.find((c) => c.dial === value.countryCode) || COUNTRY_PHONE_LIST[0];

  const handleCountry = (dial: string) => {
    const next = COUNTRY_PHONE_LIST.find((c) => c.dial === dial) || country;
    onChange(toValue(next, value.national));
  };

  const handleNational = (raw: string) => {
    onChange(toValue(country, raw));
  };

  return (
    <div className={cn('flex gap-2', className)}>
      <select
        value={value.countryCode}
        onChange={(e) => handleCountry(e.target.value)}
        disabled={disabled}
        className="w-[7.5rem] shrink-0 h-10 bg-slate-950 border border-slate-800 rounded-xl px-2 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        aria-label="Código do país"
      >
        {COUNTRY_PHONE_LIST.map((c) => (
          <option key={c.iso2} value={c.dial}>
            {c.flag} {c.dial}
          </option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        disabled={disabled}
        value={value.formatted}
        onChange={(e) => handleNational(e.target.value)}
        placeholder={country.iso2 === 'BR' ? '(41) 99999-9999' : 'Número com DDD'}
        className={cn(
          'flex-1 min-w-0 h-10 bg-slate-950 border border-slate-800 rounded-xl px-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-600',
          inputClassName,
        )}
      />
    </div>
  );
}

export { isValidNationalPhone };
