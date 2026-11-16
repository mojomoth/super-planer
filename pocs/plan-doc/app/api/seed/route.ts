import { NextResponse } from 'next/server';
import { listInputs, seed, store } from '@/lib/schema';

export const runtime = 'nodejs';

export function POST() {
  store();
  seed();
  return NextResponse.json({ inputs: listInputs() });
}
