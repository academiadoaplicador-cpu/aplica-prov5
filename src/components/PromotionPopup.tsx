import { X } from 'lucide-react';
import { Promotion } from '../types';

const STORAGE_KEY_PREFIX = 'aplica_pro_promotion_shown';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Chave por usuário — evita que a marca de "já visto hoje" de uma conta
 *  (ex: admin testando) esconda o pop-up de outra conta no mesmo navegador. */
function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}_${userId}`;
}

export function alreadyShownToday(userId: string): boolean {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return false;
    const { shownDate } = JSON.parse(raw) as { shownDate?: string };
    return shownDate === todayKey();
  } catch {
    return false;
  }
}

export function markShownToday(userId: string): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify({ shownDate: todayKey() }));
  } catch {
    /* localStorage indisponível (modo privado) — degrada para sempre mostrar */
  }
}

interface PromotionPopupProps {
  promotion: Promotion;
  onClose: () => void;
}

export default function PromotionPopup({ promotion, onClose }: PromotionPopupProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-lg bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[min(90dvh,640px)] flex flex-col">
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-slate-950/60 text-white hover:bg-slate-950/80 transition-colors"
        >
          <X size={16} />
        </button>

        <img
          src={promotion.bannerDesktopUrl}
          alt={promotion.title}
          className="hidden md:block w-full h-56 object-cover shrink-0"
        />
        <img
          src={promotion.bannerMobileUrl}
          alt={promotion.title}
          className="md:hidden w-full h-64 object-cover shrink-0"
        />

        <div className="p-5 space-y-3 overflow-y-auto min-h-0">
          <h3 className="text-lg font-bold text-white">{promotion.title}</h3>
          {promotion.description && (
            <p className="text-sm text-slate-400">{promotion.description}</p>
          )}
          {promotion.ctaLabel && promotion.ctaUrl && (
            <a
              href={promotion.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
            >
              {promotion.ctaLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
