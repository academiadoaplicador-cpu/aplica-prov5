import { useState, useEffect, useMemo } from 'react';
import { Plus, FileSpreadsheet, Download, FileDown } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { Appliance } from '../types';
import { generateId } from '../lib/utils';
import PageHeader from '../components/settings/PageHeader';
import PageButton from '../components/settings/PageButton';
import PagePanel from '../components/settings/PagePanel';
import { EmptyCatalog, ImportFeedback } from '../components/settings/SettingsBlock';
import ImportProgressBar from '../components/settings/ImportProgressBar';
import ApplianceCatalogTable from '../components/settings/ApplianceCatalogTable';
import ApplianceImportPreviewModal from '../components/settings/ApplianceImportPreviewModal';
import ApplianceFormPanel from '../components/settings/ApplianceFormPanel';
import { mergeAppliances, parseAppliancesFromExcel, type ApplianceImportResult } from '../utils/applianceImport';
import { downloadAppliancesTemplate } from '../utils/spreadsheetTemplates';
import { downloadAppliancesCatalog } from '../utils/applianceExport';
import { useImportPreviewFlow } from '../hooks/useImportPreviewFlow';

export default function AppliancesPage() {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [panelAppliance, setPanelAppliance] = useState<Appliance | null>(null);
  const [isNewAppliance, setIsNewAppliance] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<ApplianceImportResult | null>(null);

  const {
    fileInputRef,
    isParsingFile,
    parseProgress,
    isPreviewOpen,
    importFileName,
    isConfirmingImport,
    importProgress,
    importProgressLabel,
    importModalError,
    closePreview,
    handleFileSelect,
    handleConfirmImport,
  } = useImportPreviewFlow();

  const mergePreview = useMemo(() => {
    if (!importPreview) return { added: 0, updated: 0 };
    return mergeAppliances(appliances, importPreview.appliances);
  }, [appliances, importPreview]);

  useEffect(() => {
    databaseService.getAppliances().then(setAppliances);
  }, []);

  // O destaque do registro salvo some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 4000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const addAppliance = () => {
    setPanelAppliance({
      id: generateId(),
      make: '',
      model: '',
      type: 'Geladeira',
      width: 0,
      height: 0,
      depth: 0,
    });
    setIsNewAppliance(true);
  };

  const editAppliance = (id: string) => {
    const appliance = appliances.find((a) => a.id === id);
    if (!appliance) return;
    setPanelAppliance(appliance);
    setIsNewAppliance(false);
  };

  const handleSaveAppliance = async (draft: Appliance) => {
    const saved = await databaseService.saveAppliance(draft);
    setAppliances((prev) =>
      prev.some((a) => a.id === saved.id)
        ? prev.map((a) => (a.id === saved.id ? saved : a))
        : [saved, ...prev],
    );
    const label = `${saved.make} ${saved.model}`;
    setImportStatus(isNewAppliance ? `Eletro ${label} cadastrado.` : `Eletro ${label} atualizado.`);
    setImportErrors([]);
    setPanelAppliance(null);
    setHighlightId(saved.id);
  };

  const removeAppliance = async (id: string) => {
    const appliance = appliances.find((a) => a.id === id);
    if (!appliance || !confirm(`Excluir o eletro ${appliance.make} ${appliance.model}?`)) return;
    await databaseService.deleteAppliance(id);
    setAppliances((prev) => prev.filter((a) => a.id !== id));
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
          if (file) {
            void handleFileSelect(
              file,
              parseAppliancesFromExcel,
              (result) => setImportPreview(result),
              (message) => setImportStatus(message),
            );
          }
        }}
      />

      <ApplianceImportPreviewModal
        open={isPreviewOpen}
        fileName={importFileName}
        preview={importPreview}
        existingAppliances={appliances}
        added={mergePreview.added}
        updated={mergePreview.updated}
        loading={isConfirmingImport}
        progress={importProgress}
        progressLabel={importProgressLabel}
        error={importModalError}
        onConfirm={() => {
          if (!importPreview || importPreview.appliances.length === 0) return;
          void handleConfirmImport(
            async () => {
              const { appliances: parsed, skipped, errors } = importPreview;
              const { merged, added, updated } = mergeAppliances(appliances, parsed);
              await databaseService.setAppliances(merged);
              setAppliances(merged);
              const parts = [
                `${parsed.length} eletro(s) importado(s)`,
                `${added} novo(s)`,
                updated > 0 ? `${updated} atualizado(s)` : null,
                skipped > 0 ? `${skipped} linha(s) ignorada(s)` : null,
              ].filter(Boolean);
              setImportStatus(`Importação concluída: ${parts.join(' • ')}.`);
              setImportErrors(errors.slice(0, 5));
            },
            { errorFallback: 'Erro ao importar eletros.' },
          );
        }}
        onClose={() => {
          closePreview();
          setImportPreview(null);
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
              icon={<FileDown size={16} />}
              disabled={appliances.length === 0}
              onClick={() => downloadAppliancesCatalog(appliances)}
            >
              Exportar catálogo
            </PageButton>
            <PageButton
              variant="secondary"
              icon={<FileSpreadsheet size={16} />}
              loading={isParsingFile}
              onClick={() => fileInputRef.current?.click()}
            >
              Importar planilha
            </PageButton>
            <PageButton variant="primary" icon={<Plus size={16} />} onClick={addAppliance}>
              Novo eletro
            </PageButton>
          </>
        }
        footer={
          importStatus || (isParsingFile && parseProgress > 0) ? (
            <div className="space-y-2">
              {isParsingFile && parseProgress > 0 && (
                <ImportProgressBar progress={parseProgress} label="Lendo planilha…" size="sm" />
              )}
              {importStatus ? <ImportFeedback status={importStatus} errors={importErrors} /> : null}
            </div>
          ) : undefined
        }
      />

      <ApplianceFormPanel
        appliance={panelAppliance}
        isNew={isNewAppliance}
        onClose={() => setPanelAppliance(null)}
        onSave={handleSaveAppliance}
      />

      <PagePanel>
        {appliances.length === 0 ? (
          <div className="p-8">
            <EmptyCatalog message="Nenhum eletro cadastrado. Baixe o modelo, preencha e importe — ou clique em Novo eletro." />
          </div>
        ) : (
          <ApplianceCatalogTable
            appliances={appliances}
            highlightId={highlightId}
            onEdit={editAppliance}
            onRemove={(id) => void removeAppliance(id)}
          />
        )}
      </PagePanel>
    </div>
  );
}
