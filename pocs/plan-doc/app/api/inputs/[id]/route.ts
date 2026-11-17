import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { BASE } from '@/lib/base';
import { store, UPLOAD_DIR, type InputRow } from '@/lib/schema';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const d = store();
  const row = d.prepare('SELECT * FROM plan_inputs WHERE id = ?').get(id) as InputRow | undefined;
  if (!row) return bad('항목을 찾지 못했어요.', 404);
  const b = (await req.json().catch(() => null)) as { title?: unknown; body?: unknown } | null;
  const title = typeof b?.title === 'string' ? b.title.trim() : '';
  if (!title || title.length > 200) return bad('제목을 200자 이내로 적어 주세요.');
  if (row.kind === 'decision') {
    if (typeof b?.body !== 'string' || b.body.length > 20000) return bad('본문은 20,000자 이내로 적어 주세요.');
    d.prepare('UPDATE plan_inputs SET title = ?, body = ? WHERE id = ?').run(title, b.body, id);
  } else d.prepare('UPDATE plan_inputs SET title = ? WHERE id = ?').run(title, id);
  return NextResponse.json({ input: d.prepare('SELECT * FROM plan_inputs WHERE id = ?').get(id) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const d = store();
  const row = d.prepare('SELECT * FROM plan_inputs WHERE id = ?').get(id) as InputRow | undefined;
  if (!row) return bad('항목을 찾지 못했어요.', 404);
  d.prepare('DELETE FROM plan_inputs WHERE id = ?').run(id);
  // Uploaded and OpenAI-made files are named by their uuid row id; the regex keeps the path inside UPLOAD_DIR.
  // A file still embedded in a saved plan doc stays on disk so that doc keeps its image.
  const used = !!d.prepare("SELECT 1 FROM plan_docs WHERE instr(markdown, ?) > 0 LIMIT 1").get(`${BASE}/api/images/${id}`);
  if ((row.source === 'upload' || row.source === 'openai') && /^[0-9a-f-]{36}$/.test(id) && !used) await fs.rm(path.join(UPLOAD_DIR, id), { force: true });
  return NextResponse.json({ ok: true, keptFile: used });
}
