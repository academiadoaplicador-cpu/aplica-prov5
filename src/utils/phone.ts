import { CountryDial, COUNTRY_PHONE_LIST, findCountryByDial } from '../constants/countries';

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Aplica máscara (# = dígito). */
export function applyPhoneMask(digits: string, mask: string): string {
  let result = '';
  let di = 0;
  for (const ch of mask) {
    if (di >= digits.length) break;
    if (ch === '#') {
      result += digits[di++];
    } else {
      result += ch;
    }
  }
  if (di < digits.length) result += digits.slice(di);
  return result;
}

export function formatBrazilPhone(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatNationalPhone(digits: string, country: CountryDial): string {
  const d = digits.replace(/\D/g, '');
  if (country.iso2 === 'BR') return formatBrazilPhone(d);
  if (country.mask) return applyPhoneMask(d, country.mask);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)} ${d.slice(10)}`.trim();
}

export function maxNationalDigits(country: CountryDial): number {
  if (country.iso2 === 'BR') return 11;
  if (country.mask) return (country.mask.match(/#/g) || []).length;
  return 15;
}

export function formatStoredPhone(countryCode: string, nationalDigits: string): string {
  const code = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  const national = digitsOnly(nationalDigits);
  if (!national) return '';
  return `${code}${national}`;
}

export function parseStoredPhone(
  stored: string,
  defaultCountry = '+55',
): { countryCode: string; national: string; formatted: string } {
  const trimmed = stored.trim();
  if (!trimmed) {
    return { countryCode: defaultCountry, national: '', formatted: '' };
  }

  const sorted = [...COUNTRY_PHONE_LIST].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    const dialDigits = c.dial.replace(/\D/g, '');
    const allDigits = digitsOnly(trimmed);
    if (allDigits.startsWith(dialDigits)) {
      const national = allDigits.slice(dialDigits.length);
      return {
        countryCode: c.dial,
        national,
        formatted: formatNationalPhone(national, c),
      };
    }
  }

  const country = findCountryByDial(defaultCountry) || COUNTRY_PHONE_LIST[0];
  const national = digitsOnly(trimmed);
  return {
    countryCode: country.dial,
    national,
    formatted: formatNationalPhone(national, country),
  };
}

export function isValidNationalPhone(country: CountryDial, nationalDigits: string): boolean {
  const d = digitsOnly(nationalDigits);
  if (country.iso2 === 'BR') return d.length >= 10 && d.length <= 11;
  const min = country.mask ? Math.min(6, (country.mask.match(/#/g) || []).length) : 6;
  return d.length >= min && d.length <= maxNationalDigits(country);
}
