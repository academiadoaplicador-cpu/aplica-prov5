import { useState, useEffect, useMemo } from 'react';
import { Plus, Layers, FileSpreadsheet, Download, FileDown, Tags, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { databaseService } from '../services/databaseService';
import { Material, MaterialType } from '../types';
import { generateId, cn } from '../lib/utils';
import PageHeader from '../components/settings/PageHeader';
import PageButton from '../components/settings/PageButton';
import PagePanel from '../components/settings/PagePanel';
import { EmptyCatalog, ImportFeedback } from '../components/settings/SettingsBlock';
import ImportProgressBar from '../components/settings/ImportProgressBar';
import MaterialCatalogTable from '../components/settings/MaterialCatalogTable';
import MaterialImportPreviewModal from '../components/settings/MaterialImportPreviewModal';
import MaterialFormPanel from '../components/settings/MaterialFormPanel';
import MaterialBulkPricePanel from '../components/settings/MaterialBulkPricePanel';
import { mergeMaterials, parseMaterialsFromExcel, type MaterialImportResult } from '../utils/materialImport';
import { downloadMaterialsTemplate } from '../utils/spreadsheetTemplates';
import { downloadMaterialsCatalog } from '../utils/materialExport';
import { useImportPreviewFlow } from '../hooks/useImportPreviewFlow';

const MATERIAL_TYPES: MaterialType[] = ['Cast', 'Calandrado', 'PPF', 'Poliéster'];

/** Família de produtos = marca + linha (ex.: 3M · 2080). */
function familyKey(material: Material): string {
  return `${material.brand.trim()} · ${material.line.trim()}`;
}

function emptyMaterial(): Material {
  return {
    id: generateId(),
    name: '',
    brand: '',
    pricePerM2: 0,
    type: 'Cast',
    line: '',
    colorTexture: '',
    durability: '',
    recommendedFor: [],
    details: '',
  };
}

export default function CatalogPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [panelMaterial, setPanelMaterial] = useState<Material | null>(null);
  const [isNewMaterial, setIsNewMaterial] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [familyFilter, setFamilyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<MaterialType | ''>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [materialsImportStatus, setMaterialsImportStatus] = useState<string | null>(null);
  const [materialsImportErrors, setMaterialsImportErrors] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<MaterialImportResult | null>(null);

  const {
    fileInputRef: materialsFileRef,
    isParsingFile: isParsingMaterials,
    parseProgress: materialsParseProgress,
    isPreviewOpen: isMaterialsPreviewOpen,
    importFileName: materialsImportFileName,
    isConfirmingImport: isConfirmingMaterialsImport,
    importProgress: materialsImportProgress,
    importProgressLabel: materialsImportProgressLabel,
    importModalError: materialsImportModalError,
    closePreview: closeMaterialsPreview,
    handleFileSelect: handleMaterialsFileSelect,
    handleConfirmImport: handleMaterialsConfirmImport,
  } = useImportPreviewFlow();

  const materialsMergePreview = useMemo(() => {
    if (!importPreview) return { added: 0, updated: 0 };
    return mergeMaterials(materials, importPreview.materials);
  }, [materials, importPreview]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchData, setBatchData] = useState({
    brand: '',
    line: '',
    type: 'Cast' as MaterialType,
    pricePerM2: 50,
    colors: '',
    durability: '1-2 anos',
    recommendedFor: ['Automotivo'] as string[],
  });

  useEffect(() => {
    databaseService.getMaterials().then(setMaterials);
  }, []);

  // O destaque do registro salvo some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 4000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const families = useMemo(
    () =>
      Array.from(new Set<string>(materials.map(familyKey))).sort((a, b) =>
        a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
      ),
    [materials],
  );

  const visibleMaterials = useMemo(
    () =>
      materials.filter(
        (m) =>
          (!familyFilter || familyKey(m) === familyFilter) && (!typeFilter || m.type === typeFilter),
      ),
    [materials, familyFilter, typeFilter],
  );

  const selectedMaterials = useMemo(
    () => materials.filter((m) => selectedIds.has(m.id)),
    [materials, selectedIds],
  );
  const allVisibleSelected =
    visibleMaterials.length > 0 && visibleMaterials.every((m) => selectedIds.has(m.id));

  const addMaterial = () => {
    setPanelMaterial(emptyMaterial());
    setIsNewMaterial(true);
    setIsBatchMode(false);
  };

  const editMaterial = (id: string) => {
    const material = materials.find((m) => m.id === id);
    if (!material) return;
    setPanelMaterial(material);
    setIsNewMaterial(false);
  };

  /** Mostra o registro salvo: tira os filtros que o esconderiam e destaca a linha. */
  const revealMaterial = (material: Material) => {
    if (familyFilter && familyKey(material) !== familyFilter) setFamilyFilter('');
    if (typeFilter && material.type !== typeFilter) setTypeFilter('');
    setHighlightId(material.id);
  };

  const handleSaveMaterial = async (draft: Material) => {
    const saved = await databaseService.saveMaterial(draft);
    setMaterials((prev) =>
      prev.some((m) => m.id === saved.id)
        ? prev.map((m) => (m.id === saved.id ? saved : m))
        : [saved, ...prev],
    );
    setMaterialsImportStatus(
      isNewMaterial ? `Material "${saved.name}" cadastrado.` : `Material "${saved.name}" atualizado.`,
    );
    setMaterialsImportErrors([]);
    setPanelMaterial(null);
    revealMaterial(saved);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const m of visibleMaterials) {
        if (allVisibleSelected) next.delete(m.id);
        else next.add(m.id);
      }
      return next;
    });
  };

  const handleApplyBulkPrices = async (updates: { id: string; pricePerM2: number }[]) => {
    const { updated } = await databaseService.updateMaterialPrices(updates);
    const prices = new Map(updates.map((u) => [u.id, u.pricePerM2]));
    setMaterials((prev) =>
      prev.map((m) => (prices.has(m.id) ? { ...m, pricePerM2: prices.get(m.id)! } : m)),
    );
    setMaterialsImportStatus(`Preço atualizado em ${updated} material(is).`);
    setMaterialsImportErrors([]);
    setSelectedIds(new Set());
    setIsBulkOpen(false);
  };

  const handleBatchAdd = async () => {
    const colorList = batchData.colors.split(',').map((c) => c.trim()).filter((c) => c !== '');
    if (colorList.length === 0) return;

    const newMaterials: Material[] = colorList.map((color) => ({
      id: generateId(),
      name: `${batchData.line} - ${color}`,
      brand: batchData.brand,
      pricePerM2: batchData.pricePerM2,
      type: batchData.type,
      line: batchData.line,
      colorTexture: color,
      durability: batchData.durability,
      recommendedFor: batchData.recommendedFor,
      details: `Cadastrado via lote: ${batchData.line}`,
    }));

    const next = [...newMaterials, ...materials];
    await databaseService.setMaterials(next);
    setMaterials(next);
    setIsBatchMode(false);
    setBatchData({ ...batchData, colors: '' });
    setMaterialsImportStatus(`${newMaterials.length} material(is) cadastrado(s) em lote.`);
    setMaterialsImportErrors([]);
    revealMaterial(newMaterials[0]);
  };

  const removeMaterial = async (id: string) => {
    const material = materials.find((m) => m.id === id);
    if (!material || !confirm(`Excluir o material "${material.name}" do catálogo?`)) return;
    await databaseService.deleteMaterial(id);
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleImportMaterials = async (file: File) => {
    setMaterialsImportStatus(null);
    setMaterialsImportErrors([]);
    await handleMaterialsFileSelect(
      file,
      parseMaterialsFromExcel,
      (result) => setImportPreview(result),
      (message) => setMaterialsImportStatus(message),
    );
  };

  return (
    <div className="space-y-6 w-full pb-20">
      <input
        ref={materialsFileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImportMaterials(file);
        }}
      />

      <MaterialImportPreviewModal
        open={isMaterialsPreviewOpen}
        fileName={materialsImportFileName}
        preview={importPreview}
        existingMaterials={materials}
        added={materialsMergePreview.added}
        updated={materialsMergePreview.updated}
        loading={isConfirmingMaterialsImport}
        progress={materialsImportProgress}
        progressLabel={materialsImportProgressLabel}
        error={materialsImportModalError}
        onConfirm={() => {
          if (!importPreview || importPreview.materials.length === 0) return;
          void handleMaterialsConfirmImport(
            async () => {
              const { materials: parsed, skipped, errors } = importPreview;
              const { merged, added, updated } = mergeMaterials(materials, parsed);
              await databaseService.setMaterials(merged);
              setMaterials(merged);
              const parts = [
                `${parsed.length} material(is) importado(s)`,
                `${added} novo(s)`,
                updated > 0 ? `${updated} atualizado(s)` : null,
                skipped > 0 ? `${skipped} linha(s) ignorada(s)` : null,
              ].filter(Boolean);
              setMaterialsImportStatus(`Importação concluída: ${parts.join(' • ')}.`);
              setMaterialsImportErrors(errors.slice(0, 5));
            },
            { errorFallback: 'Erro ao importar materiais.' },
          );
        }}
        onClose={() => {
          closeMaterialsPreview();
          setImportPreview(null);
        }}
      />

      <PageHeader
        title="Catálogo Profissional"
        description="Gerencie os materiais usados nos orçamentos automotivo e decorativo"
        actions={
          <>
            <PageButton
              variant="secondary"
              icon={<Download size={16} />}
              onClick={() => downloadMaterialsTemplate()}
            >
              Baixar modelo
            </PageButton>
            <PageButton
              variant="secondary"
              icon={<FileDown size={16} />}
              disabled={materials.length === 0}
              onClick={() => downloadMaterialsCatalog(materials)}
            >
              Exportar catálogo
            </PageButton>
            <PageButton
              variant="secondary"
              icon={<FileSpreadsheet size={16} />}
              loading={isParsingMaterials}
              onClick={() => materialsFileRef.current?.click()}
            >
              Importar planilha
            </PageButton>
            <PageButton
              variant="secondary"
              icon={<Layers size={16} />}
              onClick={() => setIsBatchMode(!isBatchMode)}
              className={cn(isBatchMode && 'border-indigo-500/50 bg-indigo-950/40 text-indigo-300')}
            >
              Cadastro em lote
            </PageButton>
            <PageButton variant="primary" icon={<Plus size={16} />} onClick={addMaterial}>
              Novo material
            </PageButton>
          </>
        }
        footer={
          (materialsImportStatus || isBatchMode || (isParsingMaterials && materialsParseProgress > 0)) ? (
            <div className="space-y-4">
              {isParsingMaterials && materialsParseProgress > 0 && (
                <ImportProgressBar progress={materialsParseProgress} label="Lendo planilha…" size="sm" />
              )}
              <ImportFeedback status={materialsImportStatus} errors={materialsImportErrors} />
              <AnimatePresence>
                {isBatchMode && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 overflow-hidden"
                  >
                    <p className="text-sm font-medium text-white flex items-center gap-2">
                      <Layers size={16} className="text-indigo-400" />
                      Cadastro em lote por linha e cores
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <BatchField label="Marca" value={batchData.brand} onChange={(v) => setBatchData({ ...batchData, brand: v })} />
                      <BatchField label="Linha" value={batchData.line} onChange={(v) => setBatchData({ ...batchData, line: v })} />
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Tipo</label>
                        <select
                          value={batchData.type}
                          onChange={(e) => setBatchData({ ...batchData, type: e.target.value as MaterialType })}
                          className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2.5 text-base sm:text-sm text-white"
                        >
                          <option value="Cast">Cast</option>
                          <option value="Calandrado">Calandrado</option>
                          <option value="PPF">PPF</option>
                          <option value="Poliéster">Poliéster</option>
                        </select>
                      </div>
                      <BatchField
                        label="Preço (R$/m²)"
                        value={String(batchData.pricePerM2)}
                        onChange={(v) => setBatchData({ ...batchData, pricePerM2: parseFloat(v) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Cores separadas por vírgula</label>
                      <textarea
                        value={batchData.colors}
                        onChange={(e) => setBatchData({ ...batchData, colors: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white h-20 resize-none"
                        placeholder="Amarelo, Vermelho, Preto..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <PageButton variant="secondary" onClick={() => setIsBatchMode(false)}>
                        Cancelar
                      </PageButton>
                      <PageButton
                        variant="primary"
                        onClick={() => void handleBatchAdd()}
                        disabled={!batchData.brand || !batchData.colors}
                      >
                        Gerar materiais
                      </PageButton>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : undefined
        }
      />

      <MaterialFormPanel
        material={panelMaterial}
        isNew={isNewMaterial}
        onClose={() => setPanelMaterial(null)}
        onSave={handleSaveMaterial}
      />

      <MaterialBulkPricePanel
        open={isBulkOpen}
        materials={selectedMaterials}
        onClose={() => setIsBulkOpen(false)}
        onApply={handleApplyBulkPrices}
      />

      <PagePanel>
        {materials.length === 0 ? (
          <div className="p-8">
            <EmptyCatalog message="Nenhum material cadastrado. Baixe o modelo, preencha e importe — ou clique em Novo material." />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 px-4 pt-4 sm:px-5 sm:pt-5 lg:flex-row lg:items-end">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                <FilterSelect
                  label="Família (marca · linha)"
                  value={familyFilter}
                  onChange={setFamilyFilter}
                  options={families}
                  allLabel="Todas as famílias"
                />
                <FilterSelect
                  label="Tipo"
                  value={typeFilter}
                  onChange={(v) => setTypeFilter(v as MaterialType | '')}
                  options={MATERIAL_TYPES}
                  allLabel="Todos os tipos"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PageButton
                  variant="secondary"
                  onClick={toggleSelectVisible}
                  disabled={visibleMaterials.length === 0}
                >
                  {allVisibleSelected
                    ? 'Desmarcar filtrados'
                    : `Selecionar filtrados (${visibleMaterials.length})`}
                </PageButton>
                {selectedIds.size > 0 && (
                  <>
                    <PageButton
                      variant="primary"
                      icon={<Tags size={16} />}
                      onClick={() => setIsBulkOpen(true)}
                    >
                      Alterar preço ({selectedIds.size})
                    </PageButton>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800"
                      title="Limpar seleção"
                      aria-label="Limpar seleção"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <MaterialCatalogTable
              materials={visibleMaterials}
              highlightId={highlightId}
              onEdit={editMaterial}
              onRemove={(id) => void removeMaterial(id)}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          </>
        )}
      </PagePanel>
    </div>
  );
}

function BatchField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2.5 text-base sm:text-sm text-white"
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2.5 text-base sm:text-sm text-white"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
