import { pool } from './db';
import type { Chain } from './feeds/types';

export interface ProductRow {
  id: number;
  chain: Chain;
  item_code: string;
  item_name: string;
  manufacturer: string | null;
  item_price: number;
  unit_of_measure: string | null;
  quantity: number | null;
  is_weighted: 0 | 1;
}

export interface MatchCandidate extends ProductRow {
  score: number;
}

const NIQQUD_RE = /[\u0591-\u05C7]/g;
const NONWORD_RE = /[^\u0590-\u05FF\u0041-\u005A\u0061-\u007A0-9\s%]/g;
const FINAL_LETTER_MAP: Record<string, string> = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

export function normalizeHebrew(s: string): string {
  const stripped = s
    .replace(NIQQUD_RE, '')
    .replace(NONWORD_RE, ' ')
    .trim()
    .toLowerCase();
  let out = '';
  for (const ch of stripped) {
    out += FINAL_LETTER_MAP[ch] ?? ch;
  }
  return out.replace(/\s+/g, ' ');
}

export function tokenize(s: string): string[] {
  return normalizeHebrew(s).split(' ').filter(t => t.length > 0);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const tok of a) if (b.has(tok)) inter++;
  return inter / (a.size + b.size - inter);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

export function scoreMatch(queryNorm: string, candidateNorm: string): number {
  if (!queryNorm || !candidateNorm) return 0;
  const qTokens = new Set(queryNorm.split(' '));
  const cTokens = new Set(candidateNorm.split(' '));
  const jac = jaccard(qTokens, cTokens);

  const containsBonus = candidateNorm.includes(queryNorm) || queryNorm.includes(candidateNorm) ? 0.3 : 0;

  const lev = levenshtein(queryNorm, candidateNorm);
  const maxLen = Math.max(queryNorm.length, candidateNorm.length);
  const levScore = maxLen > 0 ? 1 - lev / maxLen : 0;

  return Math.min(1, 0.6 * jac + 0.3 * levScore + containsBonus);
}

export async function findMatches(
  chain: Chain,
  storeId: string,
  query: string,
  limit = 5,
): Promise<MatchCandidate[]> {
  const normalized = normalizeHebrew(query);
  if (normalized.length === 0) return [];

  const likeClauses: string[] = [];
  const likeParams: string[] = [];
  const tokens = tokenize(query).slice(0, 4);
  if (tokens.length > 0) {
    for (const tok of tokens) {
      likeClauses.push('item_name LIKE ?');
      likeParams.push(`%${tok}%`);
    }
  } else {
    likeClauses.push('item_name LIKE ?');
    likeParams.push(`%${query}%`);
  }

  const sql = `
    SELECT id, chain, item_code, item_name, manufacturer,
           CAST(item_price AS DECIMAL(10,2)) AS item_price,
           unit_of_measure, quantity, is_weighted
    FROM products
    WHERE chain = ? AND store_id = ?
      AND (${likeClauses.join(' OR ')})
    LIMIT 200
  `;
  const [rows] = (await pool.query(sql, [chain, storeId.padStart(3, '0'), ...likeParams])) as unknown as [ProductRow[]];

  const scored: MatchCandidate[] = rows.map(r => ({
    ...r,
    item_price: Number(r.item_price),
    score: scoreMatch(normalized, normalizeHebrew(r.item_name)),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export async function findByBarcode(
  chain: Chain,
  storeId: string,
  barcode: string,
): Promise<ProductRow | null> {
  const [rows] = (await pool.query(
    `SELECT id, chain, item_code, item_name, manufacturer,
            CAST(item_price AS DECIMAL(10,2)) AS item_price,
            unit_of_measure, quantity, is_weighted
     FROM products WHERE chain = ? AND store_id = ? AND item_code = ? LIMIT 1`,
    [chain, storeId.padStart(3, '0'), barcode],
  )) as unknown as [ProductRow[]];
  if (rows.length === 0) return null;
  const r = rows[0];
  return { ...r, item_price: Number(r.item_price) };
}
