import * as XLSX from 'xlsx';
import { Vehicle, VehicleSize } from '../types';
import { generateId } from '../lib/utils';
import { inferVehicleSize, mapPartNameToId, filterStandardPartMeasurements } from './vehiclePartsUtils';

export interface VehicleImportResult {
  vehicles: Vehicle[];
  skipped: number;
  errors: string[];
  warnings: string[];
}

const DEFAULT_MAKE = 'BYD';
const DATA_SHEET_NAMES = ['base_de_dados', 'base de dados', 'veiculos', 'veículos'];

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || value === '-') return null;
  if (typeof value === 'string' && value.startsWith('=')) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getCell(row: Record<string, unknown>, ...aliases: string[]): unknown {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const target = normalizeKey(alias);
    const hit = entries.find(([key]) => normalizeKey(key) === target);
    if (hit) return hit[1];
  }
  return undefined;
}

function detectUnit(row: Record<string, unknown>): 'm' | 'cm' {
  const keys = Object.keys(row).map(normalizeKey);
  if (keys.some((k) => k.includes('(cm)'))) return 'cm';
  if (keys.some((k) => k.includes('(m)'))) return 'm';
  if (keys.some((k) => k.includes('largura (cm)') || k.includes('altura (cm)'))) return 'cm';
  return 'm';
}

function toMeters(value: number, unit: 'm' | 'cm'): number {
  if (unit === 'cm') return value / 100;
  // Valores grandes em planilhas rotuladas como metros provavelmente estão em cm
  if (value > 3) return value / 100;
  return value;
}

function vehicleKey(make: string, model: string, year: string): string {
  return `${normalizeKey(make)}|${normalizeKey(model)}|${normalizeKey(year)}`;
}

interface ParsedRow {
  make: string;
  model: string;
  year: string;
  partName: string;
  width: number;
  length: number;
  rowIndex: number;
}

function parseDataRow(
  row: Record<string, unknown>,
  rowIndex: number,
  defaultMake: string,
): ParsedRow | null {
  const make = String(getCell(row, 'marca', 'make', 'fabricante') ?? defaultMake).trim() || defaultMake;
  const model = String(getCell(row, 'modelo', 'model') ?? '').trim();
  const yearRaw = getCell(row, 'ano', 'year');
  const year = yearRaw === '' || yearRaw === null || yearRaw === undefined
    ? ''
    : String(yearRaw).trim();
  const partName = String(getCell(row, 'peça', 'peca', 'part', 'parte') ?? '').trim();

  if (!model || !partName) return null;

  const unit = detectUnit(row);
  const widthRaw = parseNumber(getCell(row, 'largura (m)', 'largura (cm)', 'largura', 'width'));
  const lengthRaw = parseNumber(getCell(row, 'altura (m)', 'altura (cm)', 'altura', 'length', 'comprimento'));

  if (widthRaw === null || lengthRaw === null) return null;

  return {
    make,
    model,
    year,
    partName,
    width: toMeters(widthRaw, unit),
    length: toMeters(lengthRaw, unit),
    rowIndex,
  };
}

function rowsFromSheet(sheet: XLSX.WorkSheet, defaultMake: string): {
  rows: ParsedRow[];
  skipped: number;
  errors: string[];
} {
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const rows: ParsedRow[] = [];
  const errors: string[] = [];
  let skipped = 0;

  rawRows.forEach((row, index) => {
    const rowIndex = index + 2;
    try {
      const parsed = parseDataRow(row, rowIndex, defaultMake);
      if (!parsed) {
        skipped += 1;
        return;
      }
      rows.push(parsed);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `Linha ${rowIndex}: erro ao ler registro.`);
    }
  });

  return { rows, skipped, errors };
}

function buildVehiclesFromRows(rows: ParsedRow[], warnings: string[]): Vehicle[] {
  const grouped = new Map<string, ParsedRow[]>();

  for (const row of rows) {
    const key = vehicleKey(row.make, row.model, row.year);
    const list = grouped.get(key) || [];
    list.push(row);
    grouped.set(key, list);
  }

  const vehicles: Vehicle[] = [];

  for (const [, partRows] of grouped) {
    const first = partRows[0];
    const partMeasurements: Vehicle['partMeasurements'] = {};
    const partIds: string[] = [];

    for (const row of partRows) {
      const mapped = mapPartNameToId(row.partName);
      if (!mapped) continue;

      const { id } = mapped;
      if (partMeasurements[id]) {
        warnings.push(
          `Peça duplicada "${row.partName}" em ${first.make} ${first.model} ${first.year} — mantida a última medida.`,
        );
      }
      partMeasurements[id] = { width: row.width, length: row.length };
      partIds.push(id);
    }

    if (Object.keys(partMeasurements).length === 0) continue;

    vehicles.push({
      id: generateId(),
      make: first.make,
      model: first.model,
      year: first.year || new Date().getFullYear().toString(),
      size: inferVehicleSize(partIds),
      partMeasurements,
    });
  }

  return vehicles;
}

function pickSheets(workbook: XLSX.WorkBook): { name: string; defaultMake: string }[] {
  const baseSheet = workbook.SheetNames.find((name) =>
    DATA_SHEET_NAMES.includes(normalizeKey(name)),
  );

  if (baseSheet) {
    return [{ name: baseSheet, defaultMake: DEFAULT_MAKE }];
  }

  return workbook.SheetNames
    .filter((name) => !normalizeKey(name).includes('instruc'))
    .map((name) => ({ name, defaultMake: DEFAULT_MAKE }));
}

export function parseVehiclesFromExcel(buffer: ArrayBuffer): VehicleImportResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  if (workbook.SheetNames.length === 0) {
    return { vehicles: [], skipped: 0, errors: ['Planilha vazia ou sem abas.'], warnings: [] };
  }

  const sheets = pickSheets(workbook);
  const allRows: ParsedRow[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let skipped = 0;

  for (const { name, defaultMake } of sheets) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const result = rowsFromSheet(sheet, defaultMake);
    allRows.push(...result.rows);
    skipped += result.skipped;
    errors.push(...result.errors);
  }

  const vehicles = buildVehiclesFromRows(allRows, warnings);

  return { vehicles, skipped, errors, warnings };
}

export function mergeVehicles(existing: Vehicle[], imported: Vehicle[]): {
  merged: Vehicle[];
  added: number;
  updated: number;
} {
  const byKey = new Map<string, Vehicle>();
  for (const vehicle of existing) {
    byKey.set(vehicleKey(vehicle.make, vehicle.model, vehicle.year), vehicle);
  }

  let added = 0;
  let updated = 0;

  for (const vehicle of imported) {
    const key = vehicleKey(vehicle.make, vehicle.model, vehicle.year);
    const current = byKey.get(key);
    if (current) {
      byKey.set(key, {
        ...current,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        size: vehicle.size || current.size,
        partMeasurements: filterStandardPartMeasurements({
          ...filterStandardPartMeasurements(current.partMeasurements),
          ...vehicle.partMeasurements,
        }),
      });
      updated += 1;
    } else {
      byKey.set(key, vehicle);
      added += 1;
    }
  }

  return {
    merged: Array.from(byKey.values()).sort(
      (a, b) =>
        a.make.localeCompare(b.make, 'pt-BR') ||
        a.model.localeCompare(b.model, 'pt-BR') ||
        a.year.localeCompare(b.year, 'pt-BR'),
    ),
    added,
    updated,
  };
}
