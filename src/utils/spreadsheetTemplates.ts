import * as XLSX from 'xlsx';

function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(workbook, filename);
}

function sheetWithRows(rows: unknown[][], columnWidths?: number[]) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  if (columnWidths?.length) {
    sheet['!cols'] = columnWidths.map((wch) => ({ wch }));
  }
  return sheet;
}

/** Planilha modelo — catálogo de materiais (importação em /catalogo) */
export function downloadMaterialsTemplate() {
  const headers = [
    'Categoria',
    'Marca',
    'Linha / Produto',
    'Cores',
    'Preço sugerido',
    'Larguras',
    'Recomendado',
    'Dificuldade',
  ];
  const examples = [
    [
      'PPF',
      '3M',
      'Scotchgard Pro',
      'Branco; Preto',
      120.5,
      '1,37; 1,52',
      'Veículo; Geladeira',
      2,
    ],
    [
      'Cast',
      'Avery',
      'MPI 1105',
      'Fosco',
      85,
      '1,22',
      'Veículo',
      1.5,
    ],
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    sheetWithRows([headers, ...examples], [14, 14, 22, 18, 14, 14, 22, 12]),
    'Materiais',
  );

  const instructions = [
    ['Coluna', 'Obrigatório', 'Exemplo / observação'],
    ['Categoria', 'Sim', 'PPF, Cast, Calandrado ou Poliéster'],
    ['Marca', 'Sim', 'Fabricante do material'],
    ['Linha / Produto', 'Sim', 'Nome comercial do produto'],
    ['Cores', 'Não', 'Separe variantes com ; ou ,'],
    ['Preço sugerido', 'Sim', 'Valor por m² (use ponto ou vírgula)'],
    ['Larguras', 'Não', 'Larguras em metros separadas por ;'],
    ['Recomendado', 'Não', 'Veículo; Geladeira; Parede; Móveis'],
    ['Dificuldade', 'Não', 'Grau de 1 a 3 (opcional)'],
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    sheetWithRows(instructions, [18, 12, 48]),
    'Instruções',
  );

  downloadWorkbook(workbook, 'modelo-materiais-aplica-pro.xlsx');
}

/** Planilha modelo — base de eletrodomésticos (importação em /base-eletros) */
export function downloadAppliancesTemplate() {
  const headers = ['Marca', 'Tipo', 'Modelo', 'Largura', 'Altura', 'Profundidade'];
  const examples = [
    ['Samsung', 'Geladeira', 'RT38K', 0.7, 1.85, 0.75],
    ['Brastemp', 'Fogão', 'BFS62N', 0.6, 0.9, 0.65],
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    sheetWithRows([headers, ...examples], [14, 16, 18, 10, 10, 14]),
    'Eletros',
  );

  const instructions = [
    ['Coluna', 'Obrigatório', 'Exemplo / observação'],
    ['Marca', 'Sim', 'Fabricante do aparelho'],
    ['Tipo', 'Sim', 'Geladeira, Fogão, Micro-ondas, etc.'],
    ['Modelo', 'Sim', 'Identificação do modelo'],
    ['Largura', 'Sim', 'Metros (ex: 0,7)'],
    ['Altura', 'Sim', 'Metros (ex: 1,85)'],
    ['Profundidade', 'Sim', 'Metros (ex: 0,75)'],
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    sheetWithRows(instructions, [16, 12, 40]),
    'Instruções',
  );

  downloadWorkbook(workbook, 'modelo-eletros-aplica-pro.xlsx');
}
