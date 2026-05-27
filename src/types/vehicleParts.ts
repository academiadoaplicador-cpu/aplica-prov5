import { VehiclePart, VehicleSize, Vehicle } from './index';

export const VEHICLE_PARTS_DATA: VehiclePart[] = [
  { id: 'CAP', name: 'Capô', difficulty: 2 },
  { id: 'TET', name: 'Teto', difficulty: 2 },
  { id: 'MAL', name: 'Porta-Malas', difficulty: 2 },
  { id: 'PCD', name: 'Paralama Dianteiro Dir.', difficulty: 3 },
  { id: 'PCE', name: 'Paralama Dianteiro Esq.', difficulty: 3 },
  { id: 'PTD', name: 'Paralama Traseiro Dir.', difficulty: 3 },
  { id: 'PTE', name: 'Paralama Traseiro Esq.', difficulty: 3 },
  { id: 'PDD', name: 'Porta Dianteira Dir.', difficulty: 2 },
  { id: 'PDE', name: 'Porta Dianteira Esq.', difficulty: 2 },
  { id: 'PTD_DOOR', name: 'Porta Traseira Dir.', difficulty: 2 },
  { id: 'PTE_DOOR', name: 'Porta Traseira Esq.', difficulty: 2 },
  { id: 'PCD_BUMP', name: 'Parachoque Dianteiro', difficulty: 3 },
  { id: 'PCT_BUMP', name: 'Parachoque Traseiro', difficulty: 3 },
  { id: 'SAI_D', name: 'Saia Lateral Dir.', difficulty: 1 },
  { id: 'SAI_E', name: 'Saia Lateral Esq.', difficulty: 1 },
  { id: 'RET_D', name: 'Retrovisor Dir.', difficulty: 3 },
  { id: 'RET_E', name: 'Retrovisor Esq.', difficulty: 3 },
  { id: 'MAC_D', name: 'Maçanetas (Kit)', difficulty: 2 },
  { id: 'AER', name: 'Aerofólio', difficulty: 3 },
  { id: 'COL', name: 'Colunas', difficulty: 1 },
  { id: 'GRA', name: 'Grade/Detalhes', difficulty: 3 },
];

