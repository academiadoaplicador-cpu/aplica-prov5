import { useState, useEffect, useMemo } from 'react';
import { Plus, FileSpreadsheet, Save, CheckCircle2, Download, FileDown } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { Vehicle, VehicleSize } from '../types';
import { generateId } from '../lib/utils';
import PageHeader from '../components/settings/PageHeader';
import PageButton from '../components/settings/PageButton';
import PagePanel from '../components/settings/PagePanel';
import { EmptyCatalog, ImportFeedback } from '../components/settings/SettingsBlock';
import ImportProgressBar from '../components/settings/ImportProgressBar';
import VehicleCatalogTable from '../components/settings/VehicleCatalogTable';
import VehicleImportPreviewModal from '../components/settings/VehicleImportPreviewModal';
import { mergeVehicles, parseVehiclesFromExcel, type VehicleImportResult } from '../utils/vehicleImport';
import { downloadVehiclesTemplate } from '../utils/spreadsheetTemplates';
import { downloadVehiclesCatalog } from '../utils/vehicleExport';
import { isVehicleMeasurementsComplete } from '../utils/vehiclePartsUtils';
import { useImportPreviewFlow } from '../hooks/useImportPreviewFlow';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<VehicleImportResult | null>(null);

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
    return mergeVehicles(vehicles, importPreview.vehicles);
  }, [vehicles, importPreview]);

  useEffect(() => {
    databaseService.getVehicles().then(setVehicles);
  }, []);

  const handleSave = async () => {
    await databaseService.setVehicles(vehicles);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const addVehicle = () => {
    const newVehicle: Vehicle = {
      id: generateId(),
      make: '',
      model: 'Novo Modelo',
      year: new Date().getFullYear().toString(),
      size: VehicleSize.MEDIUM,
      partMeasurements: {},
    };
    setVehicles([newVehicle, ...vehicles]);
    setEditingVehicleId(newVehicle.id);
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles(vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  };

  const removeVehicle = (id: string) => {
    setVehicles(vehicles.filter((v) => v.id !== id));
    if (editingVehicleId === id) setEditingVehicleId(null);
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
              parseVehiclesFromExcel,
              (result) => setImportPreview(result),
              (message) => setImportStatus(message),
            );
          }
        }}
      />

      <VehicleImportPreviewModal
        open={isPreviewOpen}
        fileName={importFileName}
        preview={importPreview}
        existingVehicles={vehicles}
        added={mergePreview.added}
        updated={mergePreview.updated}
        loading={isConfirmingImport}
        progress={importProgress}
        progressLabel={importProgressLabel}
        error={importModalError}
        onConfirm={() => {
          if (!importPreview || importPreview.vehicles.length === 0) return;
          void handleConfirmImport(
            async () => {
              const { vehicles: parsed, skipped, errors, warnings } = importPreview;
              const { merged, added, updated } = mergeVehicles(vehicles, parsed);
              await databaseService.setVehicles(merged);
              setVehicles(merged);
              const parts = [
                `${parsed.length} veículo(s) importado(s)`,
                `${added} novo(s)`,
                updated > 0 ? `${updated} atualizado(s)` : null,
                skipped > 0 ? `${skipped} linha(s) ignorada(s)` : null,
              ].filter(Boolean);
              setImportStatus(`Importação concluída: ${parts.join(' • ')}.`);
              setImportErrors([...errors, ...warnings].slice(0, 5));
            },
            { errorFallback: 'Erro ao importar veículos.' },
          );
        }}
        onClose={() => {
          closePreview();
          setImportPreview(null);
        }}
      />

      <PageHeader
        title="Base de Veículos"
        description="Gerencie modelos e medidas por peça para orçamentos automotivos"
        actions={
          <>
            <PageButton
              variant="secondary"
              icon={<Download size={16} />}
              onClick={() => downloadVehiclesTemplate()}
            >
              Baixar modelo
            </PageButton>
            <PageButton
              variant="secondary"
              icon={<FileDown size={16} />}
              disabled={vehicles.length === 0}
              onClick={() => downloadVehiclesCatalog(vehicles)}
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
            <PageButton
              variant="secondary"
              icon={isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              onClick={() => void handleSave()}
            >
              {isSaved ? 'Salvo' : 'Salvar alterações'}
            </PageButton>
            <PageButton variant="primary" icon={<Plus size={16} />} onClick={addVehicle}>
              Novo veículo
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

      <PagePanel>
        {vehicles.length === 0 ? (
          <div className="p-8">
            <EmptyCatalog message="Nenhum veículo cadastrado. Baixe o modelo, preencha e importe — ou clique em Novo veículo." />
          </div>
        ) : (
          <VehicleCatalogTable
            vehicles={vehicles}
            editingId={editingVehicleId}
            onSelectRow={setEditingVehicleId}
            onUpdate={updateVehicle}
            onRemove={removeVehicle}
            isVehicleComplete={isVehicleMeasurementsComplete}
          />
        )}
      </PagePanel>
    </div>
  );
}
