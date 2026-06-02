/**
 * Restaura o catálogo global (conta admin) — materiais, veículos e eletros.
 * Uso: npx tsx scripts/clean-imports.ts
 */
import { resolveCatalogUserId } from '../src/catalog.js';
import { pool } from '../src/db.js';
import { seedCatalogData } from '../src/seed/seedUser.js';

async function main() {
  const client = await pool.connect();
  try {
    const catalogUserId = await resolveCatalogUserId(client);
    await client.query('BEGIN');

    const mats = await client.query(
      'DELETE FROM materials WHERE user_id = $1 RETURNING id',
      [catalogUserId],
    );
    const vehicles = await client.query(
      'DELETE FROM vehicles WHERE user_id = $1 RETURNING id',
      [catalogUserId],
    );
    const apps = await client.query(
      'DELETE FROM appliances WHERE user_id = $1 RETURNING id',
      [catalogUserId],
    );

    await seedCatalogData(client, catalogUserId);

    await client.query('COMMIT');
    console.log(
      `Catálogo global (${catalogUserId}): removidos ${mats.rowCount} materiais, ${vehicles.rowCount} veículos, ${apps.rowCount} eletros; padrão restaurado.`,
    );
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Erro na limpeza:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
