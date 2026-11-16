import { NextResponse } from 'next/server';
import { store } from '@/lib/schema';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const doc = store().prepare('SELECT * FROM plan_docs WHERE id = ?').get(id);
  return doc ? NextResponse.json({ doc }) : NextResponse.json({ error: '기획서를 찾지 못했어요.' }, { status: 404 });
}

/** Save edited Markdown. The title follows the H1 (`# 가제 기획서`). */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const b = (await req.json().catch(() => null)) as { markdown?: unknown } | null;
  if (typeof b?.markdown !== 'string' || b.markdown.length > 200_000) return NextResponse.json({ error: '마크다운은 200,000자 이내여야 해요.' }, { status: 400 });
  const d = store();
  // Stored without the trailing 기획서; the UI adds it back (`${title} 기획서`).
  const title = (b.markdown.match(/^#\s+(.+)$/m)?.[1] ?? '').replace(/\s*기획서\s*$/, '').trim().slice(0, 200) || '제목 없음';
  const r = d.prepare('UPDATE plan_docs SET markdown = ?, title = ? WHERE id = ?').run(b.markdown, title, id);
  if (!r.changes) return NextResponse.json({ error: '기획서를 찾지 못했어요.' }, { status: 404 });
  return NextResponse.json({ doc: d.prepare('SELECT * FROM plan_docs WHERE id = ?').get(id) });
}
