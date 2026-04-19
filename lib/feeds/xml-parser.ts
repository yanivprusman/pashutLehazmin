import { XMLParser } from 'fast-xml-parser';
import type { Chain, NormalizedProduct } from './types';

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  numberParseOptions: { skipLike: /./, hex: false, leadingZeros: false },
});

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : undefined;
}

function bool(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  const s = String(v).trim();
  return s === '1' || s.toLowerCase() === 'true';
}

interface RawItem {
  ItemCode?: string;
  ItemName?: string;
  ManufacturerName?: string;
  ManufactureName?: string;
  UnitOfMeasure?: string;
  UnitQty?: string;
  Quantity?: string;
  UnitOfMeasurePrice?: string;
  ItemPrice?: string;
  bIsWeighted?: string;
  blsWeighted?: string;
  PriceUpdateDate?: string;
}

function extractRoot(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  const o = obj as Record<string, unknown>;
  if ('Root' in o) return o.Root;
  if ('root' in o) return o.root;
  if ('asx:abap' in o) {
    const abap = o['asx:abap'] as Record<string, unknown> | undefined;
    if (abap && typeof abap === 'object' && 'asx:values' in abap) {
      return (abap as Record<string, unknown>)['asx:values'];
    }
  }
  return o;
}

function extractItemsArray(root: unknown): RawItem[] {
  if (!root || typeof root !== 'object') return [];
  const r = root as Record<string, unknown>;
  const itemsNode = r.Items ?? r.items ?? r.ITEMS;
  if (!itemsNode || typeof itemsNode !== 'object') return [];
  const i = itemsNode as Record<string, unknown>;
  const itemArr = i.Item ?? i.item ?? i.ITEM ?? i.Items;
  return asArray<RawItem>(itemArr as RawItem | RawItem[] | undefined);
}

export function parsePriceFullXml(
  xmlText: string,
  chain: Chain,
  storeId: string,
  defaultUpdated: Date,
): NormalizedProduct[] {
  const doc = parser.parse(xmlText);
  const root = extractRoot(doc);
  const rawItems = extractItemsArray(root);

  const out: NormalizedProduct[] = [];
  for (const raw of rawItems) {
    const itemCode = raw.ItemCode?.toString().trim();
    const itemName = raw.ItemName?.toString().trim();
    const priceRaw = num(raw.ItemPrice);
    if (!itemCode || !itemName || priceRaw === undefined) continue;

    const lastUpdatedStr = raw.PriceUpdateDate?.toString().trim();
    let lastUpdated = defaultUpdated;
    if (lastUpdatedStr) {
      const parsed = new Date(lastUpdatedStr.replace(' ', 'T'));
      if (!isNaN(parsed.getTime())) lastUpdated = parsed;
    }

    out.push({
      chain,
      storeId,
      itemCode,
      itemName,
      manufacturer: raw.ManufacturerName?.toString().trim() || raw.ManufactureName?.toString().trim() || undefined,
      unitOfMeasure: raw.UnitOfMeasure?.toString().trim() || raw.UnitQty?.toString().trim() || undefined,
      quantity: num(raw.Quantity),
      unitPrice: num(raw.UnitOfMeasurePrice),
      itemPrice: priceRaw,
      isWeighted: bool(raw.bIsWeighted ?? raw.blsWeighted),
      lastUpdated,
    });
  }
  return out;
}
