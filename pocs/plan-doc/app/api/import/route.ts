import { NextResponse } from 'next/server';
import { importStep1, importWorkflow, listStep1 } from '@/lib/imports';
import { listInputs } from '@/lib/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ step1: listStep1() });
}

/** Body: { workflow: id } or { step1: session_id }. Returns the imported input ids and the full input list. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { workflow?: unknown; step1?: unknown } | null;
  const ok = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200;
  const r = ok(b?.workflow) ? importWorkflow(b.workflow) : ok(b?.step1) ? importStep1(b.step1) : null;
  if (!r) return NextResponse.json({ error: 'workflow 또는 step1 id가 필요해요.' }, { status: 400 });
  return NextResponse.json({ ...r, inputs: listInputs() }, { status: r.ids.length ? 200 : 404 });
}
