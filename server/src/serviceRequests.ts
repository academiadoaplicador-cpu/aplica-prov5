import type { Pool, PoolClient } from 'pg';
import { resolveCatalogUserId } from './catalog.js';
import {
  buildEstimate,
  isEstimateAvailable,
  describeParts,
  fullWrapPartIds,
  CLIENT_MATERIAL_TYPES,
  type DecorativeItemInput,
  type EstimateInput,
} from './estimate.js';

/** Prazo de aceite. Sem agendador: a expiração é varrida sob demanda. */
export const REQUEST_EXPIRY_HOURS = 12;

/** Depois do aceite, prazo para o aplicador enviar o valor exato (proposta). */
export const RESPONSE_DEADLINE_MINUTES = 60;

/** Quem estoura o prazo de resposta fica sem ver aquele pedido por este tempo. */
export const RESPONSE_BLOCK_HOURS = 12;

export type RequestEvent =
  | 'disponibilizado'
  | 'aceito'
  | 'proposta_enviada'
  | 'recusado'
  | 'prazo_resposta_expirado';

export async function logRequestEvent(
  db: Pool | PoolClient,
  requestId: string,
  event: RequestEvent,
  applicatorId: string | null = null,
): Promise<void> {
  await db.query(
    `INSERT INTO service_request_events (request_id, applicator_id, event) VALUES ($1, $2, $3)`,
    [requestId, applicatorId, event],
  );
}

/** Status do orçamento gerado quando um aplicador aceita o pedido. */
export const PROPOSAL_BUDGET_STATUS = 'Proposta aguardando aceite';

export type RequestStatus = 'Aguardando aceite' | 'Aceito' | 'Expirado' | 'Cancelado';

export type ProposalStatus = 'Enviada' | 'Aceita' | 'Recusada';

export type SupplyMode = 'completo' | 'mao_de_obra';

/** O que define um item do pedido (um veículo, uma geladeira...). */
export interface RequestItemInput {
  subType?: string;
  /** Só aplicação: material do catálogo que o cliente vai fornecer. */
  clientMaterialId?: string;
  materialType?: string;
  /** Automotivo */
  vehicleId?: string;
  scope?: 'completo' | 'parcial';
  partIds?: string[];
  /** Decorativo */
  items?: DecorativeItemInput[];
}

export interface CreateRequestInput extends RequestItemInput {
  type?: string;
  supplyMode?: SupplyMode;
  notes?: string;
  /** Vários itens no mesmo pedido; sem a lista, o próprio corpo é o único item. */
  requestItems?: RequestItemInput[];
}

export const MAX_REQUEST_ITEMS = 10;

/** Item do pedido como fica gravado: escopo, produto e estimativa próprios. */
export interface RequestItemRecord {
  id: string;
  subType?: string;
  scopeLabel: string;
  vehicleId?: string;
  partIds: string[];
  items: DecorativeItemInput[];
  materialType: string;
  clientMaterial?: ClientMaterial;
  estimatedM2: number;
  estimatedHours: number;
  referencePricePerM2: number;
  suggestedPrice: number;
  priceMin: number;
  priceMax: number;
}

/** Proposta do aplicador para um item do pedido. */
export interface ProposalItemRecord {
  requestItemId: string;
  materialId: string;
  materialType: string;
  product: string;
  color: string;
  pricePerM2: number;
  price: number;
}

export type CreateRequestResult =
  | { ok: true; id: string }
  | { ok: false; status: number; error: string };

function readRequestItems(row: Record<string, unknown>): RequestItemRecord[] {
  if (Array.isArray(row.request_items) && row.request_items.length > 0) {
    return row.request_items as RequestItemRecord[];
  }
  return [
    {
      id: 'item-1',
      subType: (row.sub_type as string) || undefined,
      scopeLabel: row.scope_label as string,
      vehicleId: (row.vehicle_id as string) || undefined,
      partIds: (row.part_ids as string[]) || [],
      items: Array.isArray(row.items) ? (row.items as DecorativeItemInput[]) : [],
      materialType: row.material_type as string,
      clientMaterial: row.client_material_id
        ? {
            id: row.client_material_id as string,
            product: (row.client_material_product as string) || '',
            color: (row.client_material_color as string) || '',
          }
        : undefined,
      estimatedM2: Number(row.estimated_m2),
      estimatedHours: Number(row.estimated_hours),
      referencePricePerM2: Number(row.reference_price_per_m2),
      suggestedPrice: Number(row.suggested_price),
      priceMin: Number(row.price_min),
      priceMax: Number(row.price_max),
    },
  ];
}

function readProposalItems(
  row: Record<string, unknown>,
  requestItems: RequestItemRecord[],
): ProposalItemRecord[] {
  if (Array.isArray(row.proposal_items) && row.proposal_items.length > 0) {
    return row.proposal_items as ProposalItemRecord[];
  }
  return [
    {
      requestItemId: requestItems[0]?.id ?? 'item-1',
      materialId: (row.proposal_material_id as string) || '',
      materialType: (row.proposal_material_type as string) || '',
      product: (row.proposal_product as string) || '',
      color: (row.proposal_color as string) || '',
      pricePerM2: Number(row.proposal_price_per_m2),
      price: Number(row.proposal_price),
    },
  ];
}

