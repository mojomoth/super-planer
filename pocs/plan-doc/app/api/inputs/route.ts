import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { isHttpsUrl, MAX_UPLOAD, sniffImage } from '@/lib/images';
import { listInputs, now, store, UPLOAD_DIR } from '@/lib/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);

export function GET() {
  return NextResponse.json({ inputs: listInputs() });
}

export async function POST(req: Request) {
  const d = store();
  const insert = d.prepare('INSERT INTO plan_inputs (id, kind, title, body, url, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');

  if ((req.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
    // Require Content-Length so formData() never buffers an unbounded chunked body before the size check.
    const len = Number(req.headers.get('content-length'));
    if (!Number.isFinite(len) || len <= 0) return bad('업로드 크기를 알 수 없어요. 다시 올려 주세요.', 411);
    if (len > MAX_UPLOAD + 64 * 1024) return bad('이미지는 5MB 이하만 올릴 수 있어요.', 413);
    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File) || file.size === 0) return bad('이미지 파일을 골라 주세요.');
    if (file.size > MAX_UPLOAD) return bad('이미지는 5MB 이하만 올릴 수 있어요.', 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!sniffImage(bytes)) return bad('PNG, JPG, WEBP, GIF 이미지만 올릴 수 있어요.', 415);
    const caption = str(form?.get('title'), 200) ?? (file.name.replace(/\.[^.]+$/, '').slice(0, 200) || '업로드한 이미지');
    const id = randomUUID();
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, id), bytes);
    insert.run(id, 'image', caption, null, `/api/images/${id}`, 'upload', now());
    return NextResponse.json({ input: d.prepare('SELECT * FROM plan_inputs WHERE id = ?').get(id) }, { status: 201 });
  }

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad('요청 형식이 올바르지 않아요.');
  const title = str(b.title, 200);
  if (!title) return bad('제목을 200자 이내로 적어 주세요.');
  const id = randomUUID();
  if (b.kind === 'decision') {
    const body = typeof b.body === 'string' && b.body.length <= 20000 ? b.body : null;
    if (body === null) return bad('본문은 20,000자 이내로 적어 주세요.');
    insert.run(id, 'decision', title, body, null, 'manual', now());
  } else if (b.kind === 'image') {
    const url = str(b.url, 2000);
    if (!url || !isHttpsUrl(url)) return bad('https:// 로 시작하는 이미지 주소를 넣어 주세요.');
    insert.run(id, 'image', title, null, url, 'manual', now());
  } else return bad('kind는 decision 또는 image여야 해요.');
  return NextResponse.json({ input: d.prepare('SELECT * FROM plan_inputs WHERE id = ?').get(id) }, { status: 201 });
}
