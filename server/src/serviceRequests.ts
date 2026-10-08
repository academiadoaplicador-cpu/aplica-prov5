import type { Pool, PoolClient } from 'pg';
import { resolveCatalogUserId } from './catalog.js';
import {
  buildEstimate,
  describeParts,
  fullWrapPartIds,
  MATERIAL_TYPES,
  type DecorativeItemInput,
  type EstimateInput,
} from './estimate.js';

/** Prazo de aceite. Sem agendador: a expiração é varrida sob demanda. */
export const REQUEST_EXPIRY_HOURS = 48;

/** Status do orçamento gerado quando um aplicador aceita o pedido. */
export const PROPOSAL_BUDGET_STATUS = 'Proposta aguardando aceite';

export type RequestStatus = 'Aguardando aceite' | 'Aceito' | 'Expirado' | 'Cancelado';

export type ProposalStatus = 'Enviada' | 'Aceita' | 'Recusada';

export interface CreateRequestInput {
  type?: string;
  subType?: string;
  materialType?: string;
  notes?: string;
  /** Automotivo */
  vehicleId?: string;
  scope?: 'completo' | 'parcial';
  partIds?: string[];
  /** Decorativo */
  items?: DecorativeItemInput[];
}

export type CreateRequestResult =
  | { ok: true; id: string }
  | { ok: false; status: number; error: string };

export function mapServiceRequest(row: Record<string, unknown>) {
  return {
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
        }
      : undefined,
  };
}

/** Filtro SQL: o pedido não foi recusado pelo aplicador informado no parâmetro. */
export const NOT_REFUSED_BY = (alias: string, param: string) =>
  `NOT EXISTS (SELECT 1 FROM service_request_refusals f
               WHERE f.request_id = ${alias}.id AND f.applicator_id = ${param})`;

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
export async function resolveScope(
  db: Pool | PoolClient,
  input: CreateRequestInput,
): Promise<
  | { ok: true; estimateInput: EstimateInput; scopeLabel: string; partIds: string[] }
  | { ok: false; status: number; error: string }
