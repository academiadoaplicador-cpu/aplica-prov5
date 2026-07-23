import * as XLSX from 'xlsx';
import { Appliance } from '../types';

/** Cabeçalhos compatíveis com o modelo de importação da base de eletrodomésticos. */
export const APPLIANCE_EXPORT_HEADERS = ['Marca', 'Tipo', 'Modelo', 'Largura', 'Altura', 'Profundidade'] as const;

export function appliancesToExportRows(appliances: Appliance[]): unknown[][] {
  return [...appliances]
    .sort((a, b) => {
      const makeCmp = a.make.localeCompare(b.make, 'pt-BR');
      if (makeCmp !== 0) return makeCmp;
      return a.model.localeCompare(b.model, 'pt-BR');
    })
    .map((appliance) => [
      appliance.make,
      appliance.type,
      appliance.model,
      appliance.width,
      appliance.height,
      appliance.depth,
    ]);
}

export function downloadAppliancesCatalog(appliances: Appliance[], filename?: string): void {
  const date = new Date().toISOString().slice(0, 10);
  const rows = [APPLIANCE_EXPORT_HEADERS, ...appliancesToExportRows(appliances)];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [14, 16, 18, 10, 10, 14].map((wch) => ({ wch }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Eletros');
  XLSX.writeFile(workbook, filename ?? `catalogo-eletros-aplica-pro-${date}.xlsx`);
}
