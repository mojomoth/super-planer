import { wf, getCard } from '@/lib/store';
import { bad, jsonBody, num } from '@/lib/http';

export const runtime = 'nodejs';

/** Move or expand/collapse a card: { x?, y?, expanded? } */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const card = getCard(id);
  if (!card) return bad('카드를 찾지 못했어요.', 404);
  const b = await jsonBody(req);
  if (!b) return bad('JSON 본문이 필요해요.');
  const x = 'x' in b ? num(b.x) : card.x;
  const y = 'y' in b ? num(b.y) : card.y;
  if (x === null || y === null) return bad('위치 값이 올바르지 않아요.');
  if ('expanded' in b && typeof b.expanded !== 'boolean') return bad('expanded는 true 또는 false여야 해요.');
  const expanded = 'expanded' in b ? (b.expanded as boolean) : card.expanded;
  wf().prepare('UPDATE wf_cards SET x = ?, y = ?, expanded = ? WHERE id = ?').run(x, y, expanded ? 1 : 0, id);
  return Response.json({ card: { ...card, x, y, expanded } });
}