export const VEHICLES_DATABASE: Vehicle[] = [
  {
    id: 'V1',
    make: 'Honda',
    model: 'Civic G10',
    year: '2020',
    size: VehicleSize.MEDIUM,
    partMeasurements: {
      'CAP': { width: 1.52, length: 2.0 }, 
      'TET': { width: 1.52, length: 2.2 }, 
      'MAL': { width: 1.52, length: 1.5 }, 
      'PCD': { width: 1.52, length: 1.2 }, 
      'PCE': { width: 1.52, length: 1.2 }, 
      'PTD': { width: 1.52, length: 1.8 }, 
      'PTE': { width: 1.52, length: 1.8 }, 
      'PDD': { width: 1.52, length: 1.5 }, 
      'PDE': { width: 1.52, length: 1.5 }, 
      'PTD_DOOR': { width: 1.52, length: 1.4 }, 
      'PTE_DOOR': { width: 1.52, length: 1.4 }, 
      'PCD_BUMP': { width: 1.52, length: 2.5 }, 
      'PCT_BUMP': { width: 1.52, length: 2.5 }, 
      'RET_D': { width: 0.5, length: 0.5 }, 
      'RET_E': { width: 0.5, length: 0.5 }, 
      'SAI_D': { width: 0.3, length: 2.0 }, 
      'SAI_E': { width: 0.3, length: 2.0 }, 
      'COL': { width: 0.2, length: 1.0 }, 
      'MAC_D': { width: 0.5, length: 0.5 }
    }
  },
  {
    id: 'V2',
    make: 'Toyota',
    model: 'Corolla',
    year: '2022',
    size: VehicleSize.MEDIUM,
    partMeasurements: {
      'CAP': { width: 1.52, length: 1.8 }, 
      'TET': { width: 1.52, length: 2.1 }, 
      'MAL': { width: 1.52, length: 1.4 }, 
      'PCD': { width: 1.52, length: 1.1 }, 
      'PCE': { width: 1.52, length: 1.1 }, 
      'PTD': { width: 1.52, length: 1.7 }, 
      'PTE': { width: 1.52, length: 1.7 }, 
      'PDD': { width: 1.52, length: 1.4 }, 
      'PDE': { width: 1.52, length: 1.4 }, 
      'PTD_DOOR': { width: 1.52, length: 1.3 }, 
      'PTE_DOOR': { width: 1.52, length: 1.3 }, 
      'PCD_BUMP': { width: 1.52, length: 2.4 }, 
      'PCT_BUMP': { width: 1.52, length: 2.4 }, 
      'RET_D': { width: 0.4, length: 0.4 }, 
      'RET_E': { width: 0.4, length: 0.4 }, 
      'SAI_D': { width: 0.3, length: 1.9 }, 
      'SAI_E': { width: 0.3, length: 1.9 }, 
      'COL': { width: 0.2, length: 0.9 }, 
      'MAC_D': { width: 0.4, length: 0.4 }
    }
  },
  {
    id: 'V3',
    make: 'Volkswagen',
    model: 'Gol G7',
    year: '2019',
    size: VehicleSize.SMALL,
    partMeasurements: {
      'CAP': { width: 1.52, length: 1.5 }, 
      'TET': { width: 1.52, length: 1.8 }, 
      'MAL': { width: 1.52, length: 1.2 }, 
      'PCD': { width: 1.52, length: 1.0 }, 
      'PCE': { width: 1.52, length: 1.0 }, 
      'PTD': { width: 1.52, length: 1.5 }, 
      'PTE': { width: 1.52, length: 1.5 }, 
      'PDD': { width: 1.52, length: 1.3 }, 
      'PDE': { width: 1.52, length: 1.3 }, 
      'PCD_BUMP': { width: 1.52, length: 2.0 }, 
      'PCT_BUMP': { width: 1.52, length: 2.0 }, 
      'RET_D': { width: 0.4, length: 0.4 }, 
      'RET_E': { width: 0.4, length: 0.4 }, 
      'SAI_D': { width: 0.2, length: 1.6 }, 
      'SAI_E': { width: 0.2, length: 1.6 }
    }
  }
];

export const VEHICLE_PRESETS: Record<VehicleSize, string[]> = {
  [VehicleSize.SMALL]: ['CAP', 'TET', 'MAL', 'PCD', 'PCE', 'PTD', 'PTE', 'PDD', 'PDE', 'PCD_BUMP', 'PCT_BUMP', 'RET_D', 'RET_E', 'SAI_D', 'SAI_E'],
  [VehicleSize.MEDIUM]: ['CAP', 'TET', 'MAL', 'PCD', 'PCE', 'PTD', 'PTE', 'PDD', 'PDE', 'PTD_DOOR', 'PTE_DOOR', 'PCD_BUMP', 'PCT_BUMP', 'RET_D', 'RET_E', 'SAI_D', 'SAI_E', 'COL'],
  [VehicleSize.LARGE]: ['CAP', 'TET', 'MAL', 'PCD', 'PCE', 'PTD', 'PTE', 'PDD', 'PDE', 'PTD_DOOR', 'PTE_DOOR', 'PCD_BUMP', 'PCT_BUMP', 'RET_D', 'RET_E', 'SAI_D', 'SAI_E', 'COL', 'AER', 'MAC_D'],
  [VehicleSize.XLARGE]: ['CAP', 'TET', 'MAL', 'PCD', 'PCE', 'PTD', 'PTE', 'PDD', 'PDE', 'PTD_DOOR', 'PTE_DOOR', 'PCD_BUMP', 'PCT_BUMP', 'RET_D', 'RET_E', 'SAI_D', 'SAI_E', 'COL', 'AER', 'MAC_D', 'GRA'],
};
