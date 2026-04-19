import { ALL_CHAINS, CHAIN_META } from './chains';
import { V0_STORES } from './feeds/types';
import { findMatches, findByBarcode, type MatchCandidate } from './matching';
import type { Chain } from './feeds/types';

export interface ParsedItem {
  query: string;
  quantity?: number;
  barcode?: string;
  notes?: string;
  clarify_needed?: string;
  clarify_options?: string[];
}

export interface BasketLine {
  requested: ParsedItem;
  chain: Chain;
  matched: MatchCandidate | null;
  effectivePrice: number;
  effectiveQty: number;
}

export interface BelowMinimumInfo {
  chain: Chain;
  chainLabel: string;
  minimum: number;
  subtotal: number;
  shortfall: number;
}

export interface Basket {
  chain: Chain;
  lines: BasketLine[];
  itemsTotal: number;
  deliveryFee: number;
  grandTotal: number;
  belowMinimum: BelowMinimumInfo[];
  unmatchedCount: number;
}

async function bestCandidate(
  chain: Chain,
  requested: ParsedItem,
): Promise<MatchCandidate | null> {
  const storeId = V0_STORES[chain].storeId;
  if (requested.barcode) {
    const exact = await findByBarcode(chain, storeId, requested.barcode);
    if (exact) return { ...exact, score: 1 };
  }
  const candidates = await findMatches(chain, storeId, requested.query, 5);
  if (candidates.length === 0) return null;
  const top = candidates[0];
  if (top.score < 0.25) return null;
  return top;
}

async function bestPerChain(
  items: ParsedItem[],
): Promise<Record<Chain, (MatchCandidate | null)[]>> {
  const result: Record<Chain, (MatchCandidate | null)[]> = {
    shufersal: [],
    ramilevi: [],
  };
  for (const chain of ALL_CHAINS) {
    result[chain] = await Promise.all(items.map(it => bestCandidate(chain, it)));
  }
  return result;
}

function lineFor(
  requested: ParsedItem,
  chain: Chain,
  matched: MatchCandidate | null,
): BasketLine {
  const qty = requested.quantity ?? 1;
  const price = matched ? matched.item_price * qty : 0;
  return {
    requested,
    chain,
    matched,
    effectivePrice: price,
    effectiveQty: qty,
  };
}

function summarize(chain: Chain, lines: BasketLine[]): Basket {
  const itemsTotal = lines.reduce((s, l) => s + l.effectivePrice, 0);
  const matchedSubtotal = lines.filter(l => l.matched).reduce((s, l) => s + l.effectivePrice, 0);
  const meta = CHAIN_META[chain];
  const hasAnyMatched = lines.some(l => l.matched);
  const deliveryFee = hasAnyMatched ? meta.deliveryFee : 0;
  const belowMinimum: BelowMinimumInfo[] = [];
  if (hasAnyMatched && matchedSubtotal < meta.deliveryMinimum) {
    belowMinimum.push({
      chain,
      chainLabel: meta.labelHe,
      minimum: meta.deliveryMinimum,
      subtotal: Number(matchedSubtotal.toFixed(2)),
      shortfall: Number((meta.deliveryMinimum - matchedSubtotal).toFixed(2)),
    });
  }
  return {
    chain,
    lines,
    itemsTotal: Number(itemsTotal.toFixed(2)),
    deliveryFee,
    grandTotal: Number((itemsTotal + deliveryFee).toFixed(2)),
    belowMinimum,
    unmatchedCount: lines.filter(l => !l.matched).length,
  };
}

export async function computeBaskets(items: ParsedItem[]): Promise<Record<Chain, Basket>> {
  const perChain = await bestPerChain(items);
  const result = {} as Record<Chain, Basket>;
  for (const chain of ALL_CHAINS) {
    const lines = items.map((it, i) => lineFor(it, chain, perChain[chain][i]));
    result[chain] = summarize(chain, lines);
  }
  return result;
}
