import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { BASE } from '@/lib/base';
import { DEFAULT_IMAGE_MODEL, IMAGE_PROMPT_MAX, imageFromResponse, imageRequestBody, nameFromPrompt, NO_KEY, openaiError } from '@/lib/imagegen';
import { MAX_UPLOAD, sniffImage } from '@/lib/images';
import { now, store, UPLOAD_DIR } from '@/lib/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const TOO_BIG = '만든 이미지가 5MB 를 넘어 저장하지 못했어요. 다시 시도해 주세요.';
// A 5MB image is about 7MB of base64; the rest of the JSON is tiny.
const BODY_CAP = Math.ceil(MAX_UPLOAD / 3) * 4 + 64 * 1024;

// Real image generation only (no mock fallback, even with LLM_PROVIDER=mock). The key stays on the server and out of every message.
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return bad(NO_KEY, 503);
  // JSON only: a cross-site page cannot send it without a CORS preflight, which this app never allows. Each call costs money.
  if (!(req.headers.get('content-type') ?? '').startsWith('application/json')) return bad('요청 형식이 올바르지 않아요.', 415);
  const b = (await req.json().catch(() => null)) as { prompt?: unknown; title?: unknown } | null;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return bad('요청 형식이 올바르지 않아요.');
  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : '';
  if (!prompt) return bad('어떤 그림을 만들지 프롬프트를 적어 주세요.');
  if (prompt.length > IMAGE_PROMPT_MAX) return bad(`프롬프트를 ${IMAGE_PROMPT_MAX.toLocaleString('ko-KR')}자 이내로 적어 주세요.`);
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (title.length > 200) return bad('이미지 이름은 200자 이내로 적어 주세요.');

  const base = (process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');
  let status: number;
  let text: string;
  try {
    const res = await fetch(`${base}/images/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(imageRequestBody(prompt, process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL)),
      signal: AbortSignal.timeout(Number(process.env.OPENAI_TIMEOUT_MS) || 180000),
    });
    status = res.status;
    // Read inside the try (the timeout covers the body too) and stop past the cap instead of buffering whatever comes back.
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > BODY_CAP) {
        await reader.cancel();
        return bad(TOO_BIG, 502);
      }
      chunks.push(value);
    }
    text = Buffer.concat(chunks).toString('utf8');
  } catch (e) {
    if ((e as Error).name === 'TimeoutError') return bad('OpenAI 응답이 너무 오래 걸려 멈췄어요. 잠시 뒤 다시 시도해 주세요.', 504);
    return bad('OpenAI 에 연결하지 못했어요. 네트워크나 OPENAI_BASE_URL 을 확인해 주세요.', 502);
  }
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    // not JSON: handled below as an error or a missing image
  }
  if (status < 200 || status >= 300) return bad(openaiError(status, data, key), status === 400 || status === 429 ? status : 502);

  const bytes = imageFromResponse(data);
  if (!bytes || !sniffImage(bytes)) return bad('OpenAI 응답에 이미지가 없어요. 다시 시도해 주세요.', 502);
  if (bytes.length > MAX_UPLOAD) return bad(TOO_BIG, 502);

  const id = randomUUID();
  const file = path.join(UPLOAD_DIR, id);
  const d = store();
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(file, bytes);
    d.prepare('INSERT INTO plan_inputs (id, kind, title, body, url, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, 'image', title || nameFromPrompt(prompt), null, `${BASE}/api/images/${id}`, 'openai', now());
  } catch {
    await fs.rm(file, { force: true }); // no row points at it, so do not leave it behind
    return bad('만든 이미지를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.', 500);
  }
  return NextResponse.json({ input: d.prepare('SELECT * FROM plan_inputs WHERE id = ?').get(id) }, { status: 201 });
}
