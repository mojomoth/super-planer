import { listStep1 } from '@/lib/imports';
import { listDocs, listInputs, store, type DocRow } from '@/lib/schema';
import PlanDoc from './PlanDoc';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const wf = typeof sp.workflow === 'string' && sp.workflow.length <= 200 ? sp.workflow : null;
  // The import itself runs as a client POST (/api/import), so a plain GET never writes to the DB.
  const docs = listDocs();
  const latest = docs[0] ? (store().prepare('SELECT * FROM plan_docs WHERE id = ?').get(docs[0].id) as DocRow) : null;
  // node:sqlite rows have a null prototype; structuredClone makes them plain objects a Client Component accepts.
  const props = structuredClone({ initialInputs: listInputs(), initialDocs: docs, initialDoc: latest ?? null, step1: listStep1(), workflowId: wf });
  return <PlanDoc {...props} />;
}
