import * as XLSX from 'xlsx';
import { SupplierImportResult, SupplierInput, SupplierProductLink } from '../types';
import { sanitizeCellText, splitSemicolonValues } from './materialImport';
import { digitsOnly } from './phone';
import { digitsOnlyCnpj, isValidCnpj } from './cnpj';

export interface SupplierImportPreview {
  suppliers: SupplierInput[];
  errors: string[];
  skipped: number;
  serverResult?: SupplierImportResult;
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getCell(row: Record<string, unknown>, ...aliases: string[]): unknown {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const target = normalizeKey(alias);
    const exact = entries.find(([key]) => normalizeKey(key) === target);
    if (exact) return exact[1];
  }
  for (const alias of aliases) {
    const target = normalizeKey(alias);
    const partial = entries.find(([key]) => {
      const keyNorm = normalizeKey(key);
      return keyNorm.includes(target) || target.includes(keyNorm);
    });
    if (partial) return partial[1];
  }
  return undefined;
}

function parseStatus(value: unknown): boolean {
  const str = sanitizeCellText(value).toLowerCase();
  if (!str) return true;
  if (['inativo', 'inactive', 'off', 'nao', 'não', '0', 'false'].includes(str)) return false;
  return true;
}

function parseProductLinks(
  brandRaw: unknown,
  lineRaw: unknown,
  rowNum: number,
  errors: string[],
): SupplierProductLink[] {
  const brands = splitSemicolonValues(sanitizeCellText(brandRaw));
  const lines = splitSemicolonValues(sanitizeCellText(lineRaw));

  if (brands.length === 0 && lines.length === 0) return [];
  if (brands.length === 0 && lines.length > 0) {
    errors.push(`Linha ${rowNum}: Linha/Produto informado sem Marca`);
    return [];
  }
  if (lines.length === 0 && brands.length > 0) {
    errors.push(`Linha ${rowNum}: Marca informada sem Linha/Produto`);
    return [];
  }
  if (brands.length !== lines.length) {
    errors.push(
      `Linha ${rowNum}: quantidade de Marcas (${brands.length}) difere de Linhas (${lines.length})`,
    );
    return [];
  }

  return brands.map((brand, i) => ({
    brand,
    line: lines[i],
    isPrimary: i === 0,
  }));
}

function supplierKey(cnpj: string): string {
  return digitsOnlyCnpj(cnpj);
}

export function parseSuppliersSpreadsheet(buffer: ArrayBuffer): SupplierImportPreview {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const errors: string[] = [];
  let skipped = 0;
  const byKey = new Map<string, SupplierInput>();

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const legalName = sanitizeCellText(
      getCell(row, 'Razão social', 'Razao social', 'Nome', 'name', 'fornecedor'),
    );
    const cnpj = digitsOnlyCnpj(sanitizeCellText(getCell(row, 'CNPJ', 'cnpj')));
    const city = sanitizeCellText(getCell(row, 'Cidade', 'city'));
    const state = sanitizeCellText(getCell(row, 'UF', 'Estado', 'state')).toUpperCase();
    const whatsappRaw = sanitizeCellText(getCell(row, 'WhatsApp', 'whatsapp', 'telefone', 'celular'));
    const whatsapp = digitsOnly(whatsappRaw);

    if (!legalName && !cnpj && !whatsapp) return;

    if (!legalName) {
      errors.push(`Linha ${rowNum}: Razão social é obrigatória`);
      skipped++;
      return;
    }
    if (!isValidCnpj(cnpj)) {
      errors.push(`Linha ${rowNum}: CNPJ inválido`);
      skipped++;
      return;
    }
    if (!city) {
      errors.push(`Linha ${rowNum}: Cidade é obrigatória`);
      skipped++;
      return;
    }
    if (!state || state.length !== 2) {
      errors.push(`Linha ${rowNum}: UF inválida`);
      skipped++;
      return;
    }
    if (!whatsapp || whatsapp.length < 10) {
      errors.push(`Linha ${rowNum}: WhatsApp inválido`);
      skipped++;
      return;
    }

    const email = sanitizeCellText(getCell(row, 'E-mail', 'email', 'e-mail')) || undefined;
    const isActive = parseStatus(getCell(row, 'Status', 'status', 'ativo'));
    const productLinks = parseProductLinks(
      getCell(row, 'Marca', 'marca', 'brand'),
      getCell(row, 'Linha / Produto', 'linha', 'produto', 'line'),
      rowNum,
      errors,
    );

    const key = supplierKey(cnpj);
    const contact = { city, state, whatsapp };
    const existing = byKey.get(key);

    if (existing) {
      const mergedLinks = [...(existing.productLinks || [])];
      for (const link of productLinks) {
        const linkKey = `${normalizeKey(link.brand)}::${normalizeKey(link.line)}`;
        if (!mergedLinks.some((l) => `${normalizeKey(l.brand)}::${normalizeKey(l.line)}` === linkKey)) {
          mergedLinks.push(link);
        }
      }

      const mergedContacts = [...(existing.contacts || [])];
      const contactExists = mergedContacts.some(
        (c) =>
          normalizeKey(c.city) === normalizeKey(city) &&
          c.state === state &&
          digitsOnly(c.whatsapp) === whatsapp,
      );
      if (!contactExists) mergedContacts.push(contact);

      byKey.set(key, {
        ...existing,
        legalName,
        email: email || existing.email,
        isActive,
        contacts: mergedContacts,
        productLinks: mergedLinks,
      });
    } else {
      byKey.set(key, {
        legalName,
        cnpj,
        email,
        isActive,
        contacts: [contact],
        productLinks,
      });
    }
  });

  return {
    suppliers: Array.from(byKey.values()),
    errors,
    skipped,
  };
}
