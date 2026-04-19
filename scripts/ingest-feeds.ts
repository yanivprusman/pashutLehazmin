#!/usr/bin/env tsx
import { pool } from '../lib/db';
import { V0_STORES } from '../lib/feeds/types';
import { fetchShufersalPriceFull } from '../lib/feeds/shufersal';
import { fetchRamiLeviPriceFull } from '../lib/feeds/ramilevi';
import {
  upsertProducts,
  recordIngestStart,
  recordIngestSuccess,
  recordIngestError,
} from '../lib/feeds/upsert';

async function ingestOne(
  chain: 'shufersal' | 'ramilevi',
  storeId: string,
  fetcher: (storeId: string) => Promise<{ products: Awaited<ReturnType<typeof fetchShufersalPriceFull>>['products']; sourceFilename: string }>,
) {
  const conn = await pool.getConnection();
  let logId: number | null = null;
  try {
    logId = await recordIngestStart(conn, chain, storeId);
    const t0 = Date.now();
    console.log(`[${chain}:${storeId}] fetching PriceFull…`);
    const { products, sourceFilename } = await fetcher(storeId);
    console.log(`[${chain}:${storeId}] parsed ${products.length} items from ${sourceFilename} in ${Date.now() - t0}ms`);

    const t1 = Date.now();
    const upserted = await upsertProducts(conn, products);
    console.log(`[${chain}:${storeId}] upserted ${upserted} rows in ${Date.now() - t1}ms`);

    await recordIngestSuccess(conn, logId, sourceFilename, products.length);
  } catch (err) {
    console.error(`[${chain}:${storeId}] FAILED:`, err);
    if (logId !== null) await recordIngestError(conn, logId, err);
    throw err;
  } finally {
    conn.release();
  }
}

async function main() {
  const results = await Promise.allSettled([
    ingestOne('shufersal', V0_STORES.shufersal.storeId, fetchShufersalPriceFull),
    ingestOne('ramilevi', V0_STORES.ramilevi.storeId, fetchRamiLeviPriceFull),
  ]);

  let failed = 0;
  for (const r of results) {
    if (r.status === 'rejected') failed++;
  }

  await pool.end();

  if (failed > 0) {
    console.error(`${failed} chain(s) failed`);
    process.exit(1);
  }
  console.log('done');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
