import { useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import PageButton from './settings/PageButton';
import GeneratePdfButton from './GeneratePdfButton';
import BudgetSaveBeforePdfModal from './BudgetSaveBeforePdfModal';

interface BudgetSavePdfActionsProps {
  saveDisabled?: boolean;
  pdfDisabled?: boolean;
  /** Orçamento salvo e sem alterações desde o último save */
  isBudgetSaved?: boolean;
  isSaved?: boolean;
  onSave: () => boolean | void | Promise<boolean | void>;
  onGeneratePDF: () => Promise<void>;
  onSaveBlocked?: () => void;
  onPdfBlocked?: () => void;
  pdfLabel?: string;
  accent?: 'indigo' | 'emerald';
}

export default function BudgetSavePdfActions({
  saveDisabled = false,
  pdfDisabled = false,
  isBudgetSaved = false,
  isSaved = false,
  onSave,
  onGeneratePDF,
  onSaveBlocked,
  onPdfBlocked,
  pdfLabel = 'Gerar PDF',
  accent = 'indigo',
}: BudgetSavePdfActionsProps) {
  const [showSaveFirstModal, setShowSaveFirstModal] = useState(false);
  const savedLabel = isBudgetSaved || isSaved;

  const handleGeneratePDF = async () => {
    if (!isBudgetSaved) {
      setShowSaveFirstModal(true);
      return;
    }
    await onGeneratePDF();
  };

  const handleSaveFromModal = async () => {
    if (saveDisabled) {
      onSaveBlocked?.();
      return;
    }
    const saved = await onSave();
    if (saved === false) return;
    setShowSaveFirstModal(false);
    await onGeneratePDF();
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <PageButton
          variant="secondary"
          className="w-full"
          disabled={false}
          icon={savedLabel ? <CheckCircle2 size={16} /> : <Save size={16} />}
          onClick={() => {
            if (saveDisabled) {
              onSaveBlocked?.();
              return;
            }
            void onSave();
          }}
          style={saveDisabled ? { opacity: 0.55 } : undefined}
        >
          {savedLabel ? 'Orçamento salvo' : 'Salvar orçamento'}
        </PageButton>
        <GeneratePdfButton
          size="sm"
          disabled={pdfDisabled}
          onBlockedClick={onPdfBlocked}
          onGenerate={handleGeneratePDF}
          label={pdfLabel}
          className="shadow-lg"
        />
      </div>

      <BudgetSaveBeforePdfModal
        open={showSaveFirstModal}
        onClose={() => setShowSaveFirstModal(false)}
        onSave={handleSaveFromModal}
        accent={accent}
      />
    </>
  );
}
