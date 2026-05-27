import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  const migrationsDir = join(__dirname, '../migrations');
  if (!existsSync(migrationsDir)) {
    throw new Error(`Pasta de migrations não encontrada: ${migrationsDir}`);
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
