import { CheckCircle2, Save } from 'lucide-react';
import PageButton from './settings/PageButton';
import GeneratePdfButton from './GeneratePdfButton';

interface BudgetSavePdfActionsProps {
  saveDisabled?: boolean;
  pdfDisabled?: boolean;
  isSaved?: boolean;
  onSave: () => void | Promise<void>;
  onGeneratePDF: () => Promise<void>;
  pdfLabel?: string;
}

export default function BudgetSavePdfActions({
  saveDisabled = false,
  pdfDisabled = false,
  isSaved = false,
  onSave,
  onGeneratePDF,
  pdfLabel = 'Gerar PDF',
}: BudgetSavePdfActionsProps) {
  return (
    <div className="flex flex-col gap-2">
      <PageButton
        variant="secondary"
        className="w-full"
        disabled={saveDisabled}
        icon={isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
        onClick={() => void onSave()}
      >
        {isSaved ? 'Orçamento salvo' : 'Salvar orçamento'}
      </PageButton>
      <GeneratePdfButton
        size="sm"
        disabled={pdfDisabled}
        onGenerate={onGeneratePDF}
        label={pdfLabel}
        className="shadow-lg"
      />
    </div>
  );
}
