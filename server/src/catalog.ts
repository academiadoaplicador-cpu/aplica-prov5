import type { Pool, PoolClient } from 'pg';
import { getAdminEmail } from './admin.js';

let cachedCatalogUserId: string | null = null;

/** ID do usuário dono do catálogo global (conta administrativa). */
export async function resolveCatalogUserId(db: Pool | PoolClient): Promise<string> {
  if (cachedCatalogUserId) return cachedCatalogUserId;

  const adminEmail = getAdminEmail();
  if (adminEmail) {
    const result = await db.query<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1',
      [adminEmail],
    );
    if (result.rows.length > 0) {
      cachedCatalogUserId = result.rows[0].id;
      return cachedCatalogUserId;
    }
  }

  const devAdmin = await db.query<{ id: string }>(
    "SELECT id FROM users WHERE id = 'admin' LIMIT 1",
  );
  if (devAdmin.rows.length > 0) {
    cachedCatalogUserId = devAdmin.rows[0].id;
    return cachedCatalogUserId;
  }

  throw new Error('Catálogo do sistema indisponível: conta administrativa não encontrada.');
}

export function resetCatalogUserIdCache(): void {
  cachedCatalogUserId = null;
}
