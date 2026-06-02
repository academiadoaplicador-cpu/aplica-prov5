import { jsPDF } from 'jspdf';
import { Budget, BudgetPiece, Material } from '../types';
import { formatCurrency } from '../lib/utils';
import { databaseService } from './databaseService';
import { VEHICLE_PARTS_DATA } from '../types/vehicleParts';
import { getMaterialRollDimensions } from '../utils/materialRoll';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 278;

const C = {
  slate950: '#020617',
  slate900: '#0f172a',
  slate800: '#1e293b',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  white: '#ffffff',
  indigo600: '#4f46e5',
  indigo500: '#6366f1',
  indigo100: '#e0e7ff',
  emerald600: '#059669',
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function fill(doc: jsPDF, hex: string) {
  doc.setFillColor(...hexToRgb(hex));
}

function stroke(doc: jsPDF, hex: string) {
  doc.setDrawColor(...hexToRgb(hex));
}

function textColor(doc: jsPDF, hex: string) {
  doc.setTextColor(...hexToRgb(hex));
}

const DEFAULT_LOGO = '/logo.png';

type PdfImage = { dataUrl: string; aspect: number };

async function loadImageForPdf(src: string): Promise<PdfImage | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        aspect: img.naturalWidth / img.naturalHeight,
      });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function resolvePdfLogo(profilePhotoUrl?: string): Promise<PdfImage | null> {
  if (profilePhotoUrl?.trim()) {
    const custom = await loadImageForPdf(profilePhotoUrl);
    if (custom) return custom;
  }
  return loadImageForPdf(DEFAULT_LOGO);
}

function formatBudgetRef(id: string | undefined | null): string {
  if (!id) return '00000000';
  const clean = String(id).replace(/-/g, '').toUpperCase();
  return clean.length > 8 ? clean.slice(-8) : clean;
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return new Date().toLocaleDateString('pt-BR');
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return new Date().toLocaleDateString('pt-BR');
  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatMeters(value: number | string | undefined | null): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0,00';
  return n.toFixed(2).replace('.', ',');
}

function budgetNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pdfUnit(value: string, unit: 'm' | 'm2' | 'h'): string {
  if (unit === 'm2') return `${value} m2`;
  if (unit === 'h') return `${value} h`;
  return `${value} m`;
}