> {
  const materialType = (input.materialType || '').trim();
  if (!MATERIAL_TYPES.includes(materialType as (typeof MATERIAL_TYPES)[number])) {
    return { ok: false, status: 400, error: 'Selecione um acabamento válido' };
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
      estimateInput: {
        type: 'Automotivo',
        materialType,
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
    estimateInput: { type: 'Decorativo', materialType, items },
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

  const scope = await resolveScope(client, input);
  if (scope.ok === false) {
    const { status, error } = scope;
    return { ok: false, status, error };
  }

  const estimate = await buildEstimate(client, scope.estimateInput);
  if (estimate.referencePricePerM2 <= 0) {
    return {
      ok: false,
      status: 409,
      error: 'Não há preço de referência para este acabamento. Tente outro.',
    };
  }

  const notes = (input.notes || '').trim().slice(0, 1000);
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);

  await client.query(
    `INSERT INTO service_requests (
      id, client_id, status, type, sub_type, scope_label, notes,
      vehicle_id, part_ids, items, material_type,
      estimated_m2, estimated_hours, reference_price_per_m2,
      suggested_price, price_min, price_max,
      city, state_code, cep, expires_at
    ) VALUES (
      $1, $2, 'Aguardando aceite', $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13,
      $14, $15, $16,
      $17, $18, $19, NOW() + ($20 || ' hours')::interval
    )`,
    [
      id,
      clientId,
      input.type,
      input.subType ?? null,
      scope.scopeLabel,
      notes,
      input.vehicleId ?? null,
      scope.partIds,
      JSON.stringify(input.items || []),
      input.materialType,
      estimate.estimatedM2,
      estimate.estimatedHours,
      estimate.referencePricePerM2,
      estimate.suggestedPrice,
      estimate.priceMin,
      estimate.priceMax,
      city,
      stateCode,
      cep || '',
      String(REQUEST_EXPIRY_HOURS),
    ],
  );

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

  await sweepExpiredRequests(pool);

  const result = await pool.query(
    `SELECT r.*, c.full_name AS client_name
     FROM service_requests r
     LEFT JOIN client_profiles c ON c.user_id = r.client_id
     WHERE r.status = 'Aguardando aceite'
       AND LOWER(r.city) = LOWER($1)
       AND UPPER(r.state_code) = UPPER($2)
       AND ${NOT_REFUSED_BY('r', '$3')}
     ORDER BY r.created_at DESC
     LIMIT 50`,
    [row.city, row.state_code, applicatorId],
  );

  return {
    eligible: true as const,
    city: row.city,
    stateCode: row.state_code,
    items: result.rows.map((r) => ({
      ...mapServiceRequest(r),
      clientName: (r.client_name as string) || 'Cliente',
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
         updated_at = NOW()
     WHERE r.id = $3
       AND r.status = 'Aguardando aceite'
       AND r.expires_at > NOW()
       AND LOWER(r.city) = LOWER($4)
       AND UPPER(r.state_code) = UPPER($5)
       AND ${NOT_REFUSED_BY('r', '$1')}
     RETURNING *`,
    [applicatorId, budgetId, requestId, me.city, me.state_code],
  );

  if (claimed.rowCount === 0) {
    const existing = await client.query(
      `SELECT r.status, r.city, r.state_code,
              EXISTS (SELECT 1 FROM service_request_refusals f
                      WHERE f.request_id = r.id AND f.applicator_id = $2) AS refused
       FROM service_requests r WHERE r.id = $1`,
      [requestId, applicatorId],
    );
    if (existing.rows.length === 0) {
      return { ok: false, status: 404, error: 'Pedido não encontrado' };
    }
    if (existing.rows[0].refused) {
      return { ok: false, status: 409, error: 'Você já recusou este pedido.' };
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

  // Vira um orçamento na conta do aplicador, já como proposta a ser fechada.
  // Custo e material ficam zerados de propósito: a estimativa do cliente usa o
  // preço de referência da plataforma, e o aplicador precisa refinar com o
  // material e os parâmetros dele antes de aprovar.
  await client.query(
    `INSERT INTO budgets (
      user_id, id, customer_name, vehicle_model, appliance_model, vehicle_id,
      status, date, items, material_id, total_hours, total_material_meters,
      total_material_m2, total_cost, total_price, profit, type, sub_type
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
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
    ],
  );

  return { ok: true, requestId, budgetId };
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

  await client.query(
    `UPDATE service_requests
     SET status = 'Aguardando aceite',
         accepted_by = NULL,
         accepted_at = NULL,
         budget_id = NULL,
         expires_at = NOW() + ($2 || ' hours')::interval,
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
         updated_at = NOW()
     WHERE id = $1`,
    [requestId, String(REQUEST_EXPIRY_HOURS)],
  );

  if (row.budget_id) {
    await client.query(
      `UPDATE budgets SET status = 'Cancelado' WHERE user_id = $1 AND id = $2`,
      [applicatorId, row.budget_id],
    );
  }

  return { ok: true };
}

export interface ProposalInput {
  materialId?: string;
  customPricePerM2?: number | null;
  finalPrice?: number | null;
  note?: string;
}

function optionalPositive(value: unknown): number | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 'invalid';
}

/**
 * O aplicador define o material (catálogo) e o valor real do pedido que aceitou.
 * A conta é a mesma das calculadoras, com as configurações financeiras dele,
 * sobre a área e as horas estimadas do pedido; o valor final pode ser ajustado.
 */
export async function sendProposal(
  client: PoolClient,
  requestId: string,
  applicatorId: string,
  input: ProposalInput,
): Promise<ActionResult> {
  const customPricePerM2 = optionalPositive(input.customPricePerM2);
  const finalPrice = optionalPositive(input.finalPrice);
  if (customPricePerM2 === 'invalid') {
    return { ok: false, status: 400, error: 'Preço por m² inválido' };
  }
  if (finalPrice === 'invalid') {
    return { ok: false, status: 400, error: 'Valor final inválido' };
  }
  if (!input.materialId) {
    return { ok: false, status: 400, error: 'Escolha o material da proposta' };
  }

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
  if (row.budget_status && row.budget_status !== PROPOSAL_BUDGET_STATUS) {
    return {
      ok: false,
      status: 409,
      error: `O orçamento já está "${row.budget_status}" e não aceita nova proposta.`,
    };
  }

  const catalogUserId = await resolveCatalogUserId(client);
  const material = (
    await client.query(
      `SELECT id, brand, line, color_texture, type, price_per_m2
       FROM materials WHERE user_id = $1 AND id = $2`,
      [catalogUserId, input.materialId],
    )
  ).rows[0] as
    | {
        id: string;
        brand: string;
        line: string;
        color_texture: string;
        type: string;
        price_per_m2: string;
      }
    | undefined;
  if (!material) {
    return { ok: false, status: 404, error: 'Material não encontrado no catálogo' };
  }

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

  const pricePerM2 = customPricePerM2 ?? Number(material.price_per_m2);
  if (!(pricePerM2 > 0)) {
    return { ok: false, status: 400, error: 'Informe o preço por m² deste material' };
  }

  const m2 = Number(row.estimated_m2);
  const hours = Number(row.estimated_hours);
  const baseCost = m2 * pricePerM2 + hours * hourlyRate;
  const suggested = baseCost * (1 + marginPct / 100) * (1 + taxPct / 100);
  const price = Math.round((finalPrice ?? suggested) * 100) / 100;
  const profit = price - baseCost - price * (taxPct / 100);

  const product = [material.brand, material.line].filter(Boolean).join(' · ');

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
         proposal_sent_at = NOW(),
         proposal_responded_at = NULL,
         proposal_client_reason = '',
         updated_at = NOW()
     WHERE id = $1`,
    [
      requestId,
      material.id,
      material.type,
      product,
      material.color_texture,
      pricePerM2,
      price,
      (input.note || '').trim().slice(0, 1000),
    ],
  );

  if (row.budget_id) {
    await client.query(
      `UPDATE budgets
       SET material_id = $3,
           custom_price_per_m2 = $4,
           total_material_m2 = $5,
           total_hours = $6,
           total_cost = $7,
           total_price = $8,
           profit = $9
       WHERE user_id = $1 AND id = $2`,
      [
        applicatorId,
        row.budget_id,
        material.id,
        customPricePerM2,
        m2,
        hours,
        Math.round(baseCost * 100) / 100,
        price,
        Math.round(profit * 100) / 100,
      ],
    );
  }

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
