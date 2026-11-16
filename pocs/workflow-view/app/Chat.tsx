'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import type { Card, Message } from '@/lib/store';
import { extractUrls } from '@/lib/urls';
import { parseBlocks, parseInline } from '@/lib/md';
import { useActions } from './flow';
import { Icon } from './icons';
import Gallery from './Gallery';

const time = (iso: string) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

function Inline({ line }: { line: string }) {
  return parseInline(line).map((t, i) =>
    t.t === 'text' ? <Fragment key={i}>{t.v}</Fragment>
    : t.t === 'bold' ? <strong key={i}>{t.v}</strong>
    : t.t === 'link' ? <a key={i} href={t.href} target="_blank" rel="noopener noreferrer">{t.v}</a>
    : <a key={i} className="url" href={t.href} target="_blank" rel="noopener noreferrer">{t.href}</a>,
  );
}

function Rich({ text }: { text: string }) {
  return parseBlocks(text).map((b, i) =>
    b.t === 'p' ? (
      <p key={i}>{b.lines.map((l, k) => <Fragment key={k}>{k > 0 && <br />}<Inline line={l} /></Fragment>)}</p>
    ) : b.t === 'ul' ? (
      <ul key={i}>{b.items.map((it, k) => <li key={k}><Inline line={it} /></li>)}</ul>
    ) : (
      <ol key={i}>{b.items.map((it, k) => <li key={k}><Inline line={it} /></li>)}</ol>
    ),
  );
}

function Msg({ m, agentName }: { m: Message; agentName: string }) {
  const stamp = <time className="msg__time num" dateTime={m.created_at} suppressHydrationWarning>{time(m.created_at)}</time>;
  if (m.role === 'user') {
    return (
      <li className="msg msg--user">
        <p className="msg__who"><span className="visually-hidden">나</span>{stamp}</p>
        <div className="msg__body"><Rich text={m.content} /></div>
      </li>
    );
  }
  const urls = extractUrls(m.content);
  return (
    <li className="msg msg--agent">
      <p className="msg__who"><Icon name="agent" />{agentName}{stamp}</p>
      <div className="msg__body"><Rich text={m.content} /></div>
      {urls.length > 0 && <Gallery urls={urls} />}
    </li>
  );
}

export default function Chat({ card, messages }: { card: Card; messages: Message[] }) {
  const { send } = useActions();
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const inputId = `msg-${card.id}`;
  const agentName = `${card.title} 에이전트`;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending]);

  async function submit() {
    const content = text.trim();
    if (!content || pending) return;
    setPending(true);
    setErr(null);
    try {
      const r = await send(card.id, content);
      setText('');
      setNote(r.error ? 'LLM 응답을 받지 못해 기본 답변을 보여 드려요.' : null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {card.status === 'frozen' && (
        <div className="notice node__verdict">
          <Icon name="lock" />
          <div><p className="node__verdict-label">결정</p><p>{card.decision ?? '결정 내용이 없어요.'}</p></div>
        </div>
      )}
      <ol className="chat node__chat nowheel" ref={listRef} aria-label={`${card.title} 대화`} aria-busy={pending}>
        {messages.length === 0 && <li className="meta">아직 대화가 없어요. 이 카드에서 정할 것을 물어보세요.</li>}
        {messages.map((m) => <Msg key={m.id} m={m} agentName={agentName} />)}
        {pending && (
          <li className="msg msg--agent">
            <p className="msg__who"><Icon name="agent" />{agentName}<span className="visually-hidden">답변을 쓰는 중</span></p>
            <span className="skeleton node__skel" /><span className="skeleton node__skel" />
          </li>
        )}
      </ol>
      {card.status === 'active' ? (
        <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <label className="visually-hidden" htmlFor={inputId}>메시지</label>
          <textarea
            className="textarea" id={inputId} name="message" rows={1} maxLength={4000} value={text} disabled={pending}
            placeholder="예: 비밀방 아이디어를 더 주세요" onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button type="submit" className="btn" disabled={pending || !text.trim()} aria-busy={pending}>보내기</button>
        </form>
      ) : (
        <p className="meta">
          {card.status === 'frozen' ? '동결된 카드는 읽기만 할 수 있어요. 고치려면 되돌리기를 눌러요.' : '취소된 카드예요. 되돌리기를 누르면 다시 대화할 수 있어요.'}
        </p>
      )}
      {err && <div className="notice notice--error" role="alert"><Icon name="alert" /><p>{err}</p></div>}
      {note && <p className="meta" role="status">{note}</p>}
    </>
  );
}