function safeText(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function getAutomotivePieceNames(budget: Budget): string[] {
  const items = budget.items ?? [];
  return items
    .map((item) => VEHICLE_PARTS_DATA.find((p) => p.id === item.partId)?.name)
    .filter((name): name is string => Boolean(name));
}

function getDecorativePieces(budget: Budget): BudgetPiece[] {
  const items = budget.items ?? [];
  return items.filter((item) => item.name && String(item.name).trim().length > 0);
}

function truncateLines(
  doc: jsPDF,
  text: string | undefined | null,
  maxWidth: number,
  maxLines: number,
): string[] {
  const safe = safeText(text).trim();
  if (!safe) return [''];
  const lines = doc.splitTextToSize(safe, maxWidth) as string[];
  if (lines.length <= maxLines) return lines;
  const trimmed = lines.slice(0, maxLines);
  const lastLine = trimmed[maxLines - 1];
  if (lastLine) {
    trimmed[maxLines - 1] = `${lastLine.replace(/\.\.\.$/, '')}...`;
  }
  return trimmed;
}

class PdfBuilder {
  doc: jsPDF;
  y = 0;
  accent: string;

  constructor(accent: string) {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
    this.accent = accent;
  }

  /** Garante espaço na página atual; adiciona nova página se necessário. */
  ensureSpace(neededHeight: number) {
    if (this.y + neededHeight > FOOTER_Y) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  private drawCard(x: number, y: number, w: number, h: number, fillColor: string, borderColor: string) {
    fill(this.doc, fillColor);
    stroke(this.doc, borderColor);
    this.doc.setLineWidth(0.35);
    this.doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  }

  sectionTitle(title: string) {
    this.y += 4;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.5);
    textColor(this.doc, C.slate500);
    this.doc.text(title, MARGIN, this.y);
    stroke(this.doc, C.slate200);
    this.doc.setLineWidth(0.25);
    this.doc.line(MARGIN, this.y + 1.5, MARGIN + CONTENT_W, this.y + 1.5);
    this.y += 7;
  }

  drawHeader(params: {
    businessName: string;
    logo: PdfImage | null;
    phone?: string;
    address?: string;
    ref: string;
    date: string;
  }) {
    const headerH = 38;
    fill(this.doc, C.slate950);
    this.doc.rect(0, 0, PAGE_W, headerH, 'F');
    fill(this.doc, this.accent);
    this.doc.rect(0, headerH, PAGE_W, 1, 'F');

    const logoH = 12;
    let textX = MARGIN;

    if (params.logo) {
      const logoW = logoH * params.logo.aspect;
      this.doc.addImage(params.logo.dataUrl, 'PNG', MARGIN, 9, logoW, logoH);
      textX = MARGIN + logoW + 5;
    }

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(13);
    textColor(this.doc, C.white);
    this.doc.text(params.businessName, textX, 16);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.5);
    textColor(this.doc, C.slate400);
    this.doc.text('Envelopamento profissional', textX, 21);

    const contactLines = [params.phone, params.address].filter(Boolean) as string[];
    contactLines.slice(0, 2).forEach((line, i) => {
      const truncated =
        line.length > 52 ? `${line.slice(0, 49)}...` : line;
      this.doc.text(truncated, textX, 26 + i * 4.5);
    });

    const badgeW = 48;
    const badgeX = PAGE_W - MARGIN - badgeW;
    fill(this.doc, C.slate900);
    stroke(this.doc, this.accent);
    this.doc.setLineWidth(0.4);
    this.doc.roundedRect(badgeX, 8, badgeW, 22, 2.5, 2.5, 'FD');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.5);
    textColor(this.doc, C.indigo100);
    this.doc.text('ORÇAMENTO', badgeX + badgeW / 2, 14.5, { align: 'center' });

    this.doc.setFontSize(10);
    textColor(this.doc, C.white);
    this.doc.text(`#${params.ref}`, badgeX + badgeW / 2, 20.5, { align: 'center' });

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.5);
    textColor(this.doc, C.slate400);
    this.doc.text(params.date, badgeX + badgeW / 2, 26, { align: 'center' });

    this.y = headerH + 8;
  }

  drawClientProject(params: {
    customerName: string;
    projectLabel: string;
    typeLabel: string;
    pieceSummary?: string;
  }) {
    const colW = (CONTENT_W - 5) / 2;
    const cardH = 22;
    this.drawCard(MARGIN, this.y, colW, cardH, C.slate100, C.slate200);
    this.drawCard(MARGIN + colW + 5, this.y, colW, cardH, C.slate100, C.slate200);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.5);
    textColor(this.doc, C.slate500);
    this.doc.text('CLIENTE', MARGIN + 4, this.y + 6);
    this.doc.text('PROJETO', MARGIN + colW + 9, this.y + 6);

    this.doc.setFontSize(10);
    textColor(this.doc, C.slate900);
    this.doc.text(params.customerName || '—', MARGIN + 4, this.y + 12);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.5);
    textColor(this.doc, C.slate700);
    const projectLines = truncateLines(this.doc, params.projectLabel, colW - 8, 2);
    this.doc.text(projectLines, MARGIN + colW + 9, this.y + 12);

    this.doc.setFontSize(6.5);
    textColor(this.doc, this.accent);
    this.doc.text(params.typeLabel, MARGIN + 4, this.y + 18);

    if (params.pieceSummary) {
      textColor(this.doc, C.slate500);
      this.doc.text(params.pieceSummary, MARGIN + colW + 9, this.y + 18);
    }

    this.y += cardH + 6;
  }

  drawMaterial(params: {
    name: string;
    meta: string;
    colorTexture: string;
    rollInfo?: string;
    durability?: string;
  }) {
    const innerW = CONTENT_W - 12;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.5);

    const lines: string[] = [];
    if (params.meta) lines.push(params.meta);
    lines.push(`Cor / textura: ${params.colorTexture}`);
    if (params.rollInfo) lines.push(params.rollInfo);
    if (params.durability) lines.push(`Durabilidade: ${params.durability}`);

    const wrappedLines = lines.flatMap((line) =>
      truncateLines(this.doc, line, innerW, 2),
    );
    const cardH = 14 + wrappedLines.length * 4;

    this.drawCard(MARGIN, this.y, CONTENT_W, cardH, C.white, C.slate200);
    fill(this.doc, this.accent);
    this.doc.rect(MARGIN, this.y, 2.5, cardH, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    textColor(this.doc, C.slate900);
    this.doc.text(truncateLines(this.doc, params.name, innerW, 1)[0], MARGIN + 6, this.y + 8);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.5);
    textColor(this.doc, C.slate600);
    wrappedLines.forEach((line, i) => {
      this.doc.text(line, MARGIN + 6, this.y + 13 + i * 4);
    });

    this.y += cardH + 6;
  }

  drawPiecesList(title: string, pieces: string[]) {
    if (pieces.length === 0) return;

    const cols = pieces.length > 6 ? 2 : 1;
    const rowsPerCol = Math.ceil(pieces.length / cols);
    const maxRows = Math.min(rowsPerCol, 10);
    const cardH = maxRows * 4.5 + 6;
    this.ensureSpace(11 + cardH + 4);

    this.sectionTitle(title);

    this.drawCard(MARGIN, this.y, CONTENT_W, cardH, C.white, C.slate200);

    const colW = cols === 2 ? (CONTENT_W - 4) / 2 : CONTENT_W;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.5);
    textColor(this.doc, C.slate700);

    const displayPieces = pieces.slice(0, cols * maxRows);
    displayPieces.forEach((name, i) => {
      const col = cols === 2 ? i % 2 : 0;
      const row = cols === 2 ? Math.floor(i / 2) : i;
      const x = MARGIN + 4 + col * (colW + 4);
      const lineY = this.y + 5 + row * 4.5;
      const label = truncateLines(this.doc, name, colW - 6, 1)[0];
      this.doc.text(`• ${label}`, x, lineY);
    });

    if (pieces.length > displayPieces.length) {
      textColor(this.doc, C.slate500);
      this.doc.setFontSize(6.5);
      this.doc.text(
        `+ ${pieces.length - displayPieces.length} peça(s)`,
        MARGIN + 4,
        this.y + cardH - 2,
      );
    }

    this.y += cardH + 4;
  }

  drawMetrics(metrics: { label: string; value: string }[]) {
    const metricH = 22;
    this.ensureSpace(11 + metricH + 8);

    this.sectionTitle('ESTIMATIVAS TÉCNICAS');

    const gap = 4;
    const metricW = (CONTENT_W - gap * (metrics.length - 1)) / metrics.length;

    metrics.forEach((m, i) => {
      const mx = MARGIN + i * (metricW + gap);
      this.drawCard(mx, this.y, metricW, metricH, C.slate100, C.slate200);

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6);
      textColor(this.doc, C.slate500);
      const labelLines = truncateLines(this.doc, m.label.toUpperCase(), metricW - 4, 2);
      labelLines.forEach((line, li) => {
        this.doc.text(line, mx + metricW / 2, this.y + 6 + li * 3.2, { align: 'center' });
      });

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(11);
      textColor(this.doc, C.slate900);
      this.doc.text(m.value, mx + metricW / 2, this.y + 17, { align: 'center' });
    });

    this.y += metricH + 8;
  }

  drawTotalPrice(totalPrice: number) {
    const boxH = 22;
    this.ensureSpace(boxH + 8);

    fill(this.doc, this.accent);
    this.doc.roundedRect(MARGIN, this.y, CONTENT_W, boxH, 2.5, 2.5, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.5);
    textColor(this.doc, C.indigo100);
    this.doc.text('INVESTIMENTO TOTAL', MARGIN + 6, this.y + 9);

    this.doc.setFontSize(17);
    textColor(this.doc, C.white);
    this.doc.text(formatCurrency(totalPrice), PAGE_W - MARGIN - 6, this.y + 17, {
      align: 'right',
    });

    this.y += boxH + 8;
  }

  drawTerms() {
    this.ensureSpace(11 + 36);

    this.sectionTitle('TERMOS E CONDIÇÕES');

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7);
    textColor(this.doc, C.slate600);

    const terms = [
      'Validade: 10 dias corridos a partir da emissão.',
      'Prazo de execução: a combinar conforme agenda.',
      'Garantia de 6 meses contra descolamentos ou defeitos de aplicação.',
      'Pagamento e condições comerciais: a definir na aprovação.',
    ];

    const maxY = FOOTER_Y - 12;
    terms.forEach((term, i) => {
      if (this.y > maxY) return;
      const lines = truncateLines(this.doc, `${i + 1}. ${term}`, CONTENT_W, 2);
      this.doc.text(lines, MARGIN, this.y);
      this.y += lines.length * 3.6 + 1;
    });
  }

  drawFooter(email?: string) {
    stroke(this.doc, C.slate200);
    this.doc.setLineWidth(0.25);
    this.doc.line(MARGIN, FOOTER_Y - 3, PAGE_W - MARGIN, FOOTER_Y - 3);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.5);
    textColor(this.doc, this.accent);
    this.doc.text('APLICA PRO', PAGE_W / 2, FOOTER_Y + 1, { align: 'center' });

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6);
    textColor(this.doc, C.slate400);
    this.doc.text(
      'Tecnologia para envelopamento · Documento gerado eletronicamente',
      PAGE_W / 2,
      FOOTER_Y + 5,
      { align: 'center' },
    );

    if (email) {
      this.doc.text(email, PAGE_W / 2, FOOTER_Y + 9, { align: 'center' });
    }
  }

  save(filename: string) {
    try {
      const blob = this.doc.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      this.doc.save(filename);
    }
  }
}

