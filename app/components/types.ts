export interface ParsedItem {
  query: string;
  quantity?: number;
  barcode?: string;
  notes?: string;
  clarify_needed?: string;
  clarify_options?: string[];
}

export interface MatchedProduct {
  id: number;
  chain: 'shufersal' | 'ramilevi';
  item_code: string;
  item_name: string;
  manufacturer: string | null;
  item_price: number;
  unit_of_measure: string | null;
  score: number;
}

export interface BasketLine {
  requested: ParsedItem;
  chain: 'shufersal' | 'ramilevi';
  matched: MatchedProduct | null;
  effectivePrice: number;
  effectiveQty: number;
}

export interface BelowMinimumInfo {
  chain: 'shufersal' | 'ramilevi';
  chainLabel: string;
  minimum: number;
  subtotal: number;
  shortfall: number;
}

export interface Basket {
  strategy: 'single_cheapest' | 'split_cheapest';
  chain: 'shufersal' | 'ramilevi' | 'mixed';
  lines: BasketLine[];
  itemsTotal: number;
  deliveryFee: number;
  grandTotal: number;
  belowMinimum: BelowMinimumInfo[];
  unmatchedCount: number;
}

export interface BasketsResponse {
  singleCheapest: Basket;
  splitCheapest: Basket;
}
