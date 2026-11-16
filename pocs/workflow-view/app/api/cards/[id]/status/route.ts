import { wf, getCard, cardMessages } from '@/lib/store';
import { decisionFor } from '@/lib/agent';
import { bad, jsonBody } from '@/lib/http';

export const runtime = 'nodejs';

/**
 * { action: 'freeze' } — 동결: active → frozen, writes the decision.
 * { action: 'undo' }   — 취소 on an active card (→ cancelled), 되돌리기 on a frozen/cancelled card (→ active).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const card = getCard(id);
  if (!card) return bad('카드를 찾지 못했어요.', 404);
  const b = await jsonBody(req);
  const action = b?.action;
  const d = wf();

  if (action === 'freeze') {
    if (card.status !== 'active') return bad('진행중인 카드만 동결할 수 있어요.', 409);
    const r = await decisionFor(card, cardMessages(id));
    // the status check in WHERE keeps a concurrent undo from being overwritten while the model was thinking
    const u = d.prepare("UPDATE wf_cards SET status = 'frozen', decision = ? WHERE id = ? AND status = 'active'").run(r.decision, id);
    if (!u.changes) return bad('카드 상태가 바뀌었어요. 새로고침해 주세요.', 409);
    return Response.json({ card: { ...card, status: 'frozen', decision: r.decision }, provider: r.provider, error: r.error });
  }
  if (action === 'undo') {
    const next = card.status === 'active' ? 'cancelled' : 'active';
    d.prepare('UPDATE wf_cards SET status = ?, decision = NULL WHERE id = ?').run(next, id);
    return Response.json({ card: { ...card, status: next, decision: null } });
  }
  return bad("action은 'freeze' 또는 'undo'여야 해요.");
}
