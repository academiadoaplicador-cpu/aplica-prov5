import { useState, useEffect, useMemo } from 'react';
import { Plus, FileSpreadsheet, Download, FileDown } from 'lucide-react';
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
import VehicleFormPanel from '../components/settings/VehicleFormPanel';
import { mergeVehicles, parseVehiclesFromExcel, type VehicleImportResult } from '../utils/vehicleImport';
import { downloadVehiclesTemplate } from '../utils/spreadsheetTemplates';
import { downloadVehiclesCatalog } from '../utils/vehicleExport';
import { isVehicleMeasurementsComplete } from '../utils/vehiclePartsUtils';
import { useImportPreviewFlow } from '../hooks/useImportPreviewFlow';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [panelVehicle, setPanelVehicle] = useState<Vehicle | null>(null);
  const [isNewVehicle, setIsNewVehicle] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
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

  // O destaque do registro salvo some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 4000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const addVehicle = () => {
    setPanelVehicle({
      id: generateId(),
      make: '',
      model: '',
      year: new Date().getFullYear().toString(),
      size: VehicleSize.MEDIUM,
      partMeasurements: {},
    });
    setIsNewVehicle(true);
  };

  const editVehicle = (id: string) => {
    const vehicle = vehicles.find((v) => v.id === id);
    if (!vehicle) return;
    setPanelVehicle(vehicle);
    setIsNewVehicle(false);
  };

  const handleSaveVehicle = async (draft: Vehicle) => {
    const saved = await databaseService.saveVehicle(draft);
    setVehicles((prev) =>
      prev.some((v) => v.id === saved.id)
        ? prev.map((v) => (v.id === saved.id ? saved : v))
        : [saved, ...prev],
    );
    const label = `${saved.make} ${saved.model} (${saved.year})`;
    setImportStatus(isNewVehicle ? `Veículo ${label} cadastrado.` : `Veículo ${label} atualizado.`);
    setImportErrors([]);
    setPanelVehicle(null);
    setHighlightId(saved.id);
  };

  const removeVehicle = async (id: string) => {
    const vehicle = vehicles.find((v) => v.id === id);
    if (!vehicle || !confirm(`Excluir o veículo ${vehicle.make} ${vehicle.model} (${vehicle.year})?`)) {
      return;
    }
    await databaseService.deleteVehicle(id);
    setVehicles((prev) => prev.filter((v) => v.id !== id));
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

      <VehicleFormPanel
        vehicle={panelVehicle}
        isNew={isNewVehicle}
        onClose={() => setPanelVehicle(null)}
        onSave={handleSaveVehicle}
      />

      <PagePanel>
        {vehicles.length === 0 ? (
          <div className="p-8">
            <EmptyCatalog message="Nenhum veículo cadastrado. Baixe o modelo, preencha e importe — ou clique em Novo veículo." />
          </div>
        ) : (
          <VehicleCatalogTable
            vehicles={vehicles}
            highlightId={highlightId}
            onEdit={editVehicle}
            onRemove={(id) => void removeVehicle(id)}
            isVehicleComplete={isVehicleMeasurementsComplete}
          />
        )}
      </PagePanel>
    </div>
  );
}
