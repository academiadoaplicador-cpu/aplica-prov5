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
    'Preço Sugerido',
    'Larguras Disponíveis (m)',
    'Comprimento do Rolo (m)',
    'Cores',
    'Recomendado Para',
    'Dificuldade',
  ];
  const examples = [
    [
      'PPF',
      '3M',
      'Scotchgard Pro',
      120.5,
      '1,37; 1,52',
      25,
      'Branco; Preto',
      'Veículo; Geladeira',
      2,
    ],
    [
      'Cast',
      'Avery',
      'MPI 1105',
      85,
      '1,22',
      50,
      'Fosco',
      'Veículo',
      1.5,
    ],
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    sheetWithRows([headers, ...examples], [14, 14, 22, 14, 22, 20, 18, 22, 12]),
    'Materiais',
  );

  const instructions = [
    ['Coluna', 'Obrigatório', 'Exemplo / observação'],
    ['Categoria', 'Sim', 'PPF, Cast, Calandrado ou Poliéster'],
    ['Marca', 'Sim', 'Fabricante do material'],
    ['Linha / Produto', 'Sim', 'Nome comercial do produto'],
    ['Preço Sugerido', 'Sim', 'Valor por m² (use ponto ou vírgula)'],
    ['Larguras Disponíveis (m)', 'Não', 'Larguras em metros separadas por ; (usa a maior para encaixe)'],
    ['Comprimento do Rolo (m)', 'Não', 'Comprimento total do rolo em metros (ex: 25)'],
    ['Cores', 'Não', 'Separe variantes com ; ou ,'],
    ['Recomendado Para', 'Não', 'Veículo; Geladeira; Parede; Móveis'],
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

/** Planilha modelo — base de veículos (importação em /base-veiculos) */
export function downloadVehiclesTemplate() {
  const headers = ['Marca', 'Modelo', 'Ano', 'Peça', 'Largura (m)', 'Altura (m)'];
  const examples = [
    ['BYD', 'TAN', 2025, 'Capô', 1.78, 1.15],
    ['BYD', 'TAN', 2025, 'Teto', 1.52, 2.1],
    ['BYD', 'TAN', 2025, 'Porta malas', 1.52, 1.4],
    ['BYD', 'TAN', 2025, 'Paralama dianteiro direito', 1.52, 1.1],
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    sheetWithRows([headers, ...examples], [14, 18, 8, 32, 12, 12]),
    'Base_de_Dados',
  );

  const instructions = [
    ['Coluna', 'Obrigatório', 'Exemplo / observação'],
    ['Marca', 'Sim', 'Fabricante do veículo (ex: BYD, Volkswagen)'],
    ['Modelo', 'Sim', 'Nome do modelo (ex: Dolphin, T-Cross)'],
    ['Ano', 'Sim', 'Ano do veículo (ex: 2025)'],
    ['Peça', 'Sim', 'Capô, Teto, Porta malas, Paralama, Porta, Parachoque, etc.'],
    ['Largura (m)', 'Sim', 'Largura em metros (use ponto ou vírgula)'],
    ['Altura (m)', 'Sim', 'Altura/comprimento em metros'],
    ['', '', 'Somente peças do catálogo automotivo são importadas'],
    ['', '', 'Peças internas (Multimídia, Volante, Soleiras…) são ignoradas'],
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    sheetWithRows(instructions, [18, 12, 48]),
    'Instruções',
  );

  downloadWorkbook(workbook, 'modelo-veiculos-aplica-pro.xlsx');
}