export function mapServiceRequest(row: Record<string, unknown>) {
  const requestItems = readRequestItems(row);
  return {
    requestItems,
    id: row.id as string,
    clientId: row.client_id as string,
    status: row.status as RequestStatus,
    type: row.type as string,
    subType: (row.sub_type as string) || undefined,
    scopeLabel: row.scope_label as string,
    notes: (row.notes as string) || '',
    vehicleId: (row.vehicle_id as string) || undefined,
    partIds: (row.part_ids as string[]) || [],
    items: Array.isArray(row.items) ? row.items : [],
    materialType: row.material_type as string,
    estimatedM2: Number(row.estimated_m2),
    estimatedHours: Number(row.estimated_hours),
    referencePricePerM2: Number(row.reference_price_per_m2),
    suggestedPrice: Number(row.suggested_price),
    priceMin: Number(row.price_min),
    priceMax: Number(row.price_max),
    city: row.city as string,
    stateCode: row.state_code as string,
    cep: (row.cep as string) || '',
    acceptedBy: (row.accepted_by as string) || undefined,
    acceptedAt: row.accepted_at
      ? new Date(row.accepted_at as string | Date).toISOString()
      : undefined,
    budgetId: (row.budget_id as string) || undefined,
    expiresAt: new Date(row.expires_at as string | Date).toISOString(),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    supplyMode: ((row.supply_mode as string) || 'completo') as SupplyMode,
    /** Até quando o aplicador que aceitou pode enviar o valor exato. */
    responseDeadline:
      row.status === 'Aceito' && !row.proposal_status && row.response_due_at
        ? new Date(row.response_due_at as string | Date).toISOString()
        : undefined,
    reopenedReason: (row.reopened_reason as string) || undefined,
    clientMaterial: row.client_material_id
      ? {
          id: row.client_material_id as string,
          product: (row.client_material_product as string) || '',
          color: (row.client_material_color as string) || '',
        }
      : undefined,
    proposal: row.proposal_status
      ? {
          status: row.proposal_status as ProposalStatus,
          materialId: (row.proposal_material_id as string) || '',
          materialType: (row.proposal_material_type as string) || '',
          product: (row.proposal_product as string) || '',
          color: (row.proposal_color as string) || '',
          pricePerM2: Number(row.proposal_price_per_m2),
          price: Number(row.proposal_price),
          note: (row.proposal_note as string) || '',
          clientReason: (row.proposal_client_reason as string) || '',
          sentAt: new Date(row.proposal_sent_at as string | Date).toISOString(),
          respondedAt: row.proposal_responded_at
            ? new Date(row.proposal_responded_at as string | Date).toISOString()
            : undefined,
          items: readProposalItems(row, requestItems),
        }
      : undefined,
  };
}

/**
 * Filtro SQL: o pedido pode ir para o aplicador do parâmetro — ele não recusou
 * o pedido e não está bloqueado nele por ter estourado o prazo de resposta.
 */
export const AVAILABLE_TO = (alias: string, param: string) =>
  `NOT EXISTS (SELECT 1 FROM service_request_refusals f
               WHERE f.request_id = ${alias}.id AND f.applicator_id = ${param})
   AND NOT EXISTS (SELECT 1 FROM service_request_blocks k
                   WHERE k.request_id = ${alias}.id AND k.applicator_id = ${param}
                     AND k.blocked_until > NOW())`;

/**
 * Marca como expirado todo pedido que passou do prazo sem aceite.
 * Chamado antes de qualquer listagem — mantém o mural limpo sem cron.
 */
export async function sweepExpiredRequests(db: Pool | PoolClient): Promise<number> {
  const result = await db.query(
    `UPDATE service_requests
     SET status = 'Expirado', updated_at = NOW()
     WHERE status = 'Aguardando aceite' AND expires_at <= NOW()`,
  );
  return result.rowCount ?? 0;
}

/** Volta o pedido ao mural com prazo de aceite novo e sem vínculo nem proposta. */
async function reopenRequest(
  client: PoolClient,
  requestId: string,
  reason: 'recusado' | 'prazo_resposta_expirado',
): Promise<void> {
  await client.query(
    `UPDATE service_requests
     SET status = 'Aguardando aceite',
         accepted_by = NULL,
         accepted_at = NULL,
         budget_id = NULL,
         expires_at = NOW() + ($2 || ' hours')::interval,
         reopened_reason = $3,
         response_due_at = NULL,
         proposal_status = NULL,
         proposal_material_id = NULL,
         proposal_material_type = NULL,
         proposal_product = NULL,
         proposal_color = NULL,
         proposal_price_per_m2 = NULL,
         proposal_price = NULL,
         proposal_note = '',
         proposal_sent_at = NULL,
         proposal_responded_at = NULL,
         proposal_client_reason = '',
         proposal_items = '[]',
         updated_at = NOW()
     WHERE id = $1`,
    [requestId, String(REQUEST_EXPIRY_HOURS), reason],
  );
  await logRequestEvent(client, requestId, 'disponibilizado');
}

/**
 * Aceitou e não mandou o valor exato em 1 h: o pedido passa para os outros
 * aplicadores e quem não respondeu fica bloqueado só nele por 12 h.
 */
export async function sweepExpiredResponses(pool: Pool): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const due = await client.query<{ id: string; accepted_by: string; budget_id: string | null }>(
      `SELECT id, accepted_by, budget_id FROM service_requests
       WHERE status = 'Aceito' AND proposal_status IS NULL AND accepted_by IS NOT NULL
         AND response_due_at <= NOW()
       FOR UPDATE SKIP LOCKED`,
    );
    for (const row of due.rows) {
      await client.query(
        `INSERT INTO service_request_blocks (request_id, applicator_id, blocked_until, reason)
         VALUES ($1, $2, NOW() + ($3 || ' hours')::interval, 'prazo_resposta_expirado')
         ON CONFLICT (request_id, applicator_id) DO UPDATE
         SET blocked_until = EXCLUDED.blocked_until, reason = EXCLUDED.reason, created_at = NOW()`,
        [row.id, row.accepted_by, String(RESPONSE_BLOCK_HOURS)],
      );
      if (row.budget_id) {
        await client.query(
          `UPDATE budgets
           SET status = 'Cancelado',
               description = CONCAT_WS(E'\\n', NULLIF(description, ''),
                 'Prazo de resposta expirado: o valor não foi enviado em ' || $3 || ' minutos e o pedido passou para outro aplicador.')
           WHERE user_id = $1 AND id = $2`,
          [row.accepted_by, row.budget_id, String(RESPONSE_DEADLINE_MINUTES)],
        );
      }
      await logRequestEvent(client, row.id, 'prazo_resposta_expirado', row.accepted_by);
      await reopenRequest(client, row.id, 'prazo_resposta_expirado');
    }
    await client.query('COMMIT');
    return due.rows.length;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

