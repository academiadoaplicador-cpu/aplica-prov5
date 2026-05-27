import type { PoolClient } from 'pg';
import { APPLIANCES_DATABASE, DEFAULT_MATERIALS, VEHICLES_DATABASE } from './defaultData.js';

export async function seedUserData(client: PoolClient, userId: string): Promise<void> {
  await client.query(
    `INSERT INTO financial_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );

  for (const m of DEFAULT_MATERIALS) {
    await client.query(
      `INSERT INTO materials (
        user_id, id, name, brand, price_per_m2, type, line, color_texture,
        durability, recommended_for, details
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`,
      [
        userId,
        m.id,
        m.name,
        m.brand,
        m.pricePerM2,
        m.type,
        m.line,
        m.colorTexture,
        m.durability,
        m.recommendedFor,
        m.details ?? null,
      ],
    );
  }

  for (const v of VEHICLES_DATABASE) {
    await client.query(
      `INSERT INTO vehicles (user_id, id, make, model, year, size, part_measurements)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [userId, v.id, v.make, v.model, v.year, v.size, JSON.stringify(v.partMeasurements)],
    );
  }

  for (const a of APPLIANCES_DATABASE) {
    await client.query(
      `INSERT INTO appliances (user_id, id, make, model, type, width, height, depth)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [userId, a.id, a.make, a.model, a.type, a.width, a.height, a.depth],
    );
  }
}
