import { useState, useEffect, useRef } from 'react';
import { Plus, FileSpreadsheet, Save, CheckCircle2, Download } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { Appliance } from '../types';
import { generateId } from '../lib/utils';
import PageHeader from '../components/settings/PageHeader';
import PageButton from '../components/settings/PageButton';
import PagePanel from '../components/settings/PagePanel';
import { EmptyCatalog, ImportFeedback } from '../components/settings/SettingsBlock';
import ApplianceCatalogTable from '../components/settings/ApplianceCatalogTable';
import { mergeAppliances, parseAppliancesFromExcel } from '../utils/applianceImport';
import { downloadAppliancesTemplate } from '../utils/spreadsheetTemplates';

export default function AppliancesPage() {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [editingApplianceId, setEditingApplianceId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    databaseService.getAppliances().then(setAppliances);
  }, []);

  const handleSave = async () => {
    await databaseService.setAppliances(appliances);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const addAppliance = () => {
    const newAppliance: Appliance = {
      id: generateId(),
      make: '',
      model: 'Novo Eletro',
      type: 'Geladeira',
      width: 0.7,
      height: 1.8,
      depth: 0.7,
    };
    setAppliances([newAppliance, ...appliances]);
    setEditingApplianceId(newAppliance.id);
  };

  const updateAppliance = (id: string, updates: Partial<Appliance>) => {
    setAppliances(appliances.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const removeAppliance = (id: string) => {
    setAppliances(appliances.filter((a) => a.id !== id));
    if (editingApplianceId === id) setEditingApplianceId(null);
  };

  const handleImport = async (file: File) => {
    setImportStatus(null);
    setImportErrors([]);
    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const { appliances: parsed, skipped, errors } = parseAppliancesFromExcel(buffer);
      if (parsed.length === 0) {
        setImportStatus('Nenhum eletro válido encontrado na planilha.');
        setImportErrors(errors);
        return;
      }
      const { added, updated } = mergeAppliances(appliances, parsed);
      const saved = await databaseService.importAppliances(parsed);
      setAppliances(saved);
      const parts = [
        `${parsed.length} linha(s) lida(s)`,
        `${added} novo(s)`,
        updated > 0 ? `${updated} atualizado(s)` : null,
        skipped > 0 ? `${skipped} linha(s) ignorada(s)` : null,
      ].filter(Boolean);
      setImportStatus(`Importação concluída: ${parts.join(' • ')}.`);
      setImportErrors(errors.slice(0, 5));
    } catch (e) {
      setImportStatus(e instanceof Error ? e.message : 'Erro ao importar eletros.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 w-full pb-20">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImport(file);
        }}
      />

      <PageHeader
        title="Base de Eletrodomésticos"
        description="Gerencie modelos e dimensões para orçamentos do módulo decorativo"
        actions={
          <>
            <PageButton
              variant="secondary"
              icon={<Download size={16} />}
              onClick={() => downloadAppliancesTemplate()}
            >
              Baixar modelo
            </PageButton>
            <PageButton
              variant="secondary"
              icon={<FileSpreadsheet size={16} />}
              loading={isImporting}
              onClick={() => fileInputRef.current?.click()}
            >
              Importar planilha
            </PageButton>
            <PageButton
              variant="secondary"
              icon={isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              onClick={() => void handleSave()}
            >
              {isSaved ? 'Salvo' : 'Salvar alterações'}
            </PageButton>
            <PageButton variant="primary" icon={<Plus size={16} />} onClick={addAppliance}>
              Novo eletro
            </PageButton>
          </>
        }
        footer={
          importStatus ? (
            <ImportFeedback status={importStatus} errors={importErrors} />
          ) : undefined
        }
      />

      <PagePanel>
        {appliances.length === 0 ? (
          <div className="p-8">
            <EmptyCatalog message="Nenhum eletro cadastrado. Baixe o modelo, preencha e importe — ou clique em Novo eletro." />
          </div>
        ) : (
          <ApplianceCatalogTable
            appliances={appliances}
            editingId={editingApplianceId}
            onSelectRow={setEditingApplianceId}
            onUpdate={updateAppliance}
            onRemove={removeAppliance}
          />
        )}
      </PagePanel>
    </div>
  );
}
