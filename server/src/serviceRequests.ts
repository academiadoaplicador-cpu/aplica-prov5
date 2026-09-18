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
  };
}

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
     ORDER BY r.created_at DESC
     LIMIT 50`,
    [row.city, row.state_code],
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
    `UPDATE service_requests
     SET status = 'Aceito',
         accepted_by = $1,
         accepted_at = NOW(),
         budget_id = $2,
         updated_at = NOW()
     WHERE id = $3
       AND status = 'Aguardando aceite'
       AND expires_at > NOW()
       AND LOWER(city) = LOWER($4)
       AND UPPER(state_code) = UPPER($5)
     RETURNING *`,
    [applicatorId, budgetId, requestId, me.city, me.state_code],
  );

  if (claimed.rowCount === 0) {
    const existing = await client.query(
      'SELECT status, city, state_code FROM service_requests WHERE id = $1',
      [requestId],
    );
    if (existing.rows.length === 0) {
      return { ok: false, status: 404, error: 'Pedido não encontrado' };
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
