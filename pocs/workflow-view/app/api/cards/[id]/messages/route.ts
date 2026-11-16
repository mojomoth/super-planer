import { getCard, getWorkflow, cardMessages, insertMessage } from '@/lib/store';
import { agentReply } from '@/lib/agent';
import { bad, jsonBody, str } from '@/lib/http';

export const runtime = 'nodejs';

/** Send a user message to the card's agent: { content } → { messages: [user, agent], provider, error? } */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const card = getCard(id);
  if (!card) return bad('카드를 찾지 못했어요.', 404);
  if (card.status !== 'active') return bad('동결되거나 취소된 카드에는 메시지를 보낼 수 없어요.', 409);
  const b = await jsonBody(req);
  const content = str(b?.content, 1, 4000);
  if (!content) return bad('메시지는 1~4000자로 써 주세요.');
  const user = insertMessage(id, 'user', content);
  const r = await agentReply(getWorkflow(card.workflow_id)?.title ?? '', card, cardMessages(id));
  const agent = insertMessage(id, 'agent', r.content);
  return Response.json({ messages: [user, agent], provider: r.provider, error: r.error }, { status: 201 });
}