/** Aplica os dois prazos antes de qualquer listagem (não há agendador). */
export async function sweepDeadlines(pool: Pool): Promise<void> {
  await sweepExpiredResponses(pool);
  await sweepExpiredRequests(pool);
}

async function loadVehicle(db: Pool | PoolClient, vehicleId: string) {
  const catalogUserId = await resolveCatalogUserId(db);
  const result = await db.query(
    'SELECT id, make, model, year, size, part_measurements FROM vehicles WHERE user_id = $1 AND id = $2',
    [catalogUserId, vehicleId],
  );
  return result.rows[0] as
    | {
        id: string;
        make: string;
        model: string;
        year: string;
        size: string;
        part_measurements: Record<string, { width: number; length: number }>;
      }
    | undefined;
}

/**
 * Traduz o que o cliente escolheu no assistente para a entrada do estimador.
 * Tudo que define preço (medidas do veículo, dificuldade das peças, preço de
 * referência) vem do catálogo no servidor, nunca do corpo da requisição.
 */
interface ClientMaterial {
  id: string;
  product: string;
  color: string;
}

async function loadCatalogMaterial(db: Pool | PoolClient, materialId: string) {
  const catalogUserId = await resolveCatalogUserId(db);
  const result = await db.query(
    `SELECT id, brand, line, color_texture, type, price_per_m2
     FROM materials WHERE user_id = $1 AND id = $2`,
    [catalogUserId, materialId],
  );
  return result.rows[0] as
    | {
        id: string;
        brand: string;
        line: string;
        color_texture: string;
        type: string;
        price_per_m2: string;
      }
    | undefined;
}

function clientSuppliedNote(material: ClientMaterial | undefined): string | null {
  if (!material) return null;
  return `Somente mão de obra — material fornecido pelo cliente: ${material.product} · ${material.color}`;
}

function productLabel(material: { brand: string; line: string }): string {
  return [material.brand, material.line].filter(Boolean).join(' · ');
}

export async function resolveScope(
  db: Pool | PoolClient,
  input: CreateRequestInput,
): Promise<
  | {
      ok: true;
      estimateInput: EstimateInput;
      scopeLabel: string;
      partIds: string[];
      supplyMode: SupplyMode;
      clientMaterial?: ClientMaterial;
    }
  | { ok: false; status: number; error: string }
> {
  const supplyMode: SupplyMode = input.supplyMode === 'mao_de_obra' ? 'mao_de_obra' : 'completo';
  const laborOnly = supplyMode === 'mao_de_obra';
  let materialType = (input.materialType || '').trim();
  let clientMaterial: ClientMaterial | undefined;

  if (laborOnly) {
    const material = input.clientMaterialId
      ? await loadCatalogMaterial(db, input.clientMaterialId)
      : undefined;
    if (!material) {
      return { ok: false, status: 400, error: 'Escolha o material que você vai fornecer' };
    }
    materialType = material.type;
    clientMaterial = {
      id: material.id,
      product: productLabel(material),
      color: material.color_texture,
    };
  }

  if (!CLIENT_MATERIAL_TYPES.includes(materialType)) {
    return { ok: false, status: 400, error: 'Selecione um produto válido' };
  }

  if (input.type === 'Automotivo') {
    if (!input.vehicleId) {
      return { ok: false, status: 400, error: 'Selecione o veículo' };
    }
    const vehicle = await loadVehicle(db, input.vehicleId);
    if (!vehicle) {
      return { ok: false, status: 404, error: 'Veículo não encontrado no catálogo' };
    }

    const available = Object.keys(vehicle.part_measurements || {});
    let partIds: string[];
    let scopeLabel: string;

    if (input.scope === 'parcial') {
      const requested = (input.partIds || []).filter((id) => available.includes(id));
      if (requested.length === 0) {
        return { ok: false, status: 400, error: 'Selecione ao menos uma peça' };
      }
      partIds = requested;
      scopeLabel = `${vehicle.make} ${vehicle.model} (${vehicle.year}) — ${describeParts(partIds)}`;
    } else {
      partIds = fullWrapPartIds(vehicle.size).filter((id) => available.includes(id));
      if (partIds.length === 0) {
        return {
          ok: false,
          status: 400,
          error: 'Este veículo ainda não tem medidas cadastradas',
        };
      }
      scopeLabel = `${vehicle.make} ${vehicle.model} (${vehicle.year}) — envelopamento completo`;
    }

    return {
      ok: true,
      partIds,
      scopeLabel,
      supplyMode,
      clientMaterial,
      estimateInput: {
        type: 'Automotivo',
        materialType,
        laborOnly,
        partIds,
        partMeasurements: vehicle.part_measurements,
      },
    };
  }

  if (input.type !== 'Decorativo') {
    return { ok: false, status: 400, error: 'Tipo de serviço inválido' };
  }

  const items = (input.items || []).filter(
    (item) => Number(item.width) > 0 && Number(item.height) > 0,
  );
  if (items.length === 0) {
    return { ok: false, status: 400, error: 'Informe ao menos uma superfície com medidas' };
  }
  if (items.length > 20) {
    return { ok: false, status: 400, error: 'Máximo de 20 superfícies por pedido' };
  }
  for (const item of items) {
    if (Number(item.width) > 50 || Number(item.height) > 50) {
      return { ok: false, status: 400, error: 'Medidas devem estar em metros (máximo 50 m)' };
    }
  }

  const totalPieces = items.reduce(
    (acc, item) => acc + Math.max(1, Math.floor(Number(item.quantity) || 1)),
    0,
  );
  const scopeLabel = `${input.subType || 'Decorativo'} — ${totalPieces} peça${totalPieces !== 1 ? 's' : ''}`;

  return {
    ok: true,
    partIds: [],
    scopeLabel,
    supplyMode,
    clientMaterial,
    estimateInput: { type: 'Decorativo', materialType, laborOnly, items },
  };
}

