import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import type { PoolClient } from 'pg';
import helmet from 'helmet';
import {
  clearAuthCookie,
  getTokenFromRequest,
  setAuthCookie,
  signAuthToken,
  verifyAuthToken,
} from './auth.js';
import {
  ensureAdminUser,
  isAdminEmail,
  mapUserWithRole,
  reservedEmailMessage,
  userIsAdmin,
} from './admin.js';
import { ensureDatabase, pool, waitForDb } from './db.js';
import { isValidEmail, normalizeEmail } from './email.js';
import { getHealthReport, handleHealthRequest, renderStatusPageHtml } from './healthStatus.js';
import { runMigrations } from './migrate.js';
import { getPasswordValidationMessage } from './password.js';
import {
  clearFailedLogins,
  isAccountLocked,
  loginRateLimiter,
  registerFailedLogin,
  registerRateLimiter,
} from './rateLimits.js';
import { seedUserData } from './seed/seedUser.js';
import {
  buildAddressLine,
  buildPhoneStored,
  mapProfileRow,
  profileDbParams,
  PROFILE_INSERT_SQL,
  PROFILE_UPSERT_SQL,
  type ProfileAddressInput,
} from './profileData.js';

const SALT_ROUNDS = 10;

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  app.set('trust proxy', 1);
  if (CORS_ORIGIN.startsWith('http://localhost')) {
    console.warn(
      '[security] CORS_ORIGIN aponta para localhost em produção. Defina a URL pública real para evitar problemas de cookie/CORS.',
    );
  }
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.use(
  (
    err: Error & { type?: string; status?: number },
    _req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    if (err.type === 'entity.too.large') {
      res.status(413).json({
        error:
          'Os dados enviados são grandes demais. Reduza o tamanho da foto/logo e tente novamente.',
      });
      return;
    }
    next(err);
  },
);

const MAX_PROFILE_PHOTO_LENGTH = 280_000;

function sendAuthResponse(res: Response, userRow: Record<string, unknown>, status = 200) {
  const user = mapUserWithRole(userRow);
  const token = signAuthToken(user.id);
  setAuthCookie(res, token);
  res.status(status).json({ user });
}

function num(value: unknown): number {
  return Number(value);
}

function mapFinancial(row: Record<string, unknown>) {
  return {
    hourlyRate: num(row.hourly_rate),
    profitMarginPercentage: num(row.profit_margin_percentage),
    taxPercentage: num(row.tax_percentage),
    fixedCosts: num(row.fixed_costs),
  };
}

