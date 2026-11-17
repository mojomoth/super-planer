// node --test --experimental-strip-types lib/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as planGen from '../../plan-doc/lib/imagegen.ts';
import * as planImages from '../../plan-doc/lib/images.ts';

// db.ts reads SUPER_PLANER_DB when it loads: point it at a throwaway file first.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-imagegen-'));
process.env.SUPER_PLANER_DB = path.join(dir, 'test.db');
const gen = await import('./imagegen.ts');
const { db, UPLOAD_DIR } = await import('./db.ts');
const { ensureSchema } = await import('./schema.ts');
ensureSchema(db());
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const realFetch = globalThis.fetch;
function stubFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return calls;
}
const rows = () => db().prepare('SELECT * FROM wf_images ORDER BY created_at').all() as { id: string; card_id: string; prompt: string; mime: string }[];

test('helpers copied from plan-doc stay identical', () => {
  for (const k of ['IMAGE_PROMPT_MAX', 'DEFAULT_IMAGE_MODEL', 'imageRequestBody', 'imageFromResponse', 'openaiError'] as const) {
    assert.equal(String(gen[k]), String(planGen[k]), k);
  }
  for (const k of ['MAX_UPLOAD', 'sniffImage'] as const) assert.equal(String(gen[k]), String(planImages[k]), k);
});

test('generateImage saves the file and a wf_images row, returns /workflow/api/images/<id>', async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  process.env.OPENAI_API_KEY = 'sk-test-SECRET';
  process.env.OPENAI_BASE_URL = 'http://stub.invalid/v1/';
  const calls = stubFetch(200, { data: [{ b64_json: Buffer.from(PNG).toString('base64') }] });
  const r = await gen.generateImage('등불을 든 고양이', 'card-1');
  assert.ok('url' in r, JSON.stringify(r));
  const id = r.url.match(/^\/workflow\/api\/images\/([0-9a-f-]{36})$/)?.[1];
  assert.ok(id, r.url);
  assert.deepEqual(new Uint8Array(fs.readFileSync(path.join(UPLOAD_DIR, id))), PNG);
  assert.equal(UPLOAD_DIR, path.join(dir, 'uploads'));
  const [row] = rows();
  assert.deepEqual([row.id, row.card_id, row.prompt, row.mime], [id, 'card-1', '등불을 든 고양이', 'image/png']);
  assert.equal(calls[0].url, 'http://stub.invalid/v1/images/generations');
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, 'Bearer sk-test-SECRET');
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), gen.imageRequestBody('등불을 든 고양이', gen.DEFAULT_IMAGE_MODEL));
});

test('generateImage failures: a Korean message, no file, no row, never the key', async (t) => {
  t.after(() => { globalThis.fetch = realFetch; });
  const before = rows().length;
  const files = () => fs.readdirSync(UPLOAD_DIR).length;
  const nFiles = files();
  process.env.OPENAI_API_KEY = 'sk-test-SECRET';

  stubFetch(500, { error: { message: 'boom sk-test-SECRET' } });
  const e500 = await gen.generateImage('x', 'card-1');
  assert.ok('error' in e500 && /^OpenAI 쪽 오류로/.test(e500.error) && !e500.error.includes('SECRET'), JSON.stringify(e500));

  stubFetch(200, { data: [{ b64_json: Buffer.from('<svg/>').toString('base64') }] });
  const notImage = await gen.generateImage('x', 'card-1');
  assert.ok('error' in notImage && /이미지가 없어요/.test(notImage.error));

  globalThis.fetch = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
  const down = await gen.generateImage('x', 'card-1');
  assert.ok('error' in down && /연결하지 못했어요/.test(down.error));

  const calls = stubFetch(200, {});
  delete process.env.OPENAI_API_KEY;
  assert.deepEqual(await gen.generateImage('x', 'card-1'), { error: gen.NO_KEY });
  assert.equal(calls.length, 0);

  assert.equal(rows().length, before);
  assert.equal(files(), nFiles);
});
