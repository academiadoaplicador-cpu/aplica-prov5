import * as XLSX from 'xlsx';
import { Vehicle } from '../types';
import { getVehiclePartList } from './vehiclePartsUtils';

/** Cabeçalhos compatíveis com o modelo de importação da base de veículos. */
export const VEHICLE_EXPORT_HEADERS = ['Marca', 'Modelo', 'Ano', 'Peça', 'Largura (m)', 'Altura (m)'] as const;

export function vehiclesToExportRows(vehicles: Vehicle[]): unknown[][] {
  const rows: unknown[][] = [];

  for (const vehicle of vehicles) {
    const parts = getVehiclePartList(vehicle);
    for (const part of parts) {
      const measurement = vehicle.partMeasurements[part.id];
      rows.push([
        vehicle.make,
        vehicle.model,
        vehicle.year,
        measurement?.name ?? part.name,
        measurement?.width ?? 0,
        measurement?.length ?? 0,
      ]);
    }
  }

  return rows.sort((a, b) => {
    const makeCmp = String(a[0]).localeCompare(String(b[0]), 'pt-BR');
    if (makeCmp !== 0) return makeCmp;
    const modelCmp = String(a[1]).localeCompare(String(b[1]), 'pt-BR');
    if (modelCmp !== 0) return modelCmp;
    return String(a[3]).localeCompare(String(b[3]), 'pt-BR');
  });
}

export function downloadVehiclesCatalog(vehicles: Vehicle[], filename?: string): void {
  const date = new Date().toISOString().slice(0, 10);
  const rows = [VEHICLE_EXPORT_HEADERS, ...vehiclesToExportRows(vehicles)];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [14, 18, 8, 32, 12, 12].map((wch) => ({ wch }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Base_de_Dados');
  XLSX.writeFile(workbook, filename ?? `catalogo-veiculos-aplica-pro-${date}.xlsx`);
}
