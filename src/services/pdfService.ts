import { jsPDF } from 'jspdf';
import { Budget } from '../types';
import { formatCurrency } from '../lib/utils';
import { databaseService } from './databaseService';
import { VEHICLE_PARTS_DATA } from '../types/vehicleParts';

const PAGE_W = 210;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

const C = {
  slate950: '#020617',
  slate900: '#0f172a',
  slate800: '#1e293b',
  slate700: '#334155',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  white: '#ffffff',
  indigo600: '#4f46e5',
  indigo500: '#6366f1',
  indigo100: '#e0e7ff',
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

function text(doc: jsPDF, hex: string) {
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

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  text(doc, C.slate500);
  doc.text(title, MARGIN, y);
  stroke(doc, C.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 2, MARGIN + CONTENT_W, y + 2);
  return y + 8;
}

function drawCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fillColor: string,
  borderColor: string,
) {
  fill(doc, fillColor);
  stroke(doc, borderColor);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
}

function formatBudgetRef(id: string): string {
  const clean = id.replace(/-/g, '').toUpperCase();
  return clean.length > 8 ? clean.slice(-8) : clean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getPieceNames(budget: Budget): string[] {
  return budget.items
    .map((item) => VEHICLE_PARTS_DATA.find((p) => p.id === item.partId)?.name)
    .filter((name): name is string => Boolean(name));
}

export const pdfService = {
  generateBudgetPDF: async (budget: Budget) => {
    const [user, materials] = await Promise.all([
      databaseService.getUser(),
      databaseService.getMaterials(),
    ]);
    const profile = user ? await databaseService.getProfile(user.id) : null;
    const logo = await resolvePdfLogo(profile?.photoUrl);

    const material = materials.find((m) => m.id === budget.materialId);
    const businessName = user?.businessName || 'Aplica PRO';
    const projectLabel =
      budget.vehicleModel || budget.applianceModel || 'Projeto personalizado';
    const pieceNames = budget.type === 'Automotivo' ? getPieceNames(budget) : [];
    const isAutomotive = budget.type === 'Automotivo';
    const ref = formatBudgetRef(budget.id);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = 0;

    // —— Header escuro (identidade do sistema) ——
    const headerH = 42;
    fill(doc, C.slate950);
    doc.rect(0, 0, PAGE_W, headerH, 'F');

    fill(doc, C.indigo600);
    doc.rect(0, headerH, PAGE_W, 1.2, 'F');

    const logoH = 14;
    let textStartX = MARGIN;

    if (logo) {
      const logoW = logoH * logo.aspect;
      doc.addImage(logo.dataUrl, 'PNG', MARGIN, 10, logoW, logoH);
      textStartX = MARGIN + logoW + 6;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    text(doc, C.white);
    doc.text(businessName, textStartX, 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    text(doc, C.slate400);
    doc.text('Envelopamento profissional', textStartX, 23);

    if (profile?.phone) {
      doc.text(profile.phone, textStartX, 28);
    }
    if (profile?.address) {
      const addr =
        profile.address.length > 48
          ? `${profile.address.slice(0, 45)}...`
          : profile.address;
      doc.text(addr, textStartX, 33);
    }

    // Badge do orçamento
    const badgeW = 52;
    const badgeX = PAGE_W - MARGIN - badgeW;
    fill(doc, C.slate900);
    stroke(doc, C.indigo500);
    doc.setLineWidth(0.5);
    doc.roundedRect(badgeX, 9, badgeW, 24, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    text(doc, C.indigo100);
    doc.text('ORÇAMENTO', badgeX + badgeW / 2, 16, { align: 'center' });

    doc.setFontSize(11);
    text(doc, C.white);
    doc.text(`#${ref}`, badgeX + badgeW / 2, 23, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    text(doc, C.slate400);
    doc.text(formatDate(budget.date), badgeX + badgeW / 2, 29, { align: 'center' });

    y = headerH + 10;

    // —— Cliente e projeto ——
    y = drawSectionTitle(doc, 'DADOS DO ORÇAMENTO', y);

    const colW = (CONTENT_W - 6) / 2;
    const infoCardH = 28;
    drawCard(doc, MARGIN, y, colW, infoCardH, C.slate100, C.slate200);
    drawCard(doc, MARGIN + colW + 6, y, colW, infoCardH, C.slate100, C.slate200);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    text(doc, C.slate500);
    doc.text('CLIENTE', MARGIN + 4, y + 7);
    doc.text(isAutomotive ? 'VEÍCULO' : 'PROJETO', MARGIN + colW + 10, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    text(doc, C.slate900);
    doc.text(budget.customerName || '—', MARGIN + 4, y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    text(doc, C.slate700);
    const projectLines = doc.splitTextToSize(projectLabel, colW - 8);
    doc.text(projectLines, MARGIN + colW + 10, y + 14);

    doc.setFontSize(7);
    text(doc, C.indigo600);
    const typeLabel = budget.subType
      ? `${budget.type} · ${budget.subType}`
      : budget.type;
    doc.text(typeLabel, MARGIN + 4, y + 22);

    if (isAutomotive && pieceNames.length > 0) {
      doc.setFontSize(7);
      text(doc, C.slate500);
      doc.text(
        `${pieceNames.length} peça${pieceNames.length > 1 ? 's' : ''} incluída${pieceNames.length > 1 ? 's' : ''}`,
        MARGIN + colW + 10,
        y + 22,
      );
    }

    y += infoCardH + 8;

    // —— Material ——
    y = drawSectionTitle(doc, 'MATERIAL SELECIONADO', y);

    const materialH = material?.details ? 32 : 26;
    drawCard(doc, MARGIN, y, CONTENT_W, materialH, C.white, C.slate200);

    fill(doc, C.indigo600);
    doc.rect(MARGIN, y, 3, materialH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    text(doc, C.slate900);
    doc.text(material?.name || 'Material personalizado', MARGIN + 7, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    text(doc, C.slate500);
    const materialMeta = [
      material?.brand,
      material?.type,
      material?.line ? `Linha ${material.line}` : null,
    ]
      .filter(Boolean)
      .join('  ·  ');
    doc.text(materialMeta || '—', MARGIN + 7, y + 15);

    doc.setFontSize(8);
    text(doc, C.slate700);
    doc.text(
      `Cor / textura: ${material?.colorTexture || 'Padrão'}`,
      MARGIN + 7,
      y + 21,
    );

    if (material?.durability) {
      doc.text(`Durabilidade: ${material.durability}`, MARGIN + 7, y + 26);
    }

    if (material?.details) {
      doc.setFontSize(7);
      text(doc, C.slate500);
      const detailLines = doc.splitTextToSize(material.details, CONTENT_W - 14);
      doc.text(detailLines, MARGIN + 7, y + 30);
    }

    y += materialH + 8;

    // —— Peças (automotivo) ——
    if (isAutomotive && pieceNames.length > 0) {
      y = drawSectionTitle(doc, 'PEÇAS INCLUÍDAS NO SERVIÇO', y);

      const cols = pieceNames.length > 8 ? 2 : 1;
      const colPieceW = cols === 2 ? (CONTENT_W - 4) / 2 : CONTENT_W;
      const rowsPerCol = Math.ceil(pieceNames.length / cols);
      const piecesCardH = Math.min(rowsPerCol * 5 + 8, 70);

      drawCard(doc, MARGIN, y, CONTENT_W, piecesCardH, C.white, C.slate200);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      text(doc, C.slate700);

      pieceNames.forEach((name, i) => {
        const col = cols === 2 ? i % 2 : 0;
        const row = cols === 2 ? Math.floor(i / 2) : i;
        const x = MARGIN + 5 + col * (colPieceW + 4);
        const lineY = y + 7 + row * 5;
        doc.text(`• ${name}`, x, lineY);
      });

      y += piecesCardH + 8;
    }

    // —— Métricas ——
    y = drawSectionTitle(doc, 'ESTIMATIVAS TÉCNICAS', y);

    const metricW = (CONTENT_W - 8) / 3;
    const metricH = 22;
    const metrics = [
      {
        label: 'Consumo linear',
        value: `${budget.totalMaterialMeters.toFixed(2)} m`,
      },
      {
        label: 'Área calculada',
        value: budget.totalMaterialM2
          ? `${budget.totalMaterialM2.toFixed(2)} m²`
          : '—',
      },
      {
        label: 'Mão de obra',
        value: `${budget.totalHours.toFixed(1)} h`,
      },
    ];

    metrics.forEach((m, i) => {
      const mx = MARGIN + i * (metricW + 4);
      drawCard(doc, mx, y, metricW, metricH, C.slate100, C.slate200);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      text(doc, C.slate500);
      doc.text(m.label, mx + metricW / 2, y + 8, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      text(doc, C.slate900);
      doc.text(m.value, mx + metricW / 2, y + 16, { align: 'center' });
    });

    y += metricH + 10;

    // —— Investimento total ——
    const priceBoxH = 28;
    fill(doc, C.indigo600);
    doc.roundedRect(MARGIN, y, CONTENT_W, priceBoxH, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    text(doc, C.indigo100);
    doc.text('INVESTIMENTO TOTAL', MARGIN + 8, y + 10);

    doc.setFontSize(20);
    text(doc, C.white);
    doc.text(formatCurrency(budget.totalPrice), PAGE_W - MARGIN - 8, y + 20, {
      align: 'right',
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    text(doc, C.indigo100);
    doc.text(
      'Valores sujeitos à confirmação após vistoria presencial',
      MARGIN + 8,
      y + 24,
    );

    y += priceBoxH + 10;

    // —— Termos ——
    y = drawSectionTitle(doc, 'TERMOS E CONDIÇÕES', y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    text(doc, C.slate700);

    const terms = [
      'Validade deste orçamento: 10 dias corridos a partir da data de emissão.',
      'Prazo de execução: a combinar conforme disponibilidade da agenda.',
      'Garantia de 6 meses contra descolamentos ou defeitos de aplicação.',
      'Pagamento e condições comerciais: a definir na aprovação do orçamento.',
    ];

    terms.forEach((term, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${term}`, CONTENT_W);
      doc.text(lines, MARGIN, y);
      y += lines.length * 4.2;
    });

    // —— Rodapé ——
    const footerY = 285;
    stroke(doc, C.slate200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, footerY - 4, PAGE_W - MARGIN, footerY - 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    text(doc, C.indigo600);
    doc.text('APLICA PRO', PAGE_W / 2, footerY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    text(doc, C.slate400);
    doc.text(
      'Tecnologia para envelopamento · Documento gerado eletronicamente',
      PAGE_W / 2,
      footerY + 4,
      { align: 'center' },
    );

    if (user?.email) {
      doc.text(user.email, PAGE_W / 2, footerY + 8, { align: 'center' });
    }

    const safeName = budget.customerName.replace(/\s+/g, '_').replace(/[^\w-]/g, '');
    doc.save(`Orcamento_${safeName}_${ref}.pdf`);
  },
};
