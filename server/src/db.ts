import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://aplica:aplica@localhost:5432/aplica_pro',
});

/** Cria o banco da DATABASE_URL se o volume Postgres já existir sem ele (comum no Coolify). */
export async function ensureDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }

  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!dbName || !/^[a-zA-Z0-9_]+$/.test(dbName)) return;

  parsed.pathname = '/postgres';
  const admin = new Pool({ connectionString: parsed.toString() });

  try {
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      dbName,
    ]);
    if (exists.rows.length === 0) {
      await admin.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[db] Banco "${dbName}" criado.`);
    }
  } catch (err) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '28P01') {
      console.error(
        '[db] Senha do Postgres incorreta. O volume foi criado com outra senha.',
        'No Coolify: apague o volume postgres-data, confira POSTGRES_PASSWORD e redeploy.',
      );
    }
    throw err;
  } finally {
    await admin.end();
  }
}

export async function waitForDb(maxAttempts = 60): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (i === 0 || i === maxAttempts - 1) {
        console.warn(`[db] Aguardando Postgres (${i + 1}/${maxAttempts}): ${msg}`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error('Banco de dados indisponível');
}
