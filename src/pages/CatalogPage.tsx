import { useState, useEffect, useRef } from 'react';
import { Plus, Layers, FileSpreadsheet, Save, CheckCircle2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { databaseService } from '../services/databaseService';
import { Material, MaterialType } from '../types';
import { generateId, cn } from '../lib/utils';
import PageHeader from '../components/settings/PageHeader';
import PageButton from '../components/settings/PageButton';
import PagePanel from '../components/settings/PagePanel';
import { EmptyCatalog, ImportFeedback } from '../components/settings/SettingsBlock';
import MaterialCatalogTable from '../components/settings/MaterialCatalogTable';
import { mergeMaterials, parseMaterialsFromExcel } from '../utils/materialImport';
import { downloadMaterialsTemplate } from '../utils/spreadsheetTemplates';

export default function CatalogPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [materialsImportStatus, setMaterialsImportStatus] = useState<string | null>(null);
  const [materialsImportErrors, setMaterialsImportErrors] = useState<string[]>([]);
  const [isImportingMaterials, setIsImportingMaterials] = useState(false);
  const materialsFileRef = useRef<HTMLInputElement>(null);
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

  const handleSave = async () => {
    await databaseService.setMaterials(materials);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const addMaterial = () => {
    const newMaterial: Material = {
      id: generateId(),
      name: 'Novo Material',
      brand: 'Marca',
      pricePerM2: 50,
      type: 'Cast',
      line: 'Standard',
      colorTexture: 'Brilhante',
      durability: '1-2 anos',
      recommendedFor: ['Móveis'],
      details: '',
    };
    setMaterials([newMaterial, ...materials]);
    setEditingMaterialId(newMaterial.id);
    setIsBatchMode(false);
  };

  const handleBatchAdd = () => {
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

    setMaterials([...newMaterials, ...materials]);
    setIsBatchMode(false);
    setBatchData({ ...batchData, colors: '' });
  };

  const updateMaterial = (id: string, updates: Partial<Material>) => {
    setMaterials(materials.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const removeMaterial = (id: string) => {
    setMaterials(materials.filter((m) => m.id !== id));
    if (editingMaterialId === id) setEditingMaterialId(null);
  };

  const toggleRecommendation = (id: string, rec: string) => {
    const material = materials.find((m) => m.id === id);
    if (!material) return;
    const current = material.recommendedFor;
    const updated = current.includes(rec) ? current.filter((r) => r !== rec) : [...current, rec];
    updateMaterial(id, { recommendedFor: updated });
  };

  const handleImportMaterials = async (file: File) => {
    setMaterialsImportStatus(null);
    setMaterialsImportErrors([]);
    setIsImportingMaterials(true);
    try {
      const buffer = await file.arrayBuffer();
      const { materials: parsed, skipped, errors } = parseMaterialsFromExcel(buffer);
      if (parsed.length === 0) {
        setMaterialsImportStatus('Nenhum material válido encontrado na planilha.');
        setMaterialsImportErrors(errors);
        return;
      }
      const { added, updated } = mergeMaterials(materials, parsed);
      const saved = await databaseService.importMaterials(parsed);
      setMaterials(saved);
      const parts = [
        `${parsed.length} material(is) lido(s)`,
        `${added} novo(s)`,
        updated > 0 ? `${updated} atualizado(s)` : null,
        skipped > 0 ? `${skipped} linha(s) ignorada(s)` : null,
      ].filter(Boolean);
      setMaterialsImportStatus(`Importação concluída: ${parts.join(' • ')}.`);
      setMaterialsImportErrors(errors.slice(0, 5));
    } catch (e) {
      setMaterialsImportStatus(e instanceof Error ? e.message : 'Erro ao importar materiais.');
    } finally {
      setIsImportingMaterials(false);
      if (materialsFileRef.current) materialsFileRef.current.value = '';
    }
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
              icon={<FileSpreadsheet size={16} />}
              loading={isImportingMaterials}
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
            <PageButton
              variant="secondary"
              icon={isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              onClick={() => void handleSave()}
            >
              {isSaved ? 'Salvo' : 'Salvar alterações'}
            </PageButton>
            <PageButton variant="primary" icon={<Plus size={16} />} onClick={addMaterial}>
              Novo material
            </PageButton>
          </>
        }
        footer={
          (materialsImportStatus || isBatchMode) ? (
            <div className="space-y-4">
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
                        onClick={handleBatchAdd}
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

      <PagePanel>
        {materials.length === 0 ? (
          <div className="p-8">
            <EmptyCatalog message="Nenhum material cadastrado. Baixe o modelo, preencha e importe — ou clique em Novo material." />
          </div>
        ) : (
          <MaterialCatalogTable
            materials={materials}
            editingId={editingMaterialId}
            onSelectRow={setEditingMaterialId}
            onUpdate={updateMaterial}
            onRemove={removeMaterial}
            onToggleRecommendation={toggleRecommendation}
          />
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
