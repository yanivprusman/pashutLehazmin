import { NextRequest } from 'next/server';
import { oneShotText, extractJson } from '@/lib/claude';
import { PARSE_LIST_SYSTEM_PROMPT } from '@/lib/prompts';
import type { ParsedItem } from '@/lib/basket';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { text?: string };
  const text = body.text?.trim() ?? '';
  if (text.length === 0) {
    return Response.json({ error: 'empty list' }, { status: 400 });
  }
  if (text.length > 4000) {
    return Response.json({ error: 'list too long' }, { status: 400 });
  }

  try {
    const raw = await oneShotText({
      systemPrompt: PARSE_LIST_SYSTEM_PROMPT,
      userPrompt: text,
      model: 'haiku',
    });
    const items = extractJson<ParsedItem[]>(raw);
    if (!Array.isArray(items)) {
      return Response.json({ error: 'parse failed', raw }, { status: 500 });
    }
    return Response.json({ items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
