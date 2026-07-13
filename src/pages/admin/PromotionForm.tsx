import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Promotion, PromotionInput } from '../../types';
import { compressImageFile } from '../../lib/compressImage';
import { cn } from '../../lib/utils';

export interface PromotionFormValues {
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  bannerDesktopUrl: string;
  bannerMobileUrl: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export function emptyPromotionFormValues(): PromotionFormValues {
  return {
    title: '',
    description: '',
    ctaLabel: '',
    ctaUrl: '',
    bannerDesktopUrl: '',
    bannerMobileUrl: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
  };
}

function isoToDateInput(iso?: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function promotionFormValuesFromPromotion(promotion: Promotion): PromotionFormValues {
  return {
    title: promotion.title,
    description: promotion.description ?? '',
    ctaLabel: promotion.ctaLabel ?? '',
    ctaUrl: promotion.ctaUrl ?? '',
    bannerDesktopUrl: promotion.bannerDesktopUrl,
    bannerMobileUrl: promotion.bannerMobileUrl,
    startsAt: isoToDateInput(promotion.startsAt),
    endsAt: isoToDateInput(promotion.endsAt),
    isActive: promotion.isActive,
  };
}

export function validatePromotionForm(values: PromotionFormValues): string | null {
  if (!values.title.trim()) return 'Título é obrigatório';
  if (!values.bannerDesktopUrl) return 'Banner para desktop é obrigatório';
  if (!values.bannerMobileUrl) return 'Banner para celular é obrigatório';
  if (values.ctaUrl.trim()) {
    try {
      new URL(values.ctaUrl.trim());
    } catch {
      return 'Link do botão inválido (use uma URL completa, ex: https://...)';
    }
  }
  if (values.startsAt && values.endsAt && values.endsAt < values.startsAt) {
    return 'Data de término deve ser depois da data de início';
  }
  return null;
}

export function promotionPayloadFromValues(values: PromotionFormValues): PromotionInput {
  return {
    title: values.title.trim(),
    description: values.description.trim() || undefined,
    ctaLabel: values.ctaLabel.trim() || undefined,
    ctaUrl: values.ctaUrl.trim() || undefined,
    bannerDesktopUrl: values.bannerDesktopUrl,
    bannerMobileUrl: values.bannerMobileUrl,
    startsAt: values.startsAt ? new Date(`${values.startsAt}T00:00:00`).toISOString() : null,
    endsAt: values.endsAt ? new Date(`${values.endsAt}T23:59:59`).toISOString() : null,
    isActive: values.isActive,
  };
}

interface PromotionFormProps {
  values: PromotionFormValues;
  onChange: (values: PromotionFormValues) => void;
}

export default function PromotionForm({ values, onChange }: PromotionFormProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<'desktop' | 'mobile' | null>(null);

  const set = <K extends keyof PromotionFormValues>(key: K, value: PromotionFormValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  const handleBannerUpload = async (
    field: 'bannerDesktopUrl' | 'bannerMobileUrl',
    uploadKey: 'desktop' | 'mobile',
    file: File,
    options: { maxWidth: number; maxHeight: number; maxBytes: number },
  ) => {
    setUploadError(null);
    setUploadingField(uploadKey);
    try {
      const compressed = await compressImageFile(file, options);
      set(field, compressed);
    } catch {
      setUploadError('Não foi possível usar esta imagem. Tente um arquivo menor (JPG ou PNG).');
    } finally {
      setUploadingField(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Título *</label>
        <input
          type="text"
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Ex: Black Friday - 20% OFF em envelopamento"
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Descrição</label>
        <textarea
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          placeholder="Texto curto sobre a oferta"
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BannerUploadField
          label="Banner desktop"
          hint="Recomendado 1200×628px"
          value={values.bannerDesktopUrl}
          uploading={uploadingField === 'desktop'}
          onUpload={(file) =>
            handleBannerUpload('bannerDesktopUrl', 'desktop', file, {
              maxWidth: 1200,
              maxHeight: 628,
              maxBytes: 220_000,
            })
          }
          onRemove={() => set('bannerDesktopUrl', '')}
        />
        <BannerUploadField
          label="Banner celular"
          hint="Recomendado 1080×1350px"
          value={values.bannerMobileUrl}
          uploading={uploadingField === 'mobile'}
          onUpload={(file) =>
            handleBannerUpload('bannerMobileUrl', 'mobile', file, {
              maxWidth: 1080,
              maxHeight: 1350,
              maxBytes: 180_000,
            })
          }
          onRemove={() => set('bannerMobileUrl', '')}
        />
      </div>

      {uploadError && (
        <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {uploadError}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Texto do botão</label>
          <input
            type="text"
            value={values.ctaLabel}
            onChange={(e) => set('ctaLabel', e.target.value)}
            placeholder="Ex: Aproveitar oferta"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Link do botão</label>
          <input
            type="url"
            value={values.ctaUrl}
            onChange={(e) => set('ctaUrl', e.target.value)}
            placeholder="https://wa.me/5511999999999"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Início da exibição</label>
          <input
            type="date"
            value={values.startsAt}
            onChange={(e) => set('startsAt', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Fim da exibição</label>
          <input
            type="date"
            value={values.endsAt}
            onChange={(e) => set('endsAt', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />
        </div>
      </div>
      <p className="text-[11px] text-slate-500 -mt-2">Deixe em branco para exibir sem data limite.</p>

      <label className="flex items-center gap-2.5 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => set('isActive', e.target.checked)}
          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/50"
        />
        <span className="text-sm text-slate-300">Anúncio ativo</span>
      </label>
    </div>
  );
}

function BannerUploadField({
  label,
  hint,
  value,
  uploading,
  onUpload,
  onRemove,
}: {
  label: string;
  hint: string;
  value: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400">{label} *</label>
      <div
        className={cn(
          'relative rounded-xl border overflow-hidden bg-slate-950/60',
          value ? 'border-slate-800' : 'border-dashed border-slate-700',
        )}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="w-full h-32 object-cover" />
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 text-white hover:bg-red-500/80"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full h-32 flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-slate-300 disabled:opacity-60"
          >
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
            <span className="text-xs">{uploading ? 'Enviando...' : 'Selecionar imagem'}</span>
          </button>
        )}
      </div>
      <p className="text-[10px] text-slate-500">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-[11px] text-amber-400 hover:text-amber-300"
        >
          Trocar imagem
        </button>
      )}
    </div>
  );
}