export async function createServiceRequest(
  client: PoolClient,
  clientId: string,
  input: CreateRequestInput,
): Promise<CreateRequestResult> {
  const profile = await client.query(
    'SELECT city, state_code, cep FROM client_profiles WHERE user_id = $1',
    [clientId],
  );
  if (profile.rows.length === 0) {
    return { ok: false, status: 400, error: 'Complete seu cadastro antes de pedir um orçamento' };
  }
  const { city, state_code: stateCode, cep } = profile.rows[0] as {
    city: string;
    state_code: string;
    cep: string;
  };
  if (!city || !stateCode) {
    return {
      ok: false,
      status: 400,
      error: 'Confirme sua cidade em "Meus dados" para encontrarmos aplicadores.',
    };
  }

  const open = await client.query(
    `SELECT COUNT(*)::int AS count FROM service_requests
     WHERE client_id = $1 AND status = 'Aguardando aceite'`,
    [clientId],
  );
  if ((open.rows[0].count as number) >= 5) {
    return {
      ok: false,
      status: 429,
      error: 'Você já tem 5 pedidos aguardando aceite. Cancele um antes de abrir outro.',
    };
  }

  const itemInputs = input.requestItems?.length ? input.requestItems : [input];
  if (itemInputs.length > MAX_REQUEST_ITEMS) {
    return {
      ok: false,
      status: 400,
      error: `Máximo de ${MAX_REQUEST_ITEMS} itens por pedido.`,
    };
  }

  // Cada item é resolvido e estimado sozinho; o pedido soma os itens.
  const records: RequestItemRecord[] = [];
  let supplyMode: SupplyMode = 'completo';
  for (const [index, itemInput] of itemInputs.entries()) {
    const scope = await resolveScope(client, {
      ...itemInput,
      type: input.type,
      supplyMode: input.supplyMode,
    });
    const prefix = itemInputs.length > 1 ? `Item ${index + 1}: ` : '';
    if (scope.ok === false) {
      return { ok: false, status: scope.status, error: prefix + scope.error };
    }
    const estimate = await buildEstimate(client, scope.estimateInput);
    if (!isEstimateAvailable(estimate)) {
      return {
        ok: false,
        status: 409,
        error: `${prefix}Não há preço de referência para este produto. Tente outro.`,
      };
    }
    supplyMode = scope.supplyMode;
    records.push({
      id: `item-${index + 1}`,
      subType: input.type === 'Decorativo' ? itemInput.subType || undefined : undefined,
      scopeLabel: scope.scopeLabel,
      vehicleId: input.type === 'Automotivo' ? itemInput.vehicleId : undefined,
      partIds: scope.partIds,
      items: scope.estimateInput.items ?? [],
      materialType: scope.estimateInput.materialType,
      clientMaterial: scope.clientMaterial,
      estimatedM2: estimate.estimatedM2,
      estimatedHours: estimate.estimatedHours,
      referencePricePerM2: estimate.referencePricePerM2,
      suggestedPrice: estimate.suggestedPrice,
      priceMin: estimate.priceMin,
      priceMax: estimate.priceMax,
    });
  }

  const first = records[0];
  const total = (key: 'estimatedM2' | 'estimatedHours' | 'suggestedPrice' | 'priceMin' | 'priceMax') =>
    Math.round(records.reduce((acc, r) => acc + r[key], 0) * 100) / 100;
  const scopeLabel =
    records.length > 1
      ? `${records.length} itens: ${records.map((r) => r.scopeLabel).join('; ')}`
      : first.scopeLabel;

  const notes = (input.notes || '').trim().slice(0, 1000);
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);

  await client.query(
    `INSERT INTO service_requests (
      id, client_id, status, type, sub_type, scope_label, notes,
      vehicle_id, part_ids, items, material_type,
      estimated_m2, estimated_hours, reference_price_per_m2,
      suggested_price, price_min, price_max,
      city, state_code, cep, expires_at,
      supply_mode, client_material_id, client_material_product, client_material_color,
      request_items
    ) VALUES (
      $1, $2, 'Aguardando aceite', $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13,
      $14, $15, $16,
      $17, $18, $19, NOW() + ($20 || ' hours')::interval,
      $21, $22, $23, $24,
      $25
    )`,
    [
      id,
      clientId,
      input.type,
      first.subType ?? null,
      scopeLabel,
      notes,
      first.vehicleId ?? null,
      first.partIds,
      JSON.stringify(first.items),
      first.materialType,
      total('estimatedM2'),
      total('estimatedHours'),
      first.referencePricePerM2,
      total('suggestedPrice'),
      total('priceMin'),
      total('priceMax'),
      city,
      stateCode,
      cep || '',
      String(REQUEST_EXPIRY_HOURS),
      supplyMode,
      first.clientMaterial?.id ?? null,
      first.clientMaterial?.product ?? null,
      first.clientMaterial?.color ?? null,
      JSON.stringify(records.length > 1 ? records : []),
    ],
  );

  await logRequestEvent(client, id, 'disponibilizado');

  return { ok: true, id };
}

