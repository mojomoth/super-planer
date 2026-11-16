import { NextResponse } from 'next/server';
import { createSession } from '@/lib/session';

export const runtime = 'nodejs';

// Native <form method="post"> target, so starting works without client JS. Redirects to /s/<id> (or back with ?error=).
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const prompt = String(form?.get('prompt') ?? '').trim();
  const back = (error: string) => NextResponse.redirect(new URL(`/?error=${error}`, req.url), 303);
  if (prompt.length < 4) return back('short');
  if (prompt.length > 1000) return back('long');
  try {
    const id = await createSession(prompt);
    return NextResponse.redirect(new URL(`/s/${id}`, req.url), 303);
  } catch (e) {
    console.error('[step1] create session failed', e);
    return back('server');
  }
}
