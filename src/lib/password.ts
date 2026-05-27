export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const HAS_LETTER = /[A-Za-zÀ-ÿ]/;
const HAS_NUMBER = /\d/;
const HAS_SPECIAL = /[!@#$%^&*()_+\-=\[\]{};:'",.<>/?\\|`~]/;

export interface PasswordRequirements {
  minLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  notTooLong: boolean;
}

export function checkPasswordRequirements(password: string): PasswordRequirements {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasLetter: HAS_LETTER.test(password),
    hasNumber: HAS_NUMBER.test(password),
    hasSpecial: HAS_SPECIAL.test(password),
    notTooLong: password.length <= PASSWORD_MAX_LENGTH,
  };
}

export function isStrongPassword(password: string): boolean {
  const r = checkPasswordRequirements(password);
  return r.minLength && r.hasLetter && r.hasNumber && r.hasSpecial && r.notTooLong;
}

export function getPasswordValidationMessage(password: string): string | null {
  if (!password) return 'Informe a senha';
  const r = checkPasswordRequirements(password);
  if (!r.notTooLong) return `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres`;
  if (!r.minLength) return `A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres`;
  if (!r.hasLetter) return 'A senha deve conter ao menos uma letra';
  if (!r.hasNumber) return 'A senha deve conter ao menos um número';
  if (!r.hasSpecial) return 'A senha deve conter ao menos um caractere especial (ex.: ! @ # $ %)';
  return null;
}

export const PASSWORD_RULES: ReadonlyArray<{
  id: keyof PasswordRequirements;
  label: string;
}> = [
  { id: 'minLength', label: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres` },
  { id: 'hasLetter', label: 'Contém letra' },
  { id: 'hasNumber', label: 'Contém número' },
  { id: 'hasSpecial', label: 'Contém caractere especial' },
];