function parseWidthsFromDetails(details?: string): number[] {
  if (!details) return [];
  const match = details.match(/Larguras dispon[ií]veis:\s*([^•]+)/i);
  if (!match?.[1]) return [];
  return match[1]
    .split(';')
    .map((part) => parseFloat(part.replace(/[^\d.,]/g, '').replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function parseRollLengthFromDetails(details?: string): number | undefined {
  if (!details) return undefined;
  const match = details.match(/Comprimento do rolo:\s*([\d.,]+)\s*m/i);
  if (!match?.[1]) return undefined;
  const n = parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function mapMaterial(row: Record<string, unknown>) {
  const details = (row.details as string) || undefined;
  const rollWidthM =
    row.roll_width_m != null
      ? num(row.roll_width_m)
      : (() => {
          const widths = parseWidthsFromDetails(details);
          return widths.length > 0 ? Math.max(...widths) : undefined;
        })();
  const rollLengthM =
    row.roll_length_m != null
      ? num(row.roll_length_m)
      : parseRollLengthFromDetails(details);

  return {
    id: row.id as string,
    name: row.name as string,
    brand: row.brand as string,
    pricePerM2: num(row.price_per_m2),
    type: row.type as string,
    line: row.line as string,
    colorTexture: row.color_texture as string,
    durability: row.durability as string,
    recommendedFor: (row.recommended_for as string[]) || [],
    details,
    rollWidthM,
    rollLengthM,
  };
}

function mapVehicle(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    make: row.make as string,
    model: row.model as string,
    year: row.year as string,
    size: row.size as string,
    partMeasurements: filterStandardPartMeasurements(
      row.part_measurements as Record<string, { width: number; length: number }>,
    ),
  };
}

const STANDARD_VEHICLE_PART_IDS = new Set([
  'CAP', 'TET', 'MAL', 'PCD', 'PCE', 'PTD', 'PTE', 'PDD', 'PDE',
  'PTD_DOOR', 'PTE_DOOR', 'PCD_BUMP', 'PCT_BUMP', 'SAI_D', 'SAI_E',
  'RET_D', 'RET_E', 'MAC_D', 'AER', 'COL', 'GRA',
]);

function filterStandardPartMeasurements(
  measurements: Record<string, { width: number; length: number }> | null | undefined,
) {
  if (!measurements || typeof measurements !== 'object') return {};
  return Object.fromEntries(
    Object.entries(measurements).filter(([id]) => STANDARD_VEHICLE_PART_IDS.has(id)),
  );
}

function mapAppliance(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    make: row.make as string,
    model: row.model as string,
    type: row.type as string,
    width: num(row.width),
    height: num(row.height),
    depth: num(row.depth),
  };
}

function mapBudget(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    customerName: row.customer_name as string,
    vehicleModel: (row.vehicle_model as string) || undefined,
    applianceModel: (row.appliance_model as string) || undefined,
    vehicleId: (row.vehicle_id as string) || undefined,
    status: row.status as string,
    date: row.date as string,
    items: row.items as unknown[],
    materialId: row.material_id as string,
    customPricePerM2: row.custom_price_per_m2 != null ? num(row.custom_price_per_m2) : undefined,
    totalHours: num(row.total_hours),
    totalMaterialMeters: num(row.total_material_meters),
    totalMaterialM2: row.total_material_m2 != null ? num(row.total_material_m2) : undefined,
    totalCost: num(row.total_cost),
    totalPrice: num(row.total_price),
    profit: num(row.profit),
    type: row.type as string,
    subType: (row.sub_type as string) || undefined,
  };
}

function requireUser(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req.cookies, req.header('authorization'));
  if (!token) {
    res.status(401).json({ error: 'Usuário não autenticado' });
    return;
  }
  try {
    const payload = verifyAuthToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: 'Usuário não autenticado' });
    return;
  }
  const admin = await userIsAdmin(pool, req.userId);
  if (!admin) {
    res.status(403).json({ error: 'Acesso restrito ao administrador' });
    return;
  }
  next();
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

app.get('/api/health', (req, res) => handleHealthRequest(req, res, pool));

app.get('/status', async (req, res) => {
  const report = await getHealthReport(pool);
  const httpStatus = report.database === 'connected' ? 200 : 503;
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const baseUrl = process.env.APP_URL || `${proto}://${host}`;
  res.status(httpStatus).type('html').send(renderStatusPageHtml(report, baseUrl));
});

app.post('/api/auth/register', registerRateLimiter, async (req, res) => {
  const { businessName, email, password, profile } = req.body as {
    businessName?: string;
    email?: string;
    password?: string;
    profile?: ProfileAddressInput & {
      fullName?: string;
      experienceYears?: number;
      areasOfExpertise?: string[];
      photoUrl?: string;
      documentsUrls?: string[];
    };
  };

  if (!businessName?.trim() || !email?.trim() || !password) {
    res.status(400).json({ error: 'Empresa, e-mail e senha são obrigatórios' });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Informe um e-mail válido' });
    return;
  }
  const passwordError = getPasswordValidationMessage(password);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }
  if (businessName.length > 120 || (profile?.fullName?.length ?? 0) > 120) {
    res.status(400).json({ error: 'Nome muito longo' });
    return;
  }
  const phoneStored = buildPhoneStored(profile || {});
  const addressLine = buildAddressLine(profile || {});
  if (!profile?.fullName?.trim() || !phoneStored) {
    res.status(400).json({ error: 'Preencha nome e telefone do aplicador' });
    return;
  }
  if (!profile?.street?.toString().trim() || !profile?.neighborhood?.toString().trim()) {
    res.status(400).json({ error: 'Preencha o endereço (CEP, rua e bairro)' });
    return;
  }
  if (!profile?.city?.toString().trim() || !profile?.stateCode?.toString().trim()) {
    res.status(400).json({ error: 'Cidade e UF são obrigatórios' });
    return;
  }
  if (!profile.areasOfExpertise?.length) {
    res.status(400).json({ error: 'Selecione ao menos uma área de especialidade' });
    return;
  }
  if (profile.photoUrl && profile.photoUrl.length > MAX_PROFILE_PHOTO_LENGTH) {
    res.status(400).json({
      error:
        'A foto/logo é muito grande. Use uma imagem menor (recomendado até 200 KB).',
    });
    return;
  }

  const normalizedEmail = normalizeEmail(email);

  if (isAdminEmail(normalizedEmail)) {
    res.status(403).json({ error: reservedEmailMessage() });
    return;
  }

  let client: PoolClient | undefined;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(409).json({
        error: 'Não foi possível concluir o cadastro com este e-mail.',
      });
      return;
    }

    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await client.query(
      'INSERT INTO users (id, email, business_name, password_hash) VALUES ($1, $2, $3, $4)',
      [id, normalizedEmail, businessName.trim(), passwordHash],
    );

    await seedUserData(client, id);

    const hasDocuments = ((profile.documentsUrls as string[])?.length ?? 0) > 0;
    const profileRow = {
      ...profile,
      fullName: (profile.fullName as string).trim(),
      rating: 5,
      experienceYears: profile.experienceYears,
      phone: phoneStored,
      address: addressLine,
      verifiedDocuments: hasDocuments,
      documentsUrls: profile.documentsUrls ?? [],
    };
    await client.query(PROFILE_INSERT_SQL, [id, ...profileDbParams(profileRow)]);

    await client.query('COMMIT');
    sendAuthResponse(
      res,
      {
        id,
        email: normalizedEmail,
        business_name: businessName.trim(),
      },
      201,
    );
  } catch (e) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* transação já encerrada */
      }
    }
    console.error('[auth/register]', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao criar conta. Tente novamente em instantes.' });
    }
  } finally {
    client?.release();
  }
});

