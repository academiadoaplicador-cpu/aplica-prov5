
export enum VehicleSize {
  SMALL = 'Pequeno (Hatch/Compacto)',
  MEDIUM = 'Médio (Sedan/SUV Compacto)',
  LARGE = 'Grande (SUV/Pickup)',
  XLARGE = 'Extra Grande (Van/Caminhão)',
}

export type MaterialType = 'Cast' | 'Calandrado' | 'PPF' | 'Poliéster';

export interface PartMeasurement {
  width: number;
  length: number;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: string;
  size: VehicleSize;
  partMeasurements: Record<string, PartMeasurement>; // partId -> {width, length}
}

export interface VehiclePart {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3;
}

export interface Material {
  id: string;
  name: string;
  brand: string;
  pricePerM2: number;
  type: MaterialType;
  line: string;
  colorTexture: string;
  durability: string;
  recommendedFor: string[]; // ['Automotivo', 'Móveis', 'Eletrodomésticos', ...]
  details?: string;
  /** Largura padrão do rolo (m) — maior opção ou selecionada */
  rollWidthM?: number;
  /** Comprimento padrão do rolo (m) — maior opção ou selecionada */
  rollLengthM?: number;
  /** Todas as larguras disponíveis (m), separadas por ; na planilha */
  rollWidthsM?: number[];
  /** Todos os comprimentos disponíveis (m), separados por ; na planilha */
  rollLengthsM?: number[];
}

export interface FinancialSettings {
  hourlyRate: number;
  profitMarginPercentage: number;
  taxPercentage: number;
  fixedCosts: number;
}

export interface BudgetPiece {
  partId: string;
  quantity: number;
  /** Peças decorativas / eletros */
  name?: string;
  width?: number;
  height?: number;
}

export interface Budget {
  id: string;
  customerName: string;
  vehicleModel?: string; // Descriptive vehicle name
  applianceModel?: string; // Descriptive appliance name
  vehicleId?: string;
  status: 'Pendente' | 'Aprovado' | 'Finalizado' | 'Cancelado';
  date: string;
  items: BudgetPiece[];
  materialId: string;
  customPricePerM2?: number;
  totalHours: number;
  totalMaterialMeters: number;
  totalMaterialM2?: number;
  totalCost: number;
  totalPrice: number;
  profit: number;
  type: 'Automotivo' | 'Decorativo';
  subType?: 'Móveis' | 'Eletrodomésticos' | 'Parede';
}

export interface Appliance {
  id: string;
  make: string;
  model: string;
  type: string;
  width: number;
  height: number;
  depth: number;
}

export interface User {
  id: string;
  email: string;
  businessName: string;
  isAdmin?: boolean;
}

export interface AdminUserAccountFields {
  isActive: boolean;
  lastLoginAt?: string;
  createdBy?: string;
}

export interface AdminStats {
  totalApplicants: number;
  inactiveApplicants: number;
  newApplicantsThisMonth: number;
  activeApplicantsLast30Days: number;
  totalBudgets: number;
  budgetsByStatus: Record<string, number>;
  pendingBudgets: number;
  finalizedBudgets: number;
  gmvFinalized: number;
  profitFinalized: number;
  conversionRate: number;
  budgetsByType: Record<string, number>;
  catalog: {
    materialsCount: number;
    vehiclesCount: number;
    appliancesCount: number;
    vehiclesIncomplete: number;
  };
}

export interface AdminUserListItem extends AdminUserAccountFields {
  id: string;
  email: string;
  businessName: string;
  fullName?: string;
  city?: string;
  stateCode?: string;
  areasOfExpertise: string[];
  verifiedDocuments: boolean;
  createdAt: string;
  budgetCount: number;
  totalRevenue: number;
  pendingCount: number;
  lastBudgetDate?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminCreateUserPayload {
  businessName: string;
  email: string;
  password: string;
  profile: {
    fullName: string;
    phoneCountryCode?: string;
    phoneNational?: string;
    phone?: string;
    city?: string;
    stateCode?: string;
    street?: string;
    neighborhood?: string;
    cep?: string;
    experienceYears?: number;
    areasOfExpertise: AreaOfExpertise[];
  };
}

export interface AdminUpdateUserPayload {
  businessName?: string;
  email?: string;
  isActive?: boolean;
  newPassword?: string;
}

export interface AdminUserDetail {
  user: {
    id: string;
    email: string;
    businessName: string;
    createdAt: string;
  } & AdminUserAccountFields;
  profile: ApplicatorProfile | null;
  financialSettings: FinancialSettings | null;
  budgetSummary: {
    total: number;
    pending: number;
    approved: number;
    finalized: number;
    canceled: number;
    revenue: number;
    profit: number;
    avgTicket: number;
    lastBudgetDate?: string;
  };
  recentBudgets: Budget[];
}

export interface AdminBudgetListItem extends Budget {
  userId: string;
  businessName: string;
}

export interface DecorativeItem {
  id: string;
  name: string;
  width: number;
  height: number;
  complexity: 1 | 2 | 3;
}

export type AreaOfExpertise = 
  | 'Superfície Plana' 
  | 'Veículos' 
  | 'Móveis e Eletros' 
  | 'Comunicação Visual' 
  | 'PPF';

export interface ApplicatorProfile {
  id: string;
  photoUrl?: string;
  fullName: string;
  rating: number; // 1-5
  experienceYears: number;
  /** Telefone formatado / E.164 para exibição */
  phone: string;
  phoneCountryCode?: string;
  phoneNational?: string;
  /** Linha única legada; gerada a partir dos campos estruturados */
  address: string;
  cep?: string;
  street?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  stateName?: string;
  stateCode?: string;
  region?: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  addressUnit?: string;
  viacepComplement?: string;
  areasOfExpertise: AreaOfExpertise[];
  verifiedDocuments: boolean;
  documentsUrls: string[];
}
