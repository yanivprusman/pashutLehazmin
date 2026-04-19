import { query } from '@anthropic-ai/claude-agent-sdk';

export interface OneShotOptions {
  systemPrompt: string;
  userPrompt: string;
  model?: 'haiku' | 'sonnet' | 'opus';
  maxTurns?: number;
}

function extractAssistantText(msg: unknown): string {
  if (!msg || typeof msg !== 'object') return '';
  const m = msg as Record<string, unknown>;
  if (m.type !== 'assistant') return '';
  const message = m.message as Record<string, unknown> | undefined;
  const content = message?.content;
  if (!Array.isArray(content)) return '';
  let out = '';
  for (const block of content) {
    if (block && typeof block === 'object') {
      const b = block as Record<string, unknown>;
      if (b.type === 'text' && typeof b.text === 'string') out += b.text;
    }
  }
  return out;
}

export async function oneShotText({
  systemPrompt,
  userPrompt,
  model = 'haiku',
  maxTurns = 1,
}: OneShotOptions): Promise<string> {
  const q = query({
    prompt: userPrompt,
    options: {
      systemPrompt,
      model,
      maxTurns,
      permissionMode: 'default',
      allowedTools: [],
      disallowedTools: ['Bash', 'Edit', 'Write', 'Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Task', 'TaskCreate'],
      settingSources: [],
      pathToClaudeCodeExecutable: process.env.CLAUDE_CODE_PATH ?? '/root/.local/bin/claude',
      stderr: (line: string) => console.error('[claude-sdk]', line),
    } as unknown as Parameters<typeof query>[0]['options'],
  });

  let text = '';
  for await (const msg of q) {
    text += extractAssistantText(msg);
  }
  return text.trim();
}

export function extractJson<T = unknown>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : text.trim();
  const firstBrace = Math.min(
    ...[candidate.indexOf('['), candidate.indexOf('{')].filter(i => i >= 0),
  );
  const jsonStart = Number.isFinite(firstBrace) && firstBrace >= 0 ? firstBrace : 0;
  const lastBrace = Math.max(candidate.lastIndexOf(']'), candidate.lastIndexOf('}'));
  const sliced = lastBrace > jsonStart ? candidate.slice(jsonStart, lastBrace + 1) : candidate;
  return JSON.parse(sliced) as T;
}
