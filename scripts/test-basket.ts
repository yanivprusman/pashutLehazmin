#!/usr/bin/env tsx
import { pool } from '../lib/db';
import { computeBaskets, type ParsedItem } from '../lib/basket';

async function main() {
  const list: ParsedItem[] = [
    { query: 'חלב 1%', quantity: 2 },
    { query: 'לחם אחיד', quantity: 1 },
    { query: 'ביצים גודל L', quantity: 1 },
    { query: 'יוגורט טבעי', quantity: 4 },
    { query: 'גבינה צהובה פרוסות', quantity: 1 },
    { query: 'בננה', quantity: 1 },
  ];

  const { singleCheapest, splitCheapest } = await computeBaskets(list);

  for (const b of [singleCheapest, splitCheapest]) {
    console.log(`\n=== ${b.strategy} (${b.chain}) ===`);
    const belowMinSummary = b.belowMinimum.length > 0
      ? b.belowMinimum.map(i => `${i.chain} short ₪${i.shortfall}`).join(', ')
      : 'ok';
    console.log(`items: ${b.itemsTotal}₪  delivery: ${b.deliveryFee}₪  TOTAL: ${b.grandTotal}₪  unmatched: ${b.unmatchedCount}  belowMinimum: ${belowMinSummary}`);
    for (const line of b.lines) {
      const m = line.matched;
      if (m) {
        console.log(`  [${m.chain}] ${line.requested.query} → ${m.item_name} (${m.item_price}₪ × ${line.effectiveQty})  score=${m.score.toFixed(2)}`);
      } else {
        console.log(`  [--] ${line.requested.query} → no match`);
      }
    }
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
