import { Material } from './index';

export const DEFAULT_MATERIALS: Material[] = [
  { 
    id: 'V_3M_2080', 
    name: '3M Series 2080', 
    brand: '3M', 
    pricePerM2: 220, 
    type: 'Cast',
    line: 'Professional Graphics',
    colorTexture: 'Brilhante / Fosco / Cetim',
    durability: 'Até 8 anos',
    recommendedFor: ['Automotivo', 'Eletrodomésticos'],
    details: 'Altamente conformável, tecnologia Comply para saída de ar.'
  },
  { 
    id: 'V_AVERY_SW900', 
    name: 'Avery SW900', 
    brand: 'Avery Dennison', 
    pricePerM2: 210, 
    type: 'Cast',
    line: 'Supreme Wrapping Film',
    colorTexture: 'Metallic / Gloss / Matte',
    durability: '7-12 anos',
    recommendedFor: ['Automotivo'],
    details: 'Excelente reposicionamento e deslizamento.'
  },
  { 
    id: 'V_ALLTAK_DECOR', 
    name: 'Alltak Decor Wood', 
    brand: 'Alltak', 
    pricePerM2: 85, 
    type: 'Calandrado',
    line: 'Decorativo',
    colorTexture: 'Madeiras Variadas',
    durability: 'Até 5 anos (interno)',
    recommendedFor: ['Móveis', 'Parede'],
    details: 'Textura real de madeira, alta aderência.'
  },
  { 
    id: 'V_ORACAL_651', 
    name: 'Oracal 651', 
    brand: 'Orafol', 
    pricePerM2: 45, 
    type: 'Calandrado',
    line: 'Intermediário',
    colorTexture: 'Cores Sólidas',
    durability: 'Até 6 anos',
    recommendedFor: ['Eletrodomésticos', 'Sinalização'],
    details: 'Ideal para superfícies planas ou curvas simples.'
  },
  { 
    id: 'V_PPF_ULTRA', 
    name: 'Suntek PPF Ultra', 
    brand: 'SunTek', 
    pricePerM2: 550, 
    type: 'PPF',
    line: 'Protection Film',
    colorTexture: 'Transparente / Gloss',
    durability: '10 anos',
    recommendedFor: ['Automotivo'],
    details: 'Auto-regeneração (self-healing) e proteção contra impactos.'
  }
];
