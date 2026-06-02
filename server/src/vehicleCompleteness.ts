/** Presets por porte — espelha src/types/vehicleParts.ts */
const VEHICLE_PRESETS: Record<string, string[]> = {
  'Pequeno (Hatch/Compacto)': [
    'CAP', 'TET', 'MAL', 'PCD', 'PCE', 'PTD', 'PTE', 'PDD', 'PDE',
    'PCD_BUMP', 'PCT_BUMP', 'RET_D', 'RET_E', 'SAI_D', 'SAI_E',
  ],
  'Médio (Sedan/SUV Compacto)': [
    'CAP', 'TET', 'MAL', 'PCD', 'PCE', 'PTD', 'PTE', 'PDD', 'PDE',
    'PTD_DOOR', 'PTE_DOOR', 'PCD_BUMP', 'PCT_BUMP', 'RET_D', 'RET_E',
    'SAI_D', 'SAI_E', 'COL',
  ],
  'Grande (SUV/Pickup)': [
    'CAP', 'TET', 'MAL', 'PCD', 'PCE', 'PTD', 'PTE', 'PDD', 'PDE',
    'PTD_DOOR', 'PTE_DOOR', 'PCD_BUMP', 'PCT_BUMP', 'RET_D', 'RET_E',
    'SAI_D', 'SAI_E', 'COL', 'AER', 'MAC_D',
  ],
  'Extra Grande (Van/Caminhão)': [
    'CAP', 'TET', 'MAL', 'PCD', 'PCE', 'PTD', 'PTE', 'PDD', 'PDE',
    'PTD_DOOR', 'PTE_DOOR', 'PCD_BUMP', 'PCT_BUMP', 'RET_D', 'RET_E',
    'SAI_D', 'SAI_E', 'COL', 'AER', 'MAC_D', 'GRA',
  ],
};

type PartMeasurement = { width: number; length: number };

export function isVehicleMeasurementsComplete(
  size: string,
  partMeasurements: Record<string, PartMeasurement> | null | undefined,
): boolean {
  const preset = VEHICLE_PRESETS[size] || [];
  if (preset.length === 0) return false;
  return preset.every((partId) => {
    const m = partMeasurements?.[partId];
    return m && Number(m.width) > 0 && Number(m.length) > 0;
  });
}

export function countIncompleteVehicles(
  rows: { size: string; part_measurements: Record<string, PartMeasurement> }[],
): number {
  return rows.filter((r) => !isVehicleMeasurementsComplete(r.size, r.part_measurements)).length;
}
