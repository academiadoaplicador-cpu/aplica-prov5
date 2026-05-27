import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CORE_MIGRATIONS = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`,
];

export async function runMigrations(): Promise<void> {
  for (const sql of CORE_MIGRATIONS) {
    await pool.query(sql);
  }

  const migrationsDir = join(__dirname, '../migrations');
  if (!existsSync(migrationsDir)) {
    console.warn('Pasta de migrations não encontrada:', migrationsDir);
    return;
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    await pool.query(sql);
    console.log(`Migration aplicada: ${file}`);
  }
}
