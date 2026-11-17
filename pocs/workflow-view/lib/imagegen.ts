// One OpenAI image per agent answer. The pure helpers are copied from plan-doc (lib/imagegen.ts, lib/images.ts):
// keep them identical there and here (lib/imagegen.test.ts checks). generateImage mirrors plan-doc's /api/images/generate.
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BASE } from './base.ts';
import { db, UPLOAD_DIR } from './db.ts';

// ---------- copied from plan-doc/lib/imagegen.ts ----------
export const IMAGE_PROMPT_MAX = 4000;
export const DEFAULT_IMAGE_MODEL = 'gpt-image-2.5-flare';

/** Body for POST /v1/images/generations. GPT image models always answer in base64 and reject response_format/style. */
export function imageRequestBody(prompt: string, model: string) {
  // landscape for a plan doc; webp keeps the file under MAX_UPLOAD
  return { model, prompt, size: '1536x1024', output_format: 'webp' };
}

/** Image bytes from a generations response (data[0].b64_json), or null when there is none. */
export function imageFromResponse(data: unknown): Uint8Array | null {
  const b64 = (data as { data?: { b64_json?: unknown }[] } | null)?.data?.[0]?.b64_json;
  if (typeof b64 !== 'string' || !b64) return null;
  const bytes = Buffer.from(b64, 'base64');
  return bytes.length ? bytes : null;
}

/** Korean message for an OpenAI error response. The key never appears in it, even if OpenAI echoes it back. */
export function openaiError(status: number, data: unknown, key: string): string {
  const e = (data as { error?: { message?: unknown; code?: unknown } } | null)?.error;
  const raw = typeof e?.message === 'string' ? e.message : '';
  const msg = (key ? raw.split(key).join('***') : raw).replace(/\bsk-[\w*-]+/g, 'sk-***').replace(/\s+/g, ' ').trim().slice(0, 200);
  const head =
    status === 401 ? 'OpenAI API 키가 맞지 않아요. OPENAI_API_KEY 를 확인해 주세요.'
    : status === 403 ? '이 키로는 이 이미지 모델을 쓸 수 없어요. OpenAI 조직 인증이나 OPENAI_IMAGE_MODEL 을 확인해 주세요.'
    : status === 429 ? 'OpenAI 사용 한도에 걸렸어요. 잠시 뒤 다시 시도하거나 결제 한도를 확인해 주세요.'
    : status === 400 && (e?.code === 'moderation_blocked' || /safety|moderation|policy/i.test(raw)) ? '안전 정책에 걸려 이미지를 만들지 못했어요. 프롬프트를 고쳐 다시 시도해 주세요.'
    : status >= 500 ? 'OpenAI 쪽 오류로 이미지를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.'
    : 'OpenAI 가 요청을 거절했어요.';
  return msg ? `${head} (OpenAI: ${msg})` : head;
}

// ---------- copied from plan-doc/lib/images.ts ----------
export const MAX_UPLOAD = 5 * 1024 * 1024;

/** MIME type from magic bytes; only png/jpeg/gif/webp. SVG and everything else → null. */
export function sniffImage(b: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 6 && (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a')) return 'image/gif';
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

// ---------- workflow-view ----------
export const NO_KEY = 'OPENAI_API_KEY 가 없어 만들지 않았어요.';
const TOO_BIG = '만든 이미지가 5MB 를 넘어 저장하지 못했어요. 다시 시도해 주세요.';
// A 5MB image is about 7MB of base64; the rest of the JSON is tiny.
const BODY_CAP = Math.ceil(MAX_UPLOAD / 3) * 4 + 64 * 1024;

/** Generate one image, save it in UPLOAD_DIR and wf_images (the caller has run wf()), and return its own-origin URL.
 * Never throws: a failure is a Korean sentence the chat can show. The key stays out of every message. */
export async function generateImage(prompt: string, cardId: string): Promise<{ url: string } | { error: string }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { error: NO_KEY };
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
        return { error: TOO_BIG };
      }
      chunks.push(value);
    }
    text = Buffer.concat(chunks).toString('utf8');
  } catch (e) {
    if ((e as Error).name === 'TimeoutError') return { error: 'OpenAI 응답이 너무 오래 걸려 멈췄어요. 잠시 뒤 다시 시도해 주세요.' };
    return { error: 'OpenAI 에 연결하지 못했어요. 네트워크나 OPENAI_BASE_URL 을 확인해 주세요.' };
  }
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    // not JSON: handled below as an error or a missing image
  }
  if (status < 200 || status >= 300) return { error: openaiError(status, data, key) };

  const bytes = imageFromResponse(data);
  const mime = bytes && sniffImage(bytes);
  if (!bytes || !mime) return { error: 'OpenAI 응답에 이미지가 없어요. 다시 시도해 주세요.' };
  if (bytes.length > MAX_UPLOAD) return { error: TOO_BIG };

  const id = randomUUID();
  const file = path.join(UPLOAD_DIR, id);
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(file, bytes);
    db().prepare('INSERT INTO wf_images (id, card_id, prompt, mime, created_at) VALUES (?, ?, ?, ?, ?)').run(id, cardId, prompt, mime, new Date().toISOString());
  } catch {
    await fs.rm(file, { force: true }); // no row points at it, so do not leave it behind
    return { error: '만든 이미지를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.' };
  }
  return { url: `${BASE}/api/images/${id}` };
}
