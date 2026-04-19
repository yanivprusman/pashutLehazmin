import type { PoolConnection } from 'mysql2/promise';
import type { NormalizedProduct } from './types';

const CHUNK_SIZE = 1000;

export async function upsertProducts(
  conn: PoolConnection,
  products: NormalizedProduct[],
): Promise<number> {
  if (products.length === 0) return 0;

  const sql = `
    INSERT INTO products
      (chain, store_id, item_code, item_name, manufacturer, unit_of_measure,
       quantity, unit_price, item_price, is_weighted, last_updated)
    VALUES ?
    ON DUPLICATE KEY UPDATE
      item_name = VALUES(item_name),
      manufacturer = VALUES(manufacturer),
      unit_of_measure = VALUES(unit_of_measure),
      quantity = VALUES(quantity),
      unit_price = VALUES(unit_price),
      item_price = VALUES(item_price),
      is_weighted = VALUES(is_weighted),
      last_updated = VALUES(last_updated)
  `;

  let affected = 0;
  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    const chunk = products.slice(i, i + CHUNK_SIZE);
    const rows = chunk.map(p => [
      p.chain,
      p.storeId,
      p.itemCode,
      p.itemName.slice(0, 500),
      p.manufacturer?.slice(0, 200) ?? null,
      p.unitOfMeasure?.slice(0, 50) ?? null,
      p.quantity ?? null,
      p.unitPrice ?? null,
      p.itemPrice,
      p.isWeighted,
      p.lastUpdated,
    ]);
    const [result] = (await conn.query(sql, [rows])) as unknown as [{ affectedRows: number }];
    affected += result.affectedRows;
  }
  return affected;
}

export async function recordIngestStart(
  conn: PoolConnection,
  chain: string,
  storeId: string,
): Promise<number> {
  const [result] = (await conn.query(
    'INSERT INTO feed_ingest_log (chain, store_id, status) VALUES (?, ?, ?)',
    [chain, storeId, 'running'],
  )) as unknown as [{ insertId: number }];
  return result.insertId;
}

export async function recordIngestSuccess(
  conn: PoolConnection,
  id: number,
  sourceFilename: string,
  itemsUpserted: number,
) {
  await conn.query(
    "UPDATE feed_ingest_log SET status='ok', source_filename=?, items_upserted=?, finished_at=NOW() WHERE id=?",
    [sourceFilename, itemsUpserted, id],
  );
}

export async function recordIngestError(conn: PoolConnection, id: number, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  await conn.query(
    "UPDATE feed_ingest_log SET status='error', error_message=?, finished_at=NOW() WHERE id=?",
    [msg.slice(0, 1000), id],
  );
}
