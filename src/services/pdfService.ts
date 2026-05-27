import { jsPDF } from 'jspdf';
import { Budget } from '../types';
import { formatCurrency } from '../lib/utils';
import { databaseService } from './databaseService';

export const pdfService = {
  generateBudgetPDF: async (budget: Budget) => {
    const [user, materials] = await Promise.all([
      databaseService.getUser(),
      databaseService.getMaterials(),
    ]);
    const material = materials.find((m) => m.id === budget.materialId);

    const doc = new jsPDF();
    const primaryColor = '#4f46e5';
    const darkColor = '#0f172a';
    const lightGray = '#e2e8f0';

    doc.setFillColor(darkColor);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor('#ffffff');
    doc.text(user?.businessName || 'APLICA PRO', 20, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('ORÇAMENTO PROFISSIONAL', 150, 18);
    doc.text(`#${budget.id}`, 150, 25);
    doc.text(new Date(budget.date).toLocaleDateString('pt-BR'), 150, 32);

    doc.setTextColor(darkColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', 20, 55);
    doc.setDrawColor(lightGray);
    doc.line(20, 57, 190, 57);

    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${budget.customerName}`, 20, 65);
    doc.text(`Projeto: ${budget.vehicleModel || budget.applianceModel || 'Personalizado'}`, 20, 72);
    doc.text(`Tipo de Serviço: ${budget.type} ${budget.subType ? `(${budget.subType})` : ''}`, 20, 79);

    doc.setFillColor(lightGray);
    doc.rect(20, 90, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIÇÃO DO SERVIÇO', 25, 95.5);
    doc.text('ESTIMATIVA', 165, 95.5);

    doc.setFont('helvetica', 'normal');
    doc.text('Envelopamento com acabamento premium e proteção de superfície.', 20, 108);
    doc.setFontSize(9);
    doc.setTextColor(primaryColor);
    doc.text(`Material: ${material?.name || 'Personalizado'} - ${material?.brand || ''} (${material?.type || ''})`, 20, 114);
    doc.text(`Cor/Textura: ${material?.colorTexture || 'Padrão'}`, 20, 119);

    doc.setTextColor(darkColor);
    doc.setFontSize(10);
    doc.text(`Consumo Linear Estimado: ${budget.totalMaterialMeters.toFixed(2)}m`, 20, 128);
    if (budget.totalMaterialM2) {
      doc.text(`Área Total Calculada: ${budget.totalMaterialM2.toFixed(2)}m²`, 20, 134);
      doc.text(`Tempo estimado de execução: ${budget.totalHours.toFixed(1)}h`, 20, 140);
    } else {
      doc.text(`Tempo estimado de execução: ${budget.totalHours.toFixed(1)}h`, 20, 134);
    }

    const startY = 160;
    doc.setDrawColor(lightGray);
    doc.setLineWidth(0.5);
    doc.line(130, startY, 190, startY);

    doc.setFont('helvetica', 'normal');
    doc.text('Serviço Especializado:', 130, startY + 10);
    doc.text('Insumos e Materiais:', 130, startY + 18);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INVESTIMENTO TOTAL:', 130, startY + 32);
    doc.setFontSize(16);
    doc.setTextColor(primaryColor);
    doc.text(formatCurrency(budget.totalPrice), 190, startY + 32, { align: 'right' });

    doc.setTextColor(darkColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMOS E CONDIÇÕES', 20, 240);
    doc.setFont('helvetica', 'normal');
    doc.text('1. Validade deste orçamento: 10 dias corridos.', 20, 246);
    doc.text('2. Prazo de execução: A combinar conforme agenda da oficina.', 20, 251);
    doc.text('3. Garantia: 6 meses contra descolamentos ou defeitos de aplicação.', 20, 256);

    doc.setFontSize(7);
    doc.setTextColor('#94a3b8');
    doc.text('Documento gerado eletronicamente por Aplica PRO v2.0 - Tecnologia para Envelopamento.', 105, 285, { align: 'center' });

    doc.save(`Orcamento_${budget.customerName.replace(/\s+/g, '_')}_${budget.id}.pdf`);
  },
};
