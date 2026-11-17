'use client';
import { memo, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useActions, type CardNodeT } from './flow';
import { Icon, type IconName } from './icons';
import Chat from './Chat';

const LABEL = { active: '진행중', frozen: '동결', cancelled: '취소' } as const;
const ICON: Record<keyof typeof LABEL, IconName> = { active: 'clock', frozen: 'lock', cancelled: 'slash' };

function CardNode({ id, data }: NodeProps<CardNodeT>) {
  const { card, messages } = data;
  const { toggle, setStatus } = useActions();
  const [busy, setBusy] = useState<null | 'freeze' | 'undo'>(null);
  const titleId = `card-${id}-title`;
  const bodyId = `card-${id}-body`;
  const undoRef = useRef<HTMLButtonElement>(null);

  // aria-disabled, not disabled: a disabled button drops keyboard focus to <body> mid-request
  async function run(action: 'freeze' | 'undo', from: HTMLElement) {
    if (busy) return;
    setBusy(action);
    await setStatus(id, action);
    setBusy(null);
    // 동결 disappears once frozen: hand focus to the button every state has, unless the user has moved on
    if (document.activeElement === from || document.activeElement === document.body) undoRef.current?.focus();
  }

  return (
    <article className="panel node" data-status={card.status} data-expanded={card.expanded} aria-labelledby={titleId}>
      <Handle type="target" position={Position.Left} />
      <header className="node__head">
        <div className="node__bar">
          <span className={`status status--${card.status}`}><Icon name={ICON[card.status]} />{LABEL[card.status]}</span>
          <div className="node__actions nodrag nopan">
            {card.status === 'active' && (
              <button type="button" className="btn btn--sm" onClick={(e) => run('freeze', e.currentTarget)} aria-disabled={!!busy || undefined} aria-busy={busy === 'freeze'}>
                <Icon name="lock" />동결
              </button>
            )}
            <button ref={undoRef} type="button" className="btn btn--ghost btn--sm" onClick={(e) => run('undo', e.currentTarget)} aria-disabled={!!busy || undefined} aria-busy={busy === 'undo'}>
              {card.status === 'active' ? <><Icon name="slash" />취소</> : <><Icon name="undo" />되돌리기</>}
            </button>
            <button
              type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => toggle(id)}
              aria-label={card.expanded ? '카드 접기' : '카드 펼쳐서 대화 보기'} aria-expanded={card.expanded} aria-controls={card.expanded ? bodyId : undefined}
            >
              <Icon name={card.expanded ? 'collapse' : 'expand'} />
            </button>
          </div>
        </div>
        <h3 className="node__title" id={titleId}>{card.title}</h3>
        {card.description && <p className="node__desc">{card.description}</p>}
        {!card.expanded && card.status === 'frozen' && card.decision && <p className="node__decision">{card.decision}</p>}
        {!card.expanded && <p className="meta num">대화 {messages.length}개</p>}
      </header>
      {card.expanded && (
        <div className="node__body nodrag nopan" id={bodyId}>
          <Chat card={card} messages={messages} />
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </article>
  );
}

export default memo(CardNode);
