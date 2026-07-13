import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Plus } from 'lucide-react';
import { promotionService } from '../../services/promotionService';
import { ROUTES } from '../../routes/paths';
import PromotionForm, {
  emptyPromotionFormValues,
  promotionPayloadFromValues,
  validatePromotionForm,
} from './PromotionForm';

export default function AdminCreatePromotionPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState(emptyPromotionFormValues());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const validationError = validatePromotionForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const created = await promotionService.createPromotion(promotionPayloadFromValues(values));
      navigate(ROUTES.admin.promotion(created.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar promoção');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
            <Megaphone className="text-amber-400" size={20} />
          </div>
          <h2 className="text-lg font-bold text-white">Nova promoção</h2>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleSubmit()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          <Plus size={16} />
          {loading ? 'Criando...' : 'Criar promoção'}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 sm:p-6">
        <PromotionForm values={values} onChange={setValues} />
      </div>
    </div>
  );
}