app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(401).json({ error: 'E-mail ou senha incorretos' });
    return;
  }

  const normalizedEmail = normalizeEmail(email);

  const lockedUntil = isAccountLocked(normalizedEmail);
  if (lockedUntil) {
    const minutes = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60000));
    res.status(429).json({
      error: `Conta temporariamente bloqueada após muitas tentativas. Tente novamente em ${minutes} min.`,
    });
    return;
  }

  const result = await pool.query(
    'SELECT id, email, business_name, password_hash FROM users WHERE email = $1',
    [normalizedEmail],
  );

  if (result.rows.length === 0) {
    registerFailedLogin(normalizedEmail);
    res.status(401).json({ error: 'E-mail ou senha incorretos' });
    return;
  }

  const row = result.rows[0];
  if (!row.password_hash) {
    res.status(401).json({ error: 'E-mail ou senha incorretos' });
    return;
  }

  const valid = await bcrypt.compare(password, row.password_hash as string);
  if (!valid) {
    registerFailedLogin(normalizedEmail);
    res.status(401).json({ error: 'E-mail ou senha incorretos' });
    return;
  }

  clearFailedLogins(normalizedEmail);
  sendAuthResponse(res, row);
});

app.post('/api/auth/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});

app.get('/api/auth/me', requireUser, async (req, res) => {
  const result = await pool.query('SELECT id, email, business_name FROM users WHERE id = $1', [
    req.userId,
  ]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }
  res.json({ user: mapUserWithRole(result.rows[0]) });
});

app.get('/api/financial-settings', requireUser, async (req, res) => {
  const result = await pool.query('SELECT * FROM financial_settings WHERE user_id = $1', [
    req.userId,
  ]);
  if (result.rows.length === 0) {
    res.json({
      hourlyRate: 50,
      profitMarginPercentage: 30,
      taxPercentage: 6,
      fixedCosts: 1500,
    });
    return;
  }
  res.json(mapFinancial(result.rows[0]));
});

app.put('/api/financial-settings', requireUser, async (req, res) => {
  const s = req.body;
  await pool.query(
    `INSERT INTO financial_settings (user_id, hourly_rate, profit_margin_percentage, tax_percentage, fixed_costs)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id) DO UPDATE SET
       hourly_rate = EXCLUDED.hourly_rate,
       profit_margin_percentage = EXCLUDED.profit_margin_percentage,
       tax_percentage = EXCLUDED.tax_percentage,
       fixed_costs = EXCLUDED.fixed_costs`,
    [req.userId, s.hourlyRate, s.profitMarginPercentage, s.taxPercentage, s.fixedCosts],
  );
  res.json({ ok: true });
});

app.get('/api/materials', requireUser, async (req, res) => {
  const result = await pool.query('SELECT * FROM materials WHERE user_id = $1 ORDER BY name', [
    req.userId,
  ]);
  res.json(result.rows.map(mapMaterial));
});

app.put('/api/materials', requireUser, requireAdmin, async (req, res) => {
  const materials = (req.body.materials || []) as Record<string, unknown>[];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM materials WHERE user_id = $1', [req.userId]);
    for (const m of materials) {
      await client.query(
        `INSERT INTO materials (
          user_id, id, name, brand, price_per_m2, type, line, color_texture,
          durability, recommended_for, details, roll_width_m, roll_length_m
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          req.userId,
          m.id,
          m.name,
          m.brand,
          m.pricePerM2,
          m.type,
          m.line,
          m.colorTexture,
          m.durability,
          m.recommendedFor || [],
          m.details ?? null,
          m.rollWidthM ?? null,
          m.rollLengthM ?? null,
        ],
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erro ao salvar materiais' });
  } finally {
    client.release();
  }
});

app.post('/api/materials/import', requireUser, requireAdmin, async (req, res) => {
  const incoming = (req.body.materials || []) as Record<string, unknown>[];
  if (!Array.isArray(incoming) || incoming.length === 0) {
    res.status(400).json({ error: 'Nenhum material para importar' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const m of incoming) {
      const brand = String(m.brand ?? '').trim();
      const name = String(m.name ?? '').trim();
      if (!brand || !name) continue;

      const existing = await client.query(
        `SELECT id FROM materials
         WHERE user_id = $1
           AND LOWER(TRIM(brand)) = LOWER(TRIM($2))
           AND LOWER(TRIM(name)) = LOWER(TRIM($3))`,
        [req.userId, brand, name],
      );

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE materials
           SET price_per_m2 = $1, type = $2, line = $3, color_texture = $4,
               durability = $5, recommended_for = $6, details = $7,
               brand = $8, name = $9, roll_width_m = $10, roll_length_m = $11
           WHERE user_id = $12 AND id = $13`,
          [
            m.pricePerM2,
            m.type,
            m.line,
            m.colorTexture,
            m.durability,
            m.recommendedFor || [],
            m.details ?? null,
            brand,
            name,
            m.rollWidthM ?? null,
            m.rollLengthM ?? null,
            req.userId,
            existing.rows[0].id,
          ],
        );
      } else {
        const id = String(m.id ?? crypto.randomUUID());
        await client.query(
          `INSERT INTO materials (
            user_id, id, name, brand, price_per_m2, type, line, color_texture,
            durability, recommended_for, details, roll_width_m, roll_length_m
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            req.userId,
            id,
            name,
            brand,
            m.pricePerM2,
            m.type,
            m.line,
            m.colorTexture,
            m.durability,
            m.recommendedFor || [],
            m.details ?? null,
            m.rollWidthM ?? null,
            m.rollLengthM ?? null,
          ],
        );
      }
    }
    await client.query('COMMIT');

    const result = await pool.query('SELECT * FROM materials WHERE user_id = $1 ORDER BY name', [
      req.userId,
    ]);
    res.json(result.rows.map(mapMaterial));
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erro ao importar materiais' });
  } finally {
    client.release();
  }
});

app.get('/api/vehicles', requireUser, async (req, res) => {
  const result = await pool.query('SELECT * FROM vehicles WHERE user_id = $1 ORDER BY make, model', [
    req.userId,
  ]);
  res.json(result.rows.map(mapVehicle));
});

app.put('/api/vehicles', requireUser, requireAdmin, async (req, res) => {
  const vehicles = (req.body.vehicles || []) as Record<string, unknown>[];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM vehicles WHERE user_id = $1', [req.userId]);
    for (const v of vehicles) {
      await client.query(
        `INSERT INTO vehicles (user_id, id, make, model, year, size, part_measurements)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [req.userId, v.id, v.make, v.model, v.year, v.size, JSON.stringify(v.partMeasurements || {})],
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erro ao salvar veículos' });
  } finally {
    client.release();
  }
});

app.post('/api/vehicles/import', requireUser, requireAdmin, async (req, res) => {
  const incoming = (req.body.vehicles || []) as Record<string, unknown>[];
  if (!Array.isArray(incoming) || incoming.length === 0) {
    res.status(400).json({ error: 'Nenhum veículo para importar' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const v of incoming) {
      const make = String(v.make ?? '').trim();
      const model = String(v.model ?? '').trim();
      const year = String(v.year ?? '').trim();
      if (!make || !model || !year) continue;

      const existing = await client.query(
        `SELECT id, part_measurements FROM vehicles
         WHERE user_id = $1
           AND LOWER(TRIM(make)) = LOWER(TRIM($2))
           AND LOWER(TRIM(model)) = LOWER(TRIM($3))
           AND LOWER(TRIM(year)) = LOWER(TRIM($4))`,
        [req.userId, make, model, year],
      );

      const partMeasurements = filterStandardPartMeasurements({
        ...(typeof existing.rows[0]?.part_measurements === 'object' && existing.rows[0]?.part_measurements !== null
          ? (existing.rows[0].part_measurements as Record<string, { width: number; length: number }>)
          : {}),
        ...filterStandardPartMeasurements(
          (v.partMeasurements as Record<string, { width: number; length: number }>) || {},
        ),
      });

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE vehicles
           SET make = $1, model = $2, year = $3, size = $4, part_measurements = $5
           WHERE user_id = $6 AND id = $7`,
          [make, model, year, v.size, JSON.stringify(partMeasurements), req.userId, existing.rows[0].id],
        );
      } else {
        const id = String(v.id ?? crypto.randomUUID());
        await client.query(
          `INSERT INTO vehicles (user_id, id, make, model, year, size, part_measurements)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            req.userId,
            id,
            make,
            model,
            year,
            v.size,
            JSON.stringify(filterStandardPartMeasurements(
              (v.partMeasurements as Record<string, { width: number; length: number }>) || {},
            )),
          ],
        );
      }
    }
    await client.query('COMMIT');

    const result = await pool.query('SELECT * FROM vehicles WHERE user_id = $1 ORDER BY make, model', [
      req.userId,
    ]);
    res.json(result.rows.map(mapVehicle));
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Erro ao importar veículos' });
  } finally {
    client.release();
  }
});

