import { wf, getWorkflow, insertEdge } from '@/lib/store';
import { bad, jsonBody, str } from '@/lib/http';

export const runtime = 'nodejs';

/** Connect two cards of this workflow: { source, target } */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!getWorkflow(id)) return bad('워크플로우를 찾지 못했어요.', 404);
  const b = await jsonBody(req);
  const source = str(b?.source, 1, 64);
  const target = str(b?.target, 1, 64);
  if (!source || !target) return bad('연결할 두 카드가 필요해요.');
  if (source === target) return bad('같은 카드끼리는 연결할 수 없어요.');
  const d = wf();
  const count = d.prepare('SELECT COUNT(*) AS n FROM wf_cards WHERE workflow_id = ? AND id IN (?, ?)').get(id, source, target);
  if (Number(count?.n) !== 2) return bad('이 워크플로우의 카드가 아니에요.', 404);
  const dup = d.prepare('SELECT id FROM wf_edges WHERE workflow_id = ? AND source = ? AND target = ?').get(id, source, target);
  if (dup) return Response.json({ edge: { id: String(dup.id), workflow_id: id, source, target } });
  return Response.json({ edge: insertEdge(id, source, target) }, { status: 201 });
}
