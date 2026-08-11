import { Armchair, Car, Refrigerator, Square, type LucideIcon } from 'lucide-react';

export type GuideId = 'vehicle' | 'appliance' | 'furniture' | 'flat';

export interface TechGuideStep {
  title: string;
  description: string;
}

export interface TechGuide {
  id: GuideId;
  cardTitle: string;
  title: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  lightBg: string;
  border: string;
  hoverBorder: string;
  cardItems: string[];
  checklist: {
    tools: string[];
    hygiene: string[];
    inspection: string[];
    material: string[];
  };
  process: TechGuideStep[];
  final: string[];
}

export const TECH_GUIDES: TechGuide[] = [
  {
    id: 'vehicle',
    cardTitle: 'Envelopamento Automotivo',
    title: 'Guia de Envelopamento Automotivo',
    icon: Car,
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500',
    lightBg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    hoverBorder: 'hover:border-blue-500/20',
    cardItems: ['Mudança de Cor (Total)', 'Parcial (Teto, Capô)', 'Chrome Delete', 'PPF (Proteção)'],
    checklist: {
      tools: [
        'Estilete com lâmina nova',
        'Espátulas (feltro, teflon)',
        'Soprador térmico',
        'Termômetro infravermelho',
        'Luva aplicadora',
        'Imã de posicionamento',
        'Fita Knifeless',
        'Fita crepe automotiva',
      ],
      hygiene: ['Shampoo neutro', 'Desengraxante (APC)', 'Álcool Isopropílico (IPA)', 'Microfibras limpas', 'Escova para cantos'],
      inspection: ['Riscos profundos/Trincas', 'Pintura queimada/repintura', 'Borrachas ressecadas', 'Travas e sensores'],
      material: ['Rolo do lote correto', 'Metragem suficiente', 'Alongamento adequado'],
    },
    process: [
      { title: '1. Lavagem Completa', description: 'Shampoo neutro. Atenção a cantos e borrachas. Secar totalmente.' },
      { title: '2. Descontaminação', description: 'Passar Clay Bar se necessário. Limpar com IPA para remover ceras e gorduras.' },
      { title: '3. Desmontagem', description: 'Remover maçanetas, retrovisores, lanternas e emblemas para acabamento perfeito.' },
      { title: '4. Aplicação', description: 'Do centro para as bordas. Usar luva. Não esticar excessivamente o vinil.' },
      { title: '5. Quebra de Memória', description: 'Aquecer curvas e cantos (90°C ou conforme fabricante) para fixar o material.' },
      { title: '6. Montagem e Finalização', description: 'Remontar peças. Limpar marcas de dedo. Verificar bolhas.' },
    ],
    final: ['Sem bolhas visíveis', 'Bordas seladas e cortadas', 'Peças funcionando (vidros, travas)', 'Pós-aquecimento realizado'],
  },
  {
    id: 'appliance',
    cardTitle: 'Linha Branca (Eletros)',
    title: 'Guia de Linha Branca',
    icon: Refrigerator,
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500',
    lightBg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    hoverBorder: 'hover:border-emerald-500/20',
    cardItems: ['Geladeiras Inverse/Side', 'Lava e Seca', 'Micro-ondas', 'Freezers'],
    checklist: {
      tools: ['Estilete de precisão', 'Espátula de feltro', 'Soprador térmico', 'Chaves de fenda (desmontagem)'],
      hygiene: ['Detergente neutro', 'Desengordurante potente', 'Álcool Isopropílico', 'Esponja não abrasiva'],
      inspection: ['Ferrugem na base', 'Borrachas de vedação', 'Funcionamento do painel', 'Amassados na porta'],
      material: ['Vinil lavável', 'Sem textura exagerada (facilitar limpeza)', 'Quantidade calculada'],
    },
    process: [
      { title: '1. Segurança', description: 'Tirar da tomada. Afastar da parede. Aguardar despressurizar (15min).' },
      { title: '2. Limpeza Pesada', description: 'Remover toda gordura da cozinha. Finalizar com Álcool Isopropílico.' },
      { title: '3. Remoção de Peças', description: 'Tirar puxadores e logotipos. Proteger painéis digitais.' },
      { title: '4. Aplicação', description: 'A seco. Alinhar pelo topo. Cuidado com alinhamento de portas duplas.' },
      { title: '5. Acabamento', description: 'Esconder cortes atrás das borrachas. Aquecer cantos levemente.' },
    ],
    final: ['Portas fecham suavemente', 'Painel funcional', 'Sem bolhas', 'Bordas limpas', 'Cliente orientado sobre limpeza'],
  },
  {
    id: 'furniture',
    cardTitle: 'Móveis e Madeira',
    title: 'Guia de Móveis e Madeira',
    icon: Armchair,
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-500',
    lightBg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    hoverBorder: 'hover:border-orange-500/20',
    cardItems: ['Mesas e Bancadas', 'Guarda-Roupas', 'Armários de Cozinha', 'Portas e Batentes'],
    checklist: {
      tools: ['Estilete', 'Espátula rígida e feltro', 'Lixa fina (para madeira crua)', 'Soprador', 'Primer (se necessário)'],
      hygiene: ['APC / Desengordurante', 'Pano úmido', 'Pano seco', 'Álcool'],
      inspection: ['MDF cru ou laminado?', 'Estufamento por umidade', 'Dobradiças frouxas', 'Superfície porosa'],
      material: ['Vinil madeirado/liso', 'Adesivo de alta tac (para superfícies difíceis)'],
    },
    process: [
      { title: '1. Preparação', description: 'Se madeira crua: Lixar e passar seladora ou primer. Se laminado: Limpar com álcool.' },
      { title: '2. Desmontagem', description: 'Tirar portas e gavetas. Remover puxadores antigos.' },
      { title: '3. Envelopamento', description: 'Aplicar com sobra nas bordas para virar o acabamento para dentro.' },
      { title: '4. Quinas', description: 'Aquecer levemente para dobrar o vinil sem rasgar ou branquear.' },
      { title: '5. Remontagem', description: 'Recolocar dobradiças e puxadores. Alinhar portas.' },
    ],
    final: ['Sem bolhas', 'Quinas perfeitas', 'Portas alinhadas', 'Gavetas deslizando', 'Padrão da madeira alinhado'],
  },
  {
    id: 'flat',
    cardTitle: 'Arquitetura e Vidros',
    title: 'Guia de Arquitetura',
    icon: Square,
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-500',
    lightBg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    hoverBorder: 'hover:border-purple-500/20',
    cardItems: ['Paredes / Drywall', 'Vidros e Box', 'Pisos Vinílicos', 'Painéis ACM'],
    checklist: {
      tools: ['Nível a laser', 'Régua grande', 'Estilete', 'Espátula de feltro', 'Borrifador (para vidros)'],
      hygiene: ['Pano limpo', 'Água e detergente (vidros)', 'Álcool'],
      inspection: ['Infiltração na parede', 'Parede descascando', 'Vidro trincado', 'Poeira no ambiente'],
      material: ['Vinil de parede/Azulejo', 'Película de vidro', 'Quantidade com sobra para encaixe'],
    },
    process: [
      { title: '1. Limpeza', description: 'Paredes: Pano seco/úmido. Vidros: Raspagem e limpeza com água/sabão.' },
      { title: '2. Alinhamento', description: 'Usar nível laser para garantir que o papel/vinil fique reto.' },
      { title: '3. Aplicação Parede', description: 'A seco. De cima para baixo. Sobrepor 1cm se houver emenda.' },
      { title: '4. Aplicação Vidro', description: 'Molhada (água + gotas de detergente). Espatular água para fora.' },
      { title: '5. Refile', description: 'Cortar sobras no rodapé e teto com régua para precisão.' },
    ],
    final: ['Alinhamento vertical correto', 'Sem bolhas de ar/água', 'Recortes precisos', 'Ambiente limpo'],
  },
];
