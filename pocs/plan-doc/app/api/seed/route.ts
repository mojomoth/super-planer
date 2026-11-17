import { NextResponse } from 'next/server';
import { listInputs, seed, store } from '@/lib/schema';

export const runtime = 'nodejs';

// Each empty state restores only its own kind, so the image button never brings back deleted sample decisions.
export function POST(req: Request) {
  const kind = new URL(req.url).searchParams.get('kind');
  if (kind !== 'decision' && kind !== 'image') return NextResponse.json({ error: 'kind는 decision 또는 image여야 해요.' }, { status: 400 });
  store();
  seed(kind);
  return NextResponse.json({ inputs: listInputs() });
}
