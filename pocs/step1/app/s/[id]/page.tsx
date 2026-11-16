import { notFound } from 'next/navigation';
import { getState } from '@/lib/session';
import Interview from './Interview';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const state = getState((await params).id);
  if (!state) notFound();
  return <Interview initial={state} />;
}
