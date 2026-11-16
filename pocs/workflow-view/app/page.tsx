import { redirect } from 'next/navigation';
import { listWorkflows, loadWorkflow, importStep1 } from '@/lib/store';
import Canvas from './Canvas';

export const dynamic = 'force-dynamic';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  let notice: string | null = null;

  if (typeof sp.from === 'string') {
    const m = /^step1:([\w-]{1,100})$/.exec(sp.from);
    if (!m) notice = '가져올 주소가 올바르지 않아요. ?from=step1:세션ID 형식이어야 해요.';
    else {
      const r = importStep1(m[1]);
      if ('id' in r) redirect(`/?workflow=${encodeURIComponent(r.id)}`);
      notice = r.error;
    }
  }

  const workflows = listWorkflows();
  const wanted = typeof sp.workflow === 'string' ? sp.workflow : null;
  let data = wanted ? loadWorkflow(wanted) : null;
  if (wanted && !data) notice ??= '그 워크플로우를 찾지 못했어요. 가장 최근 워크플로우를 보여 드려요.';
  // A failed import promises the example workflow; otherwise show the newest one.
  const fallback = (typeof sp.from === 'string' && notice ? workflows.find((w) => w.source === 'seed') : undefined) ?? workflows[0];
  if (!data && fallback) data = loadWorkflow(fallback.id);

  if (!data) {
    return (
      <div className="wf-empty-page">
        <div className="empty"><p>워크플로우가 없어요. 질문하기에서 답변을 끝내면 여기로 가져올 수 있어요.</p></div>
      </div>
    );
  }
  return <Canvas key={data.workflow.id} {...data} workflows={workflows.map(({ id, title }) => ({ id, title }))} notice={notice} />;
}
