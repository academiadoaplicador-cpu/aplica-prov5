import { Vehicle, VehicleSize } from '../types';
import { VEHICLE_PARTS_DATA, VEHICLE_PRESETS } from '../types/vehicleParts';

export interface VehiclePartInfo {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3;
  isCustom: boolean;
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

const STANDARD_PART_ALIASES: Record<string, string> = {
  capo: 'CAP',
  teto: 'TET',
  'porta malas': 'MAL',
  'porta mala': 'MAL',
  'paralama dianteiro direito': 'PCD',
  'para lama dianteiro direito': 'PCD',
  'borda do paralamas dianteiro direito': 'PCD',
  'paralama dianteiro esquerdo': 'PCE',
  'para lama dianteiro esquerdo': 'PCE',
  'borda do paralamas dianteiro esquerdo': 'PCE',
  'paralama traseiro direito': 'PTD',
  'para lama traseiro direito': 'PTD',
  'para lama traseiro direito com longarinas': 'PTD',
  'borda do paralamas traseiro direito': 'PTD',
  'paralama traseiro esquerdo': 'PTE',
  'para lama traseiro esquerdo': 'PTE',
  'para lama traseiro esquerdo com longarinas': 'PTE',
  'borda do paralamas traseiro esquerdo': 'PTE',
  'porta dianteira direita': 'PDD',
  'porta dianteira esquerda': 'PDE',
  'porta traseira direita': 'PTD_DOOR',
  'porta traseira esquerda': 'PTE_DOOR',
  'parachoque dianteiro': 'PCD_BUMP',
  'parachoque traseiro': 'PCT_BUMP',
  'retrovisor direito': 'RET_D',
  'retrovisor esquerdo': 'RET_E',
  retrovisor: 'RET_D',
  'saia lateral direita': 'SAI_D',
  'saia lateral esquerda': 'SAI_E',
  aerofolio: 'AER',
  colunas: 'COL',
  coluna: 'COL',
  'grade detalhes': 'GRA',
  'macanetas kit': 'MAC_D',
};

export function slugifyPartName(name: string): string {
  return normalizeKey(name).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function mapPartNameToId(partName: string): { id: string; isCustom: boolean } | null {
  const normalized = normalizeKey(partName);
  const standardId = STANDARD_PART_ALIASES[normalized];
  if (standardId) return { id: standardId, isCustom: false };
  return null;
}

export const STANDARD_PART_IDS = new Set(VEHICLE_PARTS_DATA.map((p) => p.id));

export function filterStandardPartMeasurements(
  measurements: Vehicle['partMeasurements'],
): Vehicle['partMeasurements'] {
  return Object.fromEntries(
    Object.entries(measurements || {}).filter(([id]) => STANDARD_PART_IDS.has(id)),
  );
}

export function humanizePartId(id: string): string {
  return id
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getPartInfo(partId: string): VehiclePartInfo {
  const known = VEHICLE_PARTS_DATA.find((p) => p.id === partId);
  if (known) {
    return { id: known.id, name: known.name, difficulty: known.difficulty, isCustom: false };
  }
  return { id: partId, name: humanizePartId(partId), difficulty: 2, isCustom: true };
}

export function getVehiclePartList(vehicle: Vehicle): VehiclePartInfo[] {
  const presetIds = VEHICLE_PRESETS[vehicle.size] || [];
  return presetIds.map((id) => getPartInfo(id));
}

export function getVehiclePartsWithMeasurements(vehicle: Vehicle): VehiclePartInfo[] {
  const presetIds = VEHICLE_PRESETS[vehicle.size] || [];
  return presetIds
    .filter((id) => {
      const m = vehicle.partMeasurements?.[id];
      return m && m.width > 0 && m.length > 0;
    })
    .map((id) => getPartInfo(id));
}

export function inferVehicleSize(partIds: string[]): VehicleSize {
  const hasXLarge = partIds.some((id) => ['GRA', 'AER'].includes(id));
  const hasLarge = partIds.some((id) => ['MAC_D', 'PTD_DOOR', 'PTE_DOOR'].includes(id));
  const hasMedium = partIds.some((id) => ['COL', 'PTD_DOOR', 'PTE_DOOR'].includes(id));

  if (hasXLarge) return VehicleSize.XLARGE;
  if (hasLarge) return VehicleSize.LARGE;
  if (hasMedium) return VehicleSize.MEDIUM;
  return VehicleSize.MEDIUM;
}

export interface VehiclePartMeasurementStatus extends VehiclePartInfo {
  hasMeasurement: boolean;
}

export function hasPartMeasurement(vehicle: Vehicle, partId: string): boolean {
  const m = vehicle.partMeasurements?.[partId];
  return Boolean(m && m.width > 0 && m.length > 0);
}

export function getVehiclePartsWithMeasurementStatus(
  vehicle: Vehicle,
): VehiclePartMeasurementStatus[] {
  const presetIds = VEHICLE_PRESETS[vehicle.size] || [];
  return presetIds.map((id) => ({
    ...getPartInfo(id),
    hasMeasurement: hasPartMeasurement(vehicle, id),
  }));
}

export function getMissingMeasurementParts(vehicle: Vehicle): VehiclePartInfo[] {
  return getVehiclePartsWithMeasurementStatus(vehicle)
    .filter((p) => !p.hasMeasurement)
    .map(({ id, name, difficulty, isCustom }) => ({ id, name, difficulty, isCustom }));
}

export function isVehicleMeasurementsComplete(vehicle: Vehicle): boolean {
  const preset = VEHICLE_PRESETS[vehicle.size] || [];
  return preset.every((partId) => {
    const m = vehicle.partMeasurements?.[partId];
    return m && m.width > 0 && m.length > 0;
  });
}
