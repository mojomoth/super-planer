import { NextResponse } from 'next/server';
import { act, getState, InputError } from '@/lib/session';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const state = getState((await params).id);
  return state ? NextResponse.json(state) : NextResponse.json({ error: '세션을 찾을 수 없어요.' }, { status: 404 });
}

// body: {action: 'answer', turnId, choices: string[], text, wrap?: true} | {action: 'wrap' | 'more' | 'back' | 'finish'}
export async function POST(req: Request, { params }: Ctx) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '요청 형식이 잘못됐어요.' }, { status: 400 });
  try {
    const state = await act((await params).id, body as Record<string, unknown>);
    return state ? NextResponse.json(state) : NextResponse.json({ error: '세션을 찾을 수 없어요.' }, { status: 404 });
  } catch (e) {
    if (e instanceof InputError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('[step1] action failed', e);
    return NextResponse.json({ error: '처리하지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
