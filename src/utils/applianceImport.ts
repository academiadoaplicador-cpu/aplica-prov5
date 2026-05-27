import * as XLSX from 'xlsx';
import { Appliance } from '../types';
import { generateId } from '../lib/utils';

export interface ApplianceImportResult {
  appliances: Appliance[];
  skipped: number;
  errors: string[];
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function applianceKey(make: string, type: string, model: string): string {
  return `${normalizeKey(make)}|${normalizeKey(type)}|${normalizeKey(model)}`;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
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

function parseRow(row: Record<string, unknown>, rowIndex: number): Appliance | null {
  const make = String(getCell(row, 'marca', 'make', 'fabricante') ?? '').trim();
  const type = String(getCell(row, 'tipo', 'type') ?? '').trim();
  const model = String(getCell(row, 'modelo', 'model') ?? '').trim();
  const width = parseNumber(getCell(row, 'largura', 'width'));
  const height = parseNumber(getCell(row, 'altura', 'height'));
  const depth = parseNumber(getCell(row, 'profundidade', 'depth', 'prof'));

  if (!make || !type || !model) return null;
  if (width === null || height === null || depth === null) {
    throw new Error(
      `Linha ${rowIndex}: medidas inválidas para ${make} ${model} (largura, altura e profundidade são obrigatórias).`,
    );
  }

  return {
    id: generateId(),
    make,
    type,
    model,
    width,
    height,
    depth,
  };
}

export function parseAppliancesFromExcel(buffer: ArrayBuffer): ApplianceImportResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { appliances: [], skipped: 0, errors: ['Planilha vazia ou sem abas.'] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const appliances: Appliance[] = [];
  const errors: string[] = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    const rowIndex = index + 2;
    try {
      const parsed = parseRow(row, rowIndex);
      if (!parsed) {
        skipped += 1;
        return;
      }
      appliances.push(parsed);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `Linha ${rowIndex}: erro ao ler registro.`);
    }
  });

  return { appliances, skipped, errors };
}

export function mergeAppliances(existing: Appliance[], imported: Appliance[]): {
  merged: Appliance[];
  added: number;
  updated: number;
} {
  const byKey = new Map<string, Appliance>();
  for (const app of existing) {
    byKey.set(applianceKey(app.make, app.type, app.model), app);
  }

  let added = 0;
  let updated = 0;

  for (const app of imported) {
    const key = applianceKey(app.make, app.type, app.model);
    const current = byKey.get(key);
    if (current) {
      byKey.set(key, {
        ...current,
        width: app.width,
        height: app.height,
        depth: app.depth,
        make: app.make,
        type: app.type,
        model: app.model,
      });
      updated += 1;
    } else {
      byKey.set(key, app);
      added += 1;
    }
  }

  return {
    merged: Array.from(byKey.values()).sort((a, b) =>
      a.make.localeCompare(b.make, 'pt-BR') || a.type.localeCompare(b.type, 'pt-BR'),
    ),
    added,
    updated,
  };
}
