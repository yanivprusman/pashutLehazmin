import { NextRequest } from 'next/server';
import { computeBaskets, type ParsedItem } from '@/lib/basket';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { items?: ParsedItem[] };
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return Response.json({ error: 'no items' }, { status: 400 });
  }
  const baskets = await computeBaskets(items);
  return Response.json(baskets);
}