/**
 * Pedidos abertos que este aplicador pode aceitar: mesma cidade/UF, conta ativa,
 * documentos verificados e disponibilidade ligada.
 */
export async function fetchRegionRequests(pool: Pool, applicatorId: string) {
  const profile = await pool.query(
    `SELECT p.city, p.state_code, p.verified_documents, p.is_available,
            COALESCE(u.is_active, TRUE) AS is_active
     FROM applicator_profiles p
     INNER JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1`,
    [applicatorId],
  );

  if (profile.rows.length === 0) {
    return { eligible: false as const, reason: 'sem-perfil' as const, items: [] };
  }

  const row = profile.rows[0] as {
    city: string;
    state_code: string;
    verified_documents: boolean;
    is_available: boolean;
    is_active: boolean;
  };

  if (!row.city || !row.state_code) {
    return { eligible: false as const, reason: 'sem-regiao' as const, items: [] };
  }
  if (!row.verified_documents) {
    return { eligible: false as const, reason: 'nao-verificado' as const, items: [] };
  }
  if (!row.is_available) {
    return {
      eligible: false as const,
      reason: 'offline' as const,
      items: [],
      city: row.city,
      stateCode: row.state_code,
    };
  }

  await sweepDeadlines(pool);

  const result = await pool.query(
    `SELECT r.*, c.full_name AS client_name
     FROM service_requests r
     LEFT JOIN client_profiles c ON c.user_id = r.client_id
     WHERE r.status = 'Aguardando aceite'
       AND LOWER(r.city) = LOWER($1)
       AND UPPER(r.state_code) = UPPER($2)
       AND ${AVAILABLE_TO('r', '$3')}
     ORDER BY r.created_at DESC
     LIMIT 50`,
    [row.city, row.state_code, applicatorId],
  );

  // Pedidos em que este aplicador estourou o prazo de resposta e está bloqueado.
  const blocked = await pool.query(
    `SELECT k.request_id, k.blocked_until, r.scope_label
     FROM service_request_blocks k
     INNER JOIN service_requests r ON r.id = k.request_id
     WHERE k.applicator_id = $1 AND k.blocked_until > NOW()
     ORDER BY k.blocked_until`,
    [applicatorId],
  );

  return {
    eligible: true as const,
    city: row.city,
    stateCode: row.state_code,
    items: result.rows.map((r) => ({
      ...mapServiceRequest(r),
      clientName: (r.client_name as string) || 'Cliente',
    })),
    blocked: blocked.rows.map((b) => ({
      requestId: b.request_id as string,
      scopeLabel: b.scope_label as string,
      blockedUntil: new Date(b.blocked_until as string | Date).toISOString(),
    })),
  };
}

export type AcceptResult =
  | { ok: true; requestId: string; budgetId: string }
  | { ok: false; status: number; error: string };

/**
 * Primeiro que aceitar fecha. O UPDATE condicional é o ponto de serialização:
 * dois aplicadores clicando junto, só um afeta linha — o outro recebe 0 e perde.
 */
