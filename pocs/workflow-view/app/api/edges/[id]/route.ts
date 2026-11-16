import { wf } from '@/lib/store';
import { bad } from '@/lib/http';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = wf().prepare('DELETE FROM wf_edges WHERE id = ?').run(id);
  if (!r.changes) return bad('연결을 찾지 못했어요.', 404);
  return new Response(null, { status: 204 });
}
