'use client';
import { createContext, useContext } from 'react';
import type { Node } from '@xyflow/react';
import { BASE } from '@/lib/base';
import type { Card, Message } from '@/lib/store';

export type CardData = { card: Card; messages: Message[] };
export type CardNodeT = Node<CardData, 'card'>;

/** What a card node can ask the canvas to do; the canvas owns state and talks to the API. */
export type Actions = {
  toggle: (id: string) => void;
  setStatus: (id: string, action: 'freeze' | 'undo') => Promise<void>;
  send: (id: string, content: string) => Promise<{ error?: string }>;
};
export const ActionsContext = createContext<Actions | null>(null);

export function useActions(): Actions {
  const a = useContext(ActionsContext);
  if (!a) throw new Error('useActions outside <ActionsContext>');
  return a;
}

/** fetch + JSON with the server's Korean error message surfaced as the Error message. `path` is app-relative (/api/…). */
export async function api<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? `요청이 실패했어요 (${res.status}).`);
  return data as T;
}
