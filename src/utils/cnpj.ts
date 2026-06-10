export function digitsOnlyCnpj(value: string): string {
  return value.replace(/\D/g, '').slice(0, 14);
}

export function formatCnpj(value: string): string {
  const digits = digitsOnlyCnpj(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function allSameDigits(digits: string): boolean {
  return digits.split('').every((d) => d === digits[0]);
}

export function isValidCnpj(value: string): boolean {
  const digits = digitsOnlyCnpj(value);
  if (digits.length !== 14 || allSameDigits(digits)) return false;

  const calcDigit = (base: string, factors: number[]) => {
    const sum = base.split('').reduce((acc, char, index) => {
      return acc + Number(char) * factors[index];
    }, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstFactors = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondFactors = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const firstDigit = calcDigit(digits.slice(0, 12), firstFactors);
  if (firstDigit !== Number(digits[12])) return false;

  const secondDigit = calcDigit(digits.slice(0, 13), secondFactors);
  return secondDigit === Number(digits[13]);
}