export const pdfService = {
  generateBudgetPDF: async (
    budget: Budget,
    options?: { material?: Material | null },
  ) => {
    let user = null;
    let materials: Awaited<ReturnType<typeof databaseService.getMaterials>> = [];
    let profile = null;

    try {
      [user, materials] = await Promise.all([
        databaseService.getUser(),
        databaseService.getMaterials().catch(() => []),
      ]);
      if (user) {
        profile = await databaseService.getProfile(user.id).catch(() => null);
      }
    } catch (e) {
      throw new Error(
        e instanceof Error
          ? e.message
          : 'Erro ao carregar dados para o PDF. Verifique sua conexão.',
      );
    }

    try {
      const logo = await resolvePdfLogo(profile?.photoUrl);

    const material =
      options?.material ??
      materials.find((m) => m.id === budget.materialId);
    const rollDims = getMaterialRollDimensions(material);
    const businessName = user?.businessName || 'Aplica PRO';
    const isAutomotive = budget.type === 'Automotivo';
    const accent = isAutomotive ? C.indigo600 : C.emerald600;

    const projectLabel =
      budget.vehicleModel || budget.applianceModel || 'Projeto personalizado';
    const typeLabel = budget.subType
      ? `${budget.type} · ${budget.subType}`
      : budget.type;

    const automotivePieces = isAutomotive ? getAutomotivePieceNames(budget) : [];
    const decorativePieces = !isAutomotive ? getDecorativePieces(budget) : [];
    const decorativeLabels = decorativePieces.map((p) => p.name!);

    const pieceSummary = isAutomotive
      ? automotivePieces.length > 0
        ? `${automotivePieces.length} peça${automotivePieces.length > 1 ? 's' : ''}`
        : undefined
      : decorativeLabels.length > 0
        ? `${decorativeLabels.length} face${decorativeLabels.length > 1 ? 's' : ''}`
        : undefined;

    const materialMeta = [
      material?.brand,
      material?.type,
      material?.line,
    ]
      .filter(Boolean)
      .join(' · ');

    const rollInfo = rollDims
      ? `Rolo: ${formatMeters(rollDims.width)} m (larg.) × ${formatMeters(rollDims.length)} m (comp.)`
      : undefined;

    const metrics = isAutomotive
      ? [
          {
            label: 'Comprimento usado',
            value: pdfUnit(formatMeters(budgetNumber(budget.totalMaterialMeters)), 'm'),
          },
          {
            label: 'Material usado + 15%',
            value: pdfUnit(formatMeters(budgetNumber(budget.totalMaterialM2)), 'm2'),
          },
          {
            label: 'Mão de obra',
            value: pdfUnit(budgetNumber(budget.totalHours).toFixed(1), 'h'),
          },
        ]
      : [
          {
            label: 'Comprimento usado',
            value: pdfUnit(formatMeters(budgetNumber(budget.totalMaterialMeters)), 'm'),
          },
          {
            label: 'Material usado + 15%',
            value: pdfUnit(formatMeters(budgetNumber(budget.totalMaterialM2)), 'm2'),
          },
          {
            label: 'Mão de obra',
            value: pdfUnit(budgetNumber(budget.totalHours).toFixed(1), 'h'),
          },
        ];

    const pdf = new PdfBuilder(accent);

    pdf.drawHeader({
      businessName,
      logo,
      phone: profile?.phone,
      address: profile?.address,
      ref: formatBudgetRef(budget.id),
      date: formatDate(budget.date),
    });

    pdf.sectionTitle('DADOS DO ORÇAMENTO');
    pdf.drawClientProject({
      customerName: safeText(budget.customerName, '—'),
      projectLabel,
      typeLabel,
      pieceSummary,
    });

    pdf.sectionTitle('MATERIAL SELECIONADO');
    pdf.drawMaterial({
      name: material?.name || 'Material personalizado',
      meta: materialMeta || '—',
      colorTexture: material?.colorTexture || 'Padrão',
      rollInfo,
      durability: material?.durability,
    });

    pdf.drawMetrics(metrics);
    pdf.drawTotalPrice(budgetNumber(budget.totalPrice));

    if (isAutomotive && automotivePieces.length > 0) {
      pdf.drawPiecesList('PEÇAS INCLUÍDAS', automotivePieces);
    } else if (!isAutomotive && decorativeLabels.length > 0) {
      pdf.drawPiecesList('FACES / PEÇAS INCLUÍDAS', decorativeLabels);
    }

    pdf.drawTerms();
    pdf.drawFooter(user?.email);

    const safeName =
      safeText(budget.customerName, 'Cliente')
        .replace(/\s+/g, '_')
        .replace(/[^\w-]/g, '') || 'Cliente';
    pdf.save(`Orcamento_${safeName}_${formatBudgetRef(budget.id)}.pdf`);
    } catch (e) {
      console.error('[pdfService]', e);
      throw new Error(
        e instanceof Error
          ? e.message
          : 'Erro ao montar o PDF. Tente novamente.',
      );
    }
  },
};