export async function acceptServiceRequest(
  client: PoolClient,
  requestId: string,
  applicatorId: string,
): Promise<AcceptResult> {
  const eligibility = await client.query(
    `SELECT p.city, p.state_code, p.verified_documents, p.is_available, p.full_name,
            COALESCE(u.is_active, TRUE) AS is_active
     FROM applicator_profiles p
     INNER JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1`,
    [applicatorId],
  );
  if (eligibility.rows.length === 0) {
    return { ok: false, status: 403, error: 'Perfil de aplicador não encontrado' };
  }
  const me = eligibility.rows[0] as {
    city: string;
    state_code: string;
    verified_documents: boolean;
    is_available: boolean;
    is_active: boolean;
  };
  if (!me.is_active) {
    return { ok: false, status: 403, error: 'Conta desativada' };
  }
  if (!me.verified_documents) {
    return {
      ok: false,
      status: 403,
      error: 'Sua conta precisa ser verificada pela administração para aceitar pedidos.',
    };
  }
  if (!me.is_available) {
    return {
      ok: false,
      status: 403,
      error: 'Você está offline. Ative sua disponibilidade para aceitar pedidos.',
    };
  }

  const budgetId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);

  const claimed = await client.query(
    `UPDATE service_requests r
     SET status = 'Aceito',
         accepted_by = $1,
         accepted_at = NOW(),
         budget_id = $2,
         reopened_reason = NULL,
         response_due_at = NOW() + ($6 || ' minutes')::interval,
         updated_at = NOW()
     WHERE r.id = $3
       AND r.status = 'Aguardando aceite'
       AND r.expires_at > NOW()
       AND LOWER(r.city) = LOWER($4)
       AND UPPER(r.state_code) = UPPER($5)
       AND ${AVAILABLE_TO('r', '$1')}
     RETURNING *`,
    [
      applicatorId,
      budgetId,
      requestId,
      me.city,
      me.state_code,
      String(RESPONSE_DEADLINE_MINUTES),
    ],
  );

  if (claimed.rowCount === 0) {
    const existing = await client.query(
      `SELECT r.status, r.city, r.state_code,
              EXISTS (SELECT 1 FROM service_request_refusals f
                      WHERE f.request_id = r.id AND f.applicator_id = $2) AS refused,
              (SELECT k.blocked_until FROM service_request_blocks k
               WHERE k.request_id = r.id AND k.applicator_id = $2
                 AND k.blocked_until > NOW()) AS blocked_until
       FROM service_requests r WHERE r.id = $1`,
      [requestId, applicatorId],
    );
    if (existing.rows.length === 0) {
      return { ok: false, status: 404, error: 'Pedido não encontrado' };
    }
    if (existing.rows[0].refused) {
      return { ok: false, status: 409, error: 'Você já recusou este pedido.' };
    }
    if (existing.rows[0].blocked_until) {
      const until = new Date(existing.rows[0].blocked_until as string | Date);
      return {
        ok: false,
        status: 409,
        error: `Seu prazo de resposta neste pedido expirou. Ele volta a aparecer para você em ${until.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}, se ainda estiver aberto.`,
      };
    }
    const status = existing.rows[0].status as RequestStatus;
    if (status === 'Aceito') {
      return { ok: false, status: 409, error: 'Outro aplicador aceitou este pedido primeiro.' };
    }
    if (status === 'Expirado') {
      return { ok: false, status: 409, error: 'Este pedido expirou.' };
    }
    if (status === 'Cancelado') {
      return { ok: false, status: 409, error: 'O cliente cancelou este pedido.' };
    }
    return { ok: false, status: 403, error: 'Este pedido não é da sua região.' };
  }

  const request = mapServiceRequest(claimed.rows[0]);

  const clientProfile = await client.query(
    'SELECT full_name FROM client_profiles WHERE user_id = $1',
    [request.clientId],
  );
  const customerName = (clientProfile.rows[0]?.full_name as string) || 'Cliente';

  // Com vários itens, o orçamento já nasce com um item para cada item do pedido.
  const multi = request.requestItems.length > 1;
  const lineItems = multi
    ? request.requestItems.map((item) => ({
        id: item.id,
        label: item.scopeLabel,
        vehicleId: item.vehicleId,
        subType: item.subType,
        items: budgetPiecesFor(request.type, item),
        materialId: item.clientMaterial?.id ?? '',
        totalHours: item.estimatedHours,
        totalMaterialMeters: 0,
        totalMaterialM2: item.estimatedM2,
        totalCost: 0,
        totalPrice: item.suggestedPrice,
        profit: 0,
      }))
    : [];
  const description = multi
    ? request.requestItems
        .map((item, i) => {
          const note = clientSuppliedNote(item.clientMaterial);
          return note ? `Item ${i + 1}: ${note}` : null;
        })
        .filter(Boolean)
        .join('\n') || null
    : clientSuppliedNote(request.clientMaterial);

  // Vira um orçamento na conta do aplicador, já como proposta a ser fechada.
  // Custo e material ficam zerados de propósito: a estimativa do cliente usa o
  // preço de referência da plataforma, e o aplicador precisa refinar com o
  // material e os parâmetros dele antes de aprovar.
  await client.query(
    `INSERT INTO budgets (
      user_id, id, customer_name, vehicle_model, appliance_model, vehicle_id,
      status, date, items, material_id, total_hours, total_material_meters,
      total_material_m2, total_cost, total_price, profit, type, sub_type, description,
      line_items
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [
      applicatorId,
      budgetId,
      customerName,
      request.type === 'Automotivo' ? request.scopeLabel : null,
      request.type === 'Decorativo' ? request.scopeLabel : null,
      request.vehicleId ?? null,
      PROPOSAL_BUDGET_STATUS,
      new Date().toISOString(),
      JSON.stringify(
        request.type === 'Automotivo'
          ? request.partIds.map((partId) => ({ partId, quantity: 1 }))
          : request.items,
      ),
      '',
      request.estimatedHours,
      0,
      request.estimatedM2,
      0,
      request.suggestedPrice,
      0,
      request.type,
      request.subType ?? null,
      description,
      JSON.stringify(lineItems),
    ],
  );

  await logRequestEvent(client, requestId, 'aceito', applicatorId);

  return { ok: true, requestId, budgetId };
}

function budgetPiecesFor(type: string, item: RequestItemRecord) {
  if (type === 'Automotivo') {
    return item.partIds.map((partId) => ({ partId, quantity: 1 }));
  }
  return item.items.map((surface, i) => ({
    partId: `s${i + 1}`,
    quantity: Math.max(1, Math.floor(Number(surface.quantity) || 1)),
    name: surface.name || `Superfície ${i + 1}`,
    width: Number(surface.width),
    height: Number(surface.height),
  }));
}

export type ActionResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * O aplicador recusa o pedido: direto do mural, ou depois de aceitar enquanto o
 * orçamento ainda é proposta (antes de fechar material, cor e valor com o cliente).
 * O pedido fica/volta aberto para os outros e some para quem recusou.
 */
export async function refuseServiceRequest(
  client: PoolClient,
  requestId: string,
  applicatorId: string,
  reason: string,
): Promise<ActionResult> {
  const current = await client.query(
    `SELECT r.status, r.accepted_by, r.budget_id, b.status AS budget_status
     FROM service_requests r
     LEFT JOIN budgets b ON b.user_id = r.accepted_by AND b.id = r.budget_id
     WHERE r.id = $1
     FOR UPDATE OF r`,
    [requestId],
  );
  if (current.rows.length === 0) {
    return { ok: false, status: 404, error: 'Pedido não encontrado' };
  }
  const row = current.rows[0] as {
    status: RequestStatus;
    accepted_by: string | null;
    budget_id: string | null;
    budget_status: string | null;
  };

  // Recusa direto do mural: ninguém tinha o pedido, ele só some para este aplicador.
  if (row.status === 'Aguardando aceite') {
    await client.query(
      `INSERT INTO service_request_refusals (request_id, applicator_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (request_id, applicator_id) DO NOTHING`,
      [requestId, applicatorId, reason.trim().slice(0, 500)],
    );
    await logRequestEvent(client, requestId, 'recusado', applicatorId);
    return { ok: true };
  }

  if (row.status !== 'Aceito' || row.accepted_by !== applicatorId) {
    return { ok: false, status: 409, error: 'Este pedido não está mais com você.' };
  }
  if (row.budget_status && row.budget_status !== PROPOSAL_BUDGET_STATUS) {
    return {
      ok: false,
      status: 409,
      error: `O orçamento já está "${row.budget_status}" e não pode mais ser recusado.`,
    };
  }

  await client.query(
    `INSERT INTO service_request_refusals (request_id, applicator_id, budget_id, reason)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (request_id, applicator_id) DO NOTHING`,
    [requestId, applicatorId, row.budget_id, reason.trim().slice(0, 500)],
  );

  await logRequestEvent(client, requestId, 'recusado', applicatorId);
  await reopenRequest(client, requestId, 'recusado');

  if (row.budget_id) {
    await client.query(
      `UPDATE budgets SET status = 'Cancelado' WHERE user_id = $1 AND id = $2`,
      [applicatorId, row.budget_id],
    );
  }

  return { ok: true };
}

export interface ProposalItemInput {
  /** Item do pedido a que esta parte da proposta se refere. */
  requestItemId?: string;
  materialId?: string;
  customPricePerM2?: number | null;
  finalPrice?: number | null;
}

export interface ProposalInput extends ProposalItemInput {
  note?: string;
  /** Uma entrada por item do pedido; sem a lista, o corpo vale para o único item. */
  items?: ProposalItemInput[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function optionalPositive(value: unknown): number | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 'invalid';
}

/**
 * O aplicador define o material (catálogo) e o valor real de cada item do pedido
 * que aceitou. A conta é a mesma das calculadoras, com as configurações financeiras
 * dele, sobre a área e as horas estimadas do item; o valor final pode ser ajustado.
 */
export async function sendProposal(
  client: PoolClient,
  requestId: string,
  applicatorId: string,
  input: ProposalInput,
): Promise<ActionResult> {
  const current = await client.query(
    `SELECT r.*, b.status AS budget_status
     FROM service_requests r
     LEFT JOIN budgets b ON b.user_id = r.accepted_by AND b.id = r.budget_id
     WHERE r.id = $1
     FOR UPDATE OF r`,
    [requestId],
  );
  const row = current.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    return { ok: false, status: 404, error: 'Pedido não encontrado' };
  }
  if (row.status !== 'Aceito' || row.accepted_by !== applicatorId) {
    return { ok: false, status: 409, error: 'Este pedido não está mais com você.' };
  }
  if (row.proposal_status === 'Aceita') {
    return { ok: false, status: 409, error: 'O cliente já aceitou a proposta.' };
  }
  // O prazo vale para a primeira resposta; a varredura repassa o pedido em seguida.
  const dueAt = row.response_due_at ? new Date(row.response_due_at as string | Date).getTime() : null;
  if (!row.proposal_status && dueAt !== null && Date.now() > dueAt) {
    return {
      ok: false,
      status: 409,
      error: `O prazo de ${RESPONSE_DEADLINE_MINUTES} minutos para enviar o valor expirou. O pedido vai passar para outro aplicador.`,
    };
  }
  if (row.budget_status && row.budget_status !== PROPOSAL_BUDGET_STATUS) {
    return {
      ok: false,
      status: 409,
      error: `O orçamento já está "${row.budget_status}" e não aceita nova proposta.`,
    };
  }

  const request = mapServiceRequest(row);
  const requestItems = request.requestItems;
  const multi = requestItems.length > 1;
  const inputs: ProposalItemInput[] = input.items?.length
    ? input.items
    : [{ ...input, requestItemId: requestItems[0].id }];

  const settings = (
    await client.query(
      `SELECT hourly_rate, profit_margin_percentage, tax_percentage
       FROM financial_settings WHERE user_id = $1`,
      [applicatorId],
    )
  ).rows[0] as Record<string, string> | undefined;
  const hourlyRate = settings ? Number(settings.hourly_rate) : 50;
  const marginPct = settings ? Number(settings.profit_margin_percentage) : 30;
  const taxPct = settings ? Number(settings.tax_percentage) : 6;

  // Só aplicação: o material é o que o cliente escolheu e não entra no preço.
  const laborOnly = request.supplyMode === 'mao_de_obra';

  const computed: {
    item: RequestItemRecord;
    proposal: ProposalItemRecord;
    customPricePerM2: number | null;
    baseCost: number;
    profit: number;
  }[] = [];

  for (const [index, item] of requestItems.entries()) {
    const prefix = multi ? `Item ${index + 1}: ` : '';
    const itemInput =
      inputs.find((i) => i.requestItemId === item.id) ?? (multi ? undefined : inputs[0]);
    if (!itemInput) {
      return { ok: false, status: 400, error: `${prefix}escolha o material e o valor deste item.` };
    }
    const customPricePerM2 = optionalPositive(itemInput.customPricePerM2);
    const finalPrice = optionalPositive(itemInput.finalPrice);
    if (customPricePerM2 === 'invalid') {
      return { ok: false, status: 400, error: `${prefix}preço por m² inválido` };
    }
    if (finalPrice === 'invalid') {
      return { ok: false, status: 400, error: `${prefix}valor final inválido` };
    }

    let material: { id: string; type: string; product: string; color: string; pricePerM2: number };
    if (laborOnly) {
      material = {
        id: item.clientMaterial?.id ?? '',
        type: item.materialType,
        product: item.clientMaterial?.product ?? '',
        color: item.clientMaterial?.color ?? '',
        pricePerM2: 0,
      };
    } else {
      if (!itemInput.materialId) {
        return { ok: false, status: 400, error: `${prefix}escolha o material da proposta` };
      }
      const found = await loadCatalogMaterial(client, itemInput.materialId);
      if (!found) {
        return { ok: false, status: 404, error: `${prefix}material não encontrado no catálogo` };
      }
      if (found.type !== item.materialType) {
        return {
          ok: false,
          status: 400,
          error: `${prefix}o cliente pediu ${item.materialType}. Escolha um material desse tipo.`,
        };
      }
      material = {
        id: found.id,
        type: found.type,
        product: productLabel(found),
        color: found.color_texture,
        pricePerM2: customPricePerM2 ?? Number(found.price_per_m2),
      };
      if (!(material.pricePerM2 > 0)) {
        return { ok: false, status: 400, error: `${prefix}informe o preço por m² deste material` };
      }
    }

    const baseCost = item.estimatedM2 * material.pricePerM2 + item.estimatedHours * hourlyRate;
    const suggested = baseCost * (1 + marginPct / 100) * (1 + taxPct / 100);
    const price = round2(finalPrice ?? suggested);
    computed.push({
      item,
      customPricePerM2: laborOnly ? 0 : customPricePerM2,
      baseCost,
      profit: price - baseCost - price * (taxPct / 100),
      proposal: {
        requestItemId: item.id,
        materialId: material.id,
        materialType: material.type,
        product: material.product,
        color: material.color,
        pricePerM2: material.pricePerM2,
        price,
      },
    });
  }

  const first = computed[0];
  const totalPrice = round2(computed.reduce((acc, c) => acc + c.proposal.price, 0));
  const totalCost = round2(computed.reduce((acc, c) => acc + c.baseCost, 0));
  const totalProfit = round2(computed.reduce((acc, c) => acc + c.profit, 0));

  await client.query(
    `UPDATE service_requests
     SET proposal_status = 'Enviada',
         proposal_material_id = $2,
         proposal_material_type = $3,
         proposal_product = $4,
         proposal_color = $5,
         proposal_price_per_m2 = $6,
         proposal_price = $7,
         proposal_note = $8,
         proposal_items = $9,
         proposal_sent_at = NOW(),
         proposal_responded_at = NULL,
         proposal_client_reason = '',
         updated_at = NOW()
     WHERE id = $1`,
    [
      requestId,
      first.proposal.materialId,
      first.proposal.materialType,
      first.proposal.product,
      first.proposal.color,
      first.proposal.pricePerM2,
      totalPrice,
      (input.note || '').trim().slice(0, 1000),
      JSON.stringify(multi ? computed.map((c) => c.proposal) : []),
    ],
  );

  if (row.budget_id) {
    const lineItems = multi
      ? computed.map((c) => ({
          id: c.item.id,
          label: c.item.scopeLabel,
          vehicleId: c.item.vehicleId,
          subType: c.item.subType,
          items: budgetPiecesFor(request.type, c.item),
          materialId: c.proposal.materialId,
          customPricePerM2: c.customPricePerM2 ?? undefined,
          totalHours: c.item.estimatedHours,
          totalMaterialMeters: 0,
          totalMaterialM2: c.item.estimatedM2,
          totalCost: round2(c.baseCost),
          totalPrice: c.proposal.price,
          profit: round2(c.profit),
        }))
      : [];
    await client.query(
      `UPDATE budgets
       SET material_id = $3,
           custom_price_per_m2 = $4,
           total_material_m2 = $5,
           total_hours = $6,
           total_cost = $7,
           total_price = $8,
           profit = $9,
           line_items = $10
       WHERE user_id = $1 AND id = $2`,
      [
        applicatorId,
        row.budget_id,
        first.proposal.materialId,
        multi ? null : first.customPricePerM2,
        request.estimatedM2,
        request.estimatedHours,
        totalCost,
        totalPrice,
        totalProfit,
        JSON.stringify(lineItems),
      ],
    );
  }

  await logRequestEvent(client, requestId, 'proposta_enviada', applicatorId);

  return { ok: true };
}

/** O cliente aceita (orçamento do aplicador vira Aprovado) ou recusa a proposta. */
export async function respondProposal(
  client: PoolClient,
  requestId: string,
  clientId: string,
  accept: boolean,
  reason: string,
): Promise<ActionResult> {
  const updated = await client.query(
    `UPDATE service_requests
     SET proposal_status = $3,
         proposal_responded_at = NOW(),
         proposal_client_reason = $4,
         updated_at = NOW()
     WHERE id = $1 AND client_id = $2
       AND status = 'Aceito' AND proposal_status = 'Enviada'
     RETURNING accepted_by, budget_id`,
    [requestId, clientId, accept ? 'Aceita' : 'Recusada', accept ? '' : reason.trim().slice(0, 500)],
  );
  if (updated.rowCount === 0) {
    return { ok: false, status: 409, error: 'Esta proposta não está mais aguardando resposta.' };
  }

  const { accepted_by: applicatorId, budget_id: budgetId } = updated.rows[0] as {
    accepted_by: string | null;
    budget_id: string | null;
  };
  if (accept && applicatorId && budgetId) {
    await client.query(
      `UPDATE budgets SET status = 'Aprovado' WHERE user_id = $1 AND id = $2`,
      [applicatorId, budgetId],
    );
  }

  return { ok: true };
}