app.get('/api/appliances', requireUser, async (req, res) => {
  const result = await pool.query('SELECT * FROM appliances WHERE user_id = $1 ORDER BY make', [
    req.userId,
  ]);
  res.json(result.rows.map(mapAppliance));
});

app.put('/api/appliances', requireUser, requireAdmin, async (req, res) => {
  const appliances = (req.body.appliances || []) as Record<string, unknown>[];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM appliances WHERE user_id = $1', [req.userId]);
    for (const a of appliances) {
      await client.query(
        `INSERT INTO appliances (user_id, id, make, model, type, width, height, depth)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [req.userId, a.id, a.make, a.model, a.type, a.width, a.height, a.depth],
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erro ao salvar eletrodomésticos' });
  } finally {
    client.release();
  }
});

app.post('/api/appliances/import', requireUser, requireAdmin, async (req, res) => {
  const incoming = (req.body.appliances || []) as Record<string, unknown>[];
  if (!Array.isArray(incoming) || incoming.length === 0) {
    res.status(400).json({ error: 'Nenhum eletrodoméstico para importar' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const a of incoming) {
      const make = String(a.make ?? '').trim();
      const model = String(a.model ?? '').trim();
      const type = String(a.type ?? '').trim();
      if (!make || !model || !type) continue;

      const existing = await client.query(
        `SELECT id FROM appliances
         WHERE user_id = $1
           AND LOWER(TRIM(make)) = LOWER(TRIM($2))
           AND LOWER(TRIM(model)) = LOWER(TRIM($3))
           AND LOWER(TRIM(type)) = LOWER(TRIM($4))`,
        [req.userId, make, model, type],
      );

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE appliances
           SET width = $1, height = $2, depth = $3, make = $4, model = $5, type = $6
           WHERE user_id = $7 AND id = $8`,
          [
            a.width,
            a.height,
            a.depth,
            make,
            model,
            type,
            req.userId,
            existing.rows[0].id,
          ],
        );
      } else {
        const id = String(a.id ?? crypto.randomUUID());
        await client.query(
          `INSERT INTO appliances (user_id, id, make, model, type, width, height, depth)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [req.userId, id, make, model, type, a.width, a.height, a.depth],
        );
      }
    }
    await client.query('COMMIT');

    const result = await pool.query('SELECT * FROM appliances WHERE user_id = $1 ORDER BY make', [
      req.userId,
    ]);
    res.json(result.rows.map(mapAppliance));
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erro ao importar eletrodomésticos' });
  } finally {
    client.release();
  }
});

app.get('/api/profile', requireUser, async (req, res) => {
  const result = await pool.query('SELECT * FROM applicator_profiles WHERE user_id = $1', [
    req.userId,
  ]);
  if (result.rows.length === 0) {
    res.json(null);
    return;
  }
  res.json(mapProfileRow(result.rows[0]));
});

app.put('/api/profile', requireUser, async (req, res) => {
  const body = (req.body || {}) as Record<string, unknown>;

  const photoUrl = body.photoUrl;
  if (typeof photoUrl === 'string' && photoUrl.length > MAX_PROFILE_PHOTO_LENGTH) {
    res.status(400).json({
      error:
        'A foto/logo é muito grande. Use uma imagem menor (recomendado até 200 KB).',
    });
    return;
  }

  const current = await pool.query(
    'SELECT rating, verified_documents FROM applicator_profiles WHERE user_id = $1',
    [req.userId],
  );
  const isAdmin = await userIsAdmin(pool, req.userId!);

  const safeBody: Record<string, unknown> = { ...body };
  if (!isAdmin) {
    delete safeBody.rating;
    delete safeBody.verifiedDocuments;
    if (current.rows.length > 0) {
      safeBody.rating = current.rows[0].rating;
      safeBody.verifiedDocuments = current.rows[0].verified_documents;
    } else {
      safeBody.rating = 5;
      safeBody.verifiedDocuments = false;
    }
  }

  await pool.query(PROFILE_UPSERT_SQL, [req.userId, ...profileDbParams(safeBody)]);
  res.json({ ok: true });
});

app.get('/api/budgets', requireUser, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM budgets WHERE user_id = $1 ORDER BY date DESC',
    [req.userId],
  );
  res.json(result.rows.map(mapBudget));
});

app.post('/api/budgets', requireUser, async (req, res) => {
  const b = req.body;
  await pool.query(
    `INSERT INTO budgets (
      user_id, id, customer_name, vehicle_model, appliance_model, vehicle_id, status, date,
      items, material_id, custom_price_per_m2, total_hours, total_material_meters,
      total_material_m2, total_cost, total_price, profit, type, sub_type
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    ON CONFLICT (user_id, id) DO UPDATE SET
      customer_name = EXCLUDED.customer_name,
      vehicle_model = EXCLUDED.vehicle_model,
      appliance_model = EXCLUDED.appliance_model,
      vehicle_id = EXCLUDED.vehicle_id,
      status = EXCLUDED.status,
      date = EXCLUDED.date,
      items = EXCLUDED.items,
      material_id = EXCLUDED.material_id,
      custom_price_per_m2 = EXCLUDED.custom_price_per_m2,
      total_hours = EXCLUDED.total_hours,
      total_material_meters = EXCLUDED.total_material_meters,
      total_material_m2 = EXCLUDED.total_material_m2,
      total_cost = EXCLUDED.total_cost,
      total_price = EXCLUDED.total_price,
      profit = EXCLUDED.profit,
      type = EXCLUDED.type,
      sub_type = EXCLUDED.sub_type`,
    [
      req.userId,
      b.id,
      b.customerName,
      b.vehicleModel ?? null,
      b.applianceModel ?? null,
      b.vehicleId ?? null,
      b.status,
      b.date,
      JSON.stringify(b.items || []),
      b.materialId,
      b.customPricePerM2 ?? null,
      b.totalHours,
      b.totalMaterialMeters,
      b.totalMaterialM2 ?? null,
      b.totalCost,
      b.totalPrice,
      b.profit,
      b.type,
      b.subType ?? null,
    ],
  );
  res.json({ ok: true });
});

app.delete('/api/budgets/:id', requireUser, async (req, res) => {
  await pool.query('DELETE FROM budgets WHERE user_id = $1 AND id = $2', [
    req.userId,
    req.params.id,
  ]);
  res.json({ ok: true });
});

async function start() {
  await ensureDatabase();
  await waitForDb();
  await runMigrations();
  await ensureAdminUser(pool);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API Aplica PRO rodando em http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Falha ao iniciar API:', err);
  process.exit(1);
});
