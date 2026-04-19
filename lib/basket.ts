import { ALL_CHAINS, CHAIN_META } from './chains';
import { V0_STORES } from './feeds/types';
import { findMatches, findByBarcode, type MatchCandidate } from './matching';
import type { Chain } from './feeds/types';

export interface ParsedItem {
  query: string;
  quantity?: number;
  barcode?: string;
  notes?: string;
}

export interface BasketLine {
  requested: ParsedItem;
  chain: Chain;
  matched: MatchCandidate | null;
  effectivePrice: number;
  effectiveQty: number;
}

export interface Basket {
  strategy: 'single_cheapest' | 'split_cheapest';
  chain: 'shufersal' | 'ramilevi' | 'mixed';
  lines: BasketLine[];
  itemsTotal: number;
  deliveryFee: number;
  grandTotal: number;
  belowMinimum: boolean;
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

function summarize(
  strategy: Basket['strategy'],
  chain: Basket['chain'],
  lines: BasketLine[],
): Basket {
  const itemsTotal = lines.reduce((s, l) => s + l.effectivePrice, 0);
  const chainsInBasket = new Set(lines.filter(l => l.matched).map(l => l.chain));
  let deliveryFee = 0;
  let belowMinimum = false;
  for (const c of chainsInBasket) {
    const meta = CHAIN_META[c];
    const subtotal = lines.filter(l => l.chain === c && l.matched).reduce((s, l) => s + l.effectivePrice, 0);
    deliveryFee += meta.deliveryFee;
    if (subtotal < meta.deliveryMinimum) belowMinimum = true;
  }
  return {
    strategy,
    chain,
    lines,
    itemsTotal: Number(itemsTotal.toFixed(2)),
    deliveryFee,
    grandTotal: Number((itemsTotal + deliveryFee).toFixed(2)),
    belowMinimum,
    unmatchedCount: lines.filter(l => !l.matched).length,
  };
}

export async function computeBaskets(items: ParsedItem[]): Promise<{
  singleCheapest: Basket;
  splitCheapest: Basket;
}> {
  const perChain = await bestPerChain(items);

  const chainTotals: Record<Chain, number> = { shufersal: 0, ramilevi: 0 };
  for (const chain of ALL_CHAINS) {
    chainTotals[chain] = perChain[chain].reduce((s, m, i) => {
      if (!m) return s;
      const qty = items[i].quantity ?? 1;
      return s + m.item_price * qty;
    }, 0);
  }
  const bestSingleChain: Chain = chainTotals.shufersal <= chainTotals.ramilevi ? 'shufersal' : 'ramilevi';
  const singleLines = items.map((it, i) => lineFor(it, bestSingleChain, perChain[bestSingleChain][i]));
  const singleCheapest = summarize('single_cheapest', bestSingleChain, singleLines);

  const splitLines: BasketLine[] = items.map((it, i) => {
    let cheapestChain: Chain = ALL_CHAINS[0];
    let cheapestMatch: MatchCandidate | null = null;
    let cheapestPrice = Infinity;
    for (const chain of ALL_CHAINS) {
      const m = perChain[chain][i];
      if (m && m.item_price < cheapestPrice) {
        cheapestPrice = m.item_price;
        cheapestMatch = m;
        cheapestChain = chain;
      }
    }
    return lineFor(it, cheapestChain, cheapestMatch);
  });
  const splitChains = new Set(splitLines.filter(l => l.matched).map(l => l.chain));
  const splitChainLabel: Basket['chain'] = splitChains.size === 1
    ? ([...splitChains][0] as Chain)
    : 'mixed';
  const splitCheapest = summarize('split_cheapest', splitChainLabel, splitLines);

  return { singleCheapest, splitCheapest };
}
