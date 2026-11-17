import Anthropic from '@anthropic-ai/sdk';
import { execFile } from 'node:child_process';

// Provider order: ANTHROPIC_API_KEY → local `claude` CLI (uses the logged-in Claude Code) → deterministic mock.
// Force one with LLM_PROVIDER=anthropic|claude-cli|mock.
export type Provider = 'anthropic' | 'claude-cli' | 'mock';

export function provider(): Provider {
  const forced = process.env.LLM_PROVIDER as Provider | undefined;
  if (forced) return forced;
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.LLM_DISABLE_CLI !== '1') return 'claude-cli';
  return 'mock';
}

function extractJSON(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  if (start < 0) throw new Error('no JSON in model output');
  const end = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'));
  return JSON.parse(body.slice(start, end + 1));
}

async function viaAnthropic(system: string, user: string): Promise<string> {
  // SDK defaults are 2 retries x 10 min, and a retried timeout can bill twice: one retry, 5 min each (JSON answers take well under that)
  const client = new Anthropic({ maxRetries: 1, timeout: 300_000 });
  const res = await client.beta.messages.create({
    model: process.env.LLM_MODEL || 'claude-opus-5-5',
    max_tokens: 16000, // adaptive thinking counts toward this too
    // server-side refusal fallback: a policy decline is re-run on the model's default fallback inside the same call
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: user }],
  });
  // the whole fallback chain declined, or nothing usable came back: throw so completeJSON uses the mock answer
  if (res.stop_reason === 'refusal') throw new Error(`refused (${res.stop_details?.category ?? 'no category'})`);
  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  if (!text.trim()) throw new Error(`no text (stop_reason ${res.stop_reason})`);
  return text;
}

function viaClaudeCli(system: string, user: string): Promise<string> {
  const env = { ...process.env };
  delete env.CLAUDECODE; // allow running from inside a Claude Code session
  return new Promise((resolve, reject) => {
    execFile(
      'claude',
      ['-p', user, '--append-system-prompt', system, '--output-format', 'json', '--model', process.env.LLM_CLI_MODEL ?? 'sonnet'],
      { env, timeout: Number(process.env.LLM_TIMEOUT_MS ?? 120000), maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(err);
        try {
          resolve(String((JSON.parse(stdout) as { result?: string }).result ?? ''));
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}

/** Ask the model for JSON. Any failure falls back to `fallback()` so the PoC always works offline. */
export async function completeJSON<T>(
  system: string,
  user: string,
  fallback: () => T,
): Promise<{ data: T; provider: Provider; error?: string }> {
  const p = provider();
  if (p === 'mock') return { data: fallback(), provider: 'mock' };
  try {
    const text = p === 'anthropic' ? await viaAnthropic(system, user) : await viaClaudeCli(system, user);
    return { data: extractJSON(text) as T, provider: p };
  } catch (e) {
    return { data: fallback(), provider: 'mock', error: `${p} failed: ${(e as Error).message.slice(0, 200)}` };
  }
}
