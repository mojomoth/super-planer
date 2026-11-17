import { createSession } from '@/lib/session';

export const runtime = 'nodejs';

// Relative Location: req.url carries Next's internal 127.0.0.1 port, not the address the browser used (behind serve.mjs).
const seeOther = (location: string) => new Response(null, { status: 303, headers: { Location: location } });

// Native <form method="post"> target, so starting works without client JS. Redirects to /s/<id> (or back with ?error=).
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const prompt = String(form?.get('prompt') ?? '').trim();
  const back = (error: string) => seeOther(`/?error=${error}`);
  if (prompt.length < 4) return back('short');
  if (prompt.length > 1000) return back('long');
  try {
    const id = await createSession(prompt);
    return seeOther(`/s/${id}`);
  } catch (e) {
    console.error('[step1] create session failed', e);
    return back('server');
  }
}
