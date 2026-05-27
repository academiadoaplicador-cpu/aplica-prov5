/**
 * Remove materiais e eletros importados e restaura o catálogo padrão por usuário.
 * Uso: npx tsx scripts/clean-imports.ts
 */
import { pool } from '../src/db.js';
import { seedUserData } from '../src/seed/seedUser.js';

async function main() {
  const users = await pool.query<{ id: string }>('SELECT id FROM users ORDER BY id');
  if (users.rows.length === 0) {
    console.log('Nenhum usuário encontrado.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const { id: userId } of users.rows) {
      const mats = await client.query(
        'DELETE FROM materials WHERE user_id = $1 RETURNING id',
        [userId],
      );
      const apps = await client.query(
        'DELETE FROM appliances WHERE user_id = $1 RETURNING id',
        [userId],
      );
      await seedUserData(client, userId);
      console.log(
        `Usuário ${userId}: removidos ${mats.rowCount} materiais, ${apps.rowCount} eletros; catálogo padrão restaurado.`,
      );
    }

    await client.query('COMMIT');
    console.log('Limpeza concluída.');
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
