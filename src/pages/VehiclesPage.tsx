import { useState, useEffect } from 'react';
import { Plus, Save, CheckCircle2 } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { Vehicle, VehicleSize } from '../types';
import { VEHICLE_PRESETS } from '../types/vehicleParts';
import { generateId } from '../lib/utils';
import PageHeader from '../components/settings/PageHeader';
import PageButton from '../components/settings/PageButton';
import PagePanel from '../components/settings/PagePanel';
import { EmptyCatalog } from '../components/settings/SettingsBlock';
import VehicleCatalogTable from '../components/settings/VehicleCatalogTable';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

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

  const isVehicleComplete = (vehicle: Vehicle) => {
    const preset = VEHICLE_PRESETS[vehicle.size] || [];
    return preset.every((partId) => {
      const m = vehicle.partMeasurements[partId];
      return m && m.width > 0 && m.length > 0;
    });
  };

  return (
    <div className="space-y-6 w-full pb-20">
      <PageHeader
        title="Base de Veículos"
        description="Gerencie modelos e medidas por peça para orçamentos automotivos"
        actions={
          <>
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
      />

      <PagePanel>
        {vehicles.length === 0 ? (
          <div className="p-8">
            <EmptyCatalog message="Nenhum veículo cadastrado. Clique em Novo veículo para começar." />
          </div>
        ) : (
          <VehicleCatalogTable
            vehicles={vehicles}
            editingId={editingVehicleId}
            onSelectRow={setEditingVehicleId}
            onUpdate={updateVehicle}
            onRemove={removeVehicle}
            isVehicleComplete={isVehicleComplete}
          />
        )}
      </PagePanel>
    </div>
  );
}
