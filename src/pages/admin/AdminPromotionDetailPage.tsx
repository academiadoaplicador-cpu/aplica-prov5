import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, CheckCircle2, Megaphone, Save, Trash2 } from 'lucide-react';
import { promotionService } from '../../services/promotionService';
import { Promotion } from '../../types';
import { ROUTES } from '../../routes/paths';
import { cn } from '../../lib/utils';
import PromotionForm, {
  promotionFormValuesFromPromotion,
  promotionPayloadFromValues,
  validatePromotionForm,
  type PromotionFormValues,
} from './PromotionForm';

export default function AdminPromotionDetailPage() {
  const { promotionId } = useParams<{ promotionId: string }>();
  const navigate = useNavigate();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [values, setValues] = useState<PromotionFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!promotionId) return;
    promotionService
      .getPromotion(promotionId)
      .then((p) => {
        setPromotion(p);
        setValues(promotionFormValuesFromPromotion(p));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'));
  }, [promotionId]);

  const handleSave = async () => {
    if (!promotionId || !values) return;
    setError(null);
    setSaveMsg(null);

    const validationError = validatePromotionForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const updated = await promotionService.updatePromotion(
        promotionId,
        promotionPayloadFromValues(values),
      );
      setPromotion(updated);
      setValues(promotionFormValuesFromPromotion(updated));
      setSaveMsg('Alterações salvas.');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!promotionId || !promotion) return;
    try {
      const updated = await promotionService.setPromotionActive(promotionId, !promotion.isActive);
      setPromotion(updated);
      setValues((prev) => (prev ? { ...prev, isActive: updated.isActive } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao alterar status');
    }
  };

  const handleDelete = async () => {
    if (!promotionId) return;
    if (!confirm('Excluir esta promoção? Essa ação não pode ser desfeita.')) return;
    setDeleting(true);
    try {
      await promotionService.deletePromotion(promotionId);
      navigate(ROUTES.admin.promotions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir');
      setDeleting(false);
    }
  };

  if (!promotion || !values) {
    return <div className="py-16 text-center text-slate-500">{error || 'Carregando...'}</div>;
  }

  return (
    <div className="w-full max-w-3xl space-y-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
            <Megaphone className="text-amber-400" size={20} />
          </div>
          <h2 className="text-lg font-bold text-white truncate">{promotion.title}</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleToggleActive()}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors',
              promotion.isActive
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'
                : 'text-slate-400 border-slate-700 bg-slate-900/50 hover:bg-slate-800',
            )}
          >
            {promotion.isActive ? <CheckCircle2 size={14} /> : <Ban size={14} />}
            {promotion.isActive ? 'Ativo' : 'Inativo'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}
      {saveMsg && (
        <p className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          {saveMsg}
        </p>
      )}

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 sm:p-6">
        <PromotionForm values={values} onChange={setValues} />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={deleting}
          onClick={() => void handleDelete()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 border border-red-500/20 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          <Trash2 size={16} />
          {deleting ? 'Excluindo...' : 'Excluir promoção'}
        </button>
      </div>
    </div>
  );
}
