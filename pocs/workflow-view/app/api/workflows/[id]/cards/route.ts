import { getWorkflow, insertCard } from '@/lib/store';
import { bad, jsonBody, num, str } from '@/lib/http';

export const runtime = 'nodejs';

/** Add an active card: { title, description, x, y } */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!getWorkflow(id)) return bad('워크플로우를 찾지 못했어요.', 404);
  const b = await jsonBody(req);
  if (!b) return bad('JSON 본문이 필요해요.');
  const title = str(b.title, 1, 80);
  const description = str(b.description ?? '', 0, 400);
  const x = num(b.x);
  const y = num(b.y);
  if (title === null) return bad('제목은 1~80자로 써 주세요.');
  if (description === null) return bad('설명은 400자까지 쓸 수 있어요.');
  if (x === null || y === null) return bad('위치 값이 올바르지 않아요.');
  const card = insertCard({ workflow_id: id, title, description, status: 'active', decision: null, x, y, expanded: true });
  return Response.json({ card }, { status: 201 });
}
