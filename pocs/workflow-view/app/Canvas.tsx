'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls, MiniMap,
  useNodesState, useEdgesState, useReactFlow, addEdge, MarkerType, BaseEdge, getBezierPath,
  type Edge as FlowEdge, type EdgeProps, type NodeChange, type Connection, type OnBeforeDelete,
} from '@xyflow/react';
import { BASE } from '@/lib/base';
import type { Card, Edge, Message, Workflow } from '@/lib/store';
import { ActionsContext, api, type Actions, type CardData, type CardNodeT } from './flow';
import CardNode from './CardNode';
import { Icon } from './icons';

type Props = {
  workflow: Workflow;
  cards: Card[];
  edges: Edge[];
  messages: Message[];
  workflows: { id: string; title: string }[];
  notice: string | null;
};

const nodeTypes = { card: CardNode };
// replaces React Flow's default bezier edge for every connector
const edgeTypes = { default: DrawnEdge };
const PLAN_DOC = '/plan';

const ARIA = {
  'node.a11yDescription.default': '엔터나 스페이스로 카드를 선택하고, 방향키로 옮겨요.',
  'node.a11yDescription.keyboardDisabled': '엔터나 스페이스로 카드를 선택해요.',
  'node.a11yDescription.ariaLiveMessage': ({ x, y }: { direction: string; x: number; y: number }) => `카드를 옮겼어요. 위치 ${x}, ${y}`,
  'edge.a11yDescription.default': '엔터나 스페이스로 연결을 선택하고 Delete 키로 지워요.',
  'controls.ariaLabel': '캔버스 조작',
  'controls.zoomIn.ariaLabel': '확대',
  'controls.zoomOut.ariaLabel': '축소',
  'controls.fitView.ariaLabel': '전체 보기',
  'controls.interactive.ariaLabel': '편집 잠금',
  'minimap.ariaLabel': '미니맵',
  'handle.ariaLabel': '연결 지점',
};

const toNode = (card: Card, messages: Message[]): CardNodeT => ({
  id: card.id, type: 'card', position: { x: card.x, y: card.y }, data: { card, messages }, zIndex: card.expanded ? 10 : 0,
});

export default function Canvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}

function Flow({ workflow, cards, edges: initialEdges, messages, workflows, notice }: Props) {
  const router = useRouter();
  const rf = useReactFlow<CardNodeT>();
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<CardNodeT>(
    cards.map((c) => toNode(c, messages.filter((m) => m.card_id === c.id))),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(initialEdges.map(({ id, source, target }) => ({ id, source, target })));
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, { x: number; y: number }>());
  const fail = useCallback((e: unknown) => setError((e as Error).message), []);

  const patchCard = useCallback(
    (id: string, fn: (d: CardData) => CardData) =>
      setNodes((ns) => ns.map((n) => {
        if (n.id !== id) return n;
        const data = fn(n.data);
        return { ...n, data, zIndex: data.card.expanded ? 10 : 0 };
      })),
    [setNodes],
  );

  const actions = useMemo<Actions>(() => ({
    toggle(id) {
      const cur = rf.getNode(id);
      if (!cur) return;
      const expanded = !cur.data.card.expanded;
      patchCard(id, (d) => ({ ...d, card: { ...d.card, expanded } }));
      api(`/api/cards/${id}`, 'PATCH', { expanded }).catch((e) => {
        patchCard(id, (d) => ({ ...d, card: { ...d.card, expanded: !expanded } }));
        fail(e);
      });
    },
    async setStatus(id, action) {
      try {
        const { card, error } = await api<{ card: Card; error?: string }>(`/api/cards/${id}/status`, 'POST', { action });
        patchCard(id, (d) => ({ ...d, card: { ...card, expanded: d.card.expanded, x: d.card.x, y: d.card.y } }));
        if (error) setError(`LLM 응답을 받지 못해 “${card.title}” 결정은 기본 요약으로 적었어요.`);
      } catch (e) {
        fail(e);
      }
    },
    async send(id, content) {
      const r = await api<{ messages: Message[]; error?: string }>(`/api/cards/${id}/messages`, 'POST', { content });
      patchCard(id, (d) => ({ ...d, messages: [...d.messages, ...r.messages] }));
      return { error: r.error };
    },
  }), [rf, patchCard, fail]);

  // Persist the final position of a drag or keyboard nudge (dragging === false), coalescing quick nudges.
  const onNodesChange = useCallback((changes: NodeChange<CardNodeT>[]) => {
    onNodesChangeBase(changes.filter((c) => c.type !== 'remove'));
    for (const c of changes) {
      if (c.type !== 'position' || c.dragging !== false || !c.position) continue;
      const { id } = c;
      const x = Math.round(c.position.x);
      const y = Math.round(c.position.y);
      pending.current.set(id, { x, y });
      clearTimeout(timers.current.get(id));
      timers.current.set(id, setTimeout(() => {
        timers.current.delete(id);
        pending.current.delete(id);
        patchCard(id, (d) => ({ ...d, card: { ...d.card, x, y } }));
        api(`/api/cards/${id}`, 'PATCH', { x, y }).catch(fail);
      }, 250));
    }
  }, [onNodesChangeBase, patchCard, fail]);

  // A workflow switch or tab close inside the 250ms window would drop the last move: send it now, surviving the unload.
  useEffect(() => {
    const flush = () => {
      for (const [id, pos] of pending.current) {
        clearTimeout(timers.current.get(id));
        fetch(`${BASE}/api/cards/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(pos), keepalive: true }).catch(() => {});
      }
      pending.current.clear();
      timers.current.clear();
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  const onConnect = useCallback(async (c: Connection) => {
    try {
      const { edge } = await api<{ edge: Edge }>(`/api/workflows/${workflow.id}/edges`, 'POST', { source: c.source, target: c.target });
      setEdges((es) => addEdge({ id: edge.id, source: edge.source, target: edge.target }, es));
    } catch (e) {
      fail(e);
    }
  }, [workflow.id, setEdges, fail]);

  // Cards are never deleted from the canvas; only connectors are.
  const onBeforeDelete: OnBeforeDelete<CardNodeT, FlowEdge> = useCallback(async ({ edges: es }) => ({ nodes: [], edges: es }), []);
  const onEdgesDelete = useCallback((deleted: FlowEdge[]) => {
    for (const e of deleted) {
      api(`/api/edges/${e.id}`, 'DELETE').catch((err) => {
        fail(err);
        setEdges((es) => (es.some((x) => x.id === e.id) ? es : [...es, { id: e.id, source: e.source, target: e.target }]));
      });
    }
  }, [fail, setEdges]);

  const byId = new Map(nodes.map((n) => [n.id, n.data.card]));
  const shownEdges = edges.map((e) => {
    const status = byId.get(e.target)?.status ?? 'active';
    return {
      ...e,
      className: `edge--${status}`,
      // the arrowhead takes the line's colour; xyflow writes it as an inline style, so a CSS variable works
      markerEnd: { type: MarkerType.ArrowClosed, color: status === 'active' ? 'var(--color-edge-active)' : 'var(--color-edge)' },
      // '까지' reads right after any title (no 로/으로 choice to get wrong)
      ariaLabel: `${byId.get(e.source)?.title}에서 ${byId.get(e.target)?.title}까지 연결`,
    };
  });
  const frozen = nodes.filter((n) => n.data.card.status === 'frozen').length;
  const selectedEdges = edges.filter((e) => e.selected);

  async function addCard(title: string, description: string) {
    const rect = canvasRef.current?.getBoundingClientRect();
    const center = rect ? rf.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) : { x: 0, y: 0 };
    const offset = nodes.length % 5 * 24; // stack repeated adds visibly instead of exactly on top of each other
    const { card } = await api<{ card: Card }>(`/api/workflows/${workflow.id}/cards`, 'POST', {
      title, description, x: Math.round(center.x - 220 + offset), y: Math.round(center.y - 160 + offset),
    });
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { ...toNode(card, []), selected: true }]);
  }

  return (
    <ActionsContext.Provider value={actions}>
      <div className="wf">
        <div className="wf-toolbar">
          <div className="wf-toolbar__title">
            {/* the select already shows the title; the h1 stays for heading navigation */}
            <h1 className="visually-hidden">{workflow.title}</h1>
            <label className="visually-hidden" htmlFor="wf-select">워크플로우 선택</label>
            <select
              id="wf-select" className="select wf-select" value={workflow.id}
              onChange={(e) => router.push(`/?workflow=${encodeURIComponent(e.target.value)}`)}
            >
              {workflows.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
            </select>
          </div>
          <p className="meta num">카드 {nodes.length}개, 동결 {frozen}개</p>
          <div className="btn-row wf-toolbar__actions">
            {selectedEdges.length > 0 && (
              <button type="button" className="btn btn--ghost btn--danger btn--sm" onClick={() => rf.deleteElements({ edges: selectedEdges })}>
                연결 삭제
              </button>
            )}
            <button type="button" className="btn" id="add-card-btn" aria-expanded={adding} aria-controls={adding ? 'add-card' : undefined} onClick={() => setAdding((v) => !v)}>
              카드 추가
            </button>
            {frozen > 0 ? (
              <a className="btn btn--primary" href={`${PLAN_DOC}?workflow=${encodeURIComponent(workflow.id)}`}>기획서 만들기</a>
            ) : (
              <button type="button" className="btn btn--primary" disabled aria-describedby="plan-hint">기획서 만들기</button>
            )}
          </div>
          {frozen === 0 && <p className="meta wf-toolbar__hint" id="plan-hint">카드를 하나 이상 동결하면 기획서를 만들 수 있어요.</p>}
        </div>

        {(notice || error) && (
          <div className="wf-notices">
            {notice && <div className="notice" role="status"><Icon name="alert" /><p>{notice}</p></div>}
            {error && (
              <div className="notice notice--error" role="alert">
                <Icon name="alert" /><p>{error}</p>
                <button type="button" className="btn btn--ghost btn--sm wf-notice__close" onClick={() => setError(null)}>닫기</button>
              </div>
            )}
          </div>
        )}

        <div className="wf-canvas" ref={canvasRef}>
          <ReactFlow
            nodes={nodes}
            edges={shownEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onBeforeDelete={onBeforeDelete}
            onEdgesDelete={onEdgesDelete}
            isValidConnection={(c) => c.source !== c.target}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
            fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
            minZoom={0.2}
            maxZoom={1.6}
            ariaLabelConfig={ARIA}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeClassName={(n) => `mm--${(n as CardNodeT).data.card.status}`} />
          </ReactFlow>
          {nodes.length === 0 && !adding && (
            <div className="wf-overlay">
              <div className="empty"><p>아직 카드가 없어요.</p><button type="button" className="btn" onClick={() => setAdding(true)}>카드 추가</button></div>
            </div>
          )}
          {adding && <AddCardForm onAdd={addCard} onClose={() => setAdding(false)} />}
        </div>
      </div>
    </ActionsContext.Provider>
  );
}

// Draws in once, on mount: a mask stroke grows along the path and reveals the line and its arrowhead together,
// leaving the line's own colour and dash untouched; the mask goes away when the draw ends.
// The mask region is spelled out because the default one is relative to the edge's own 300x150 <svg> and would clip it.
function DrawnEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd }: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const [drawn, setDrawn] = useState(false);
  const mask = `draw-${id}`;
  return (
    <>
      {!drawn && (
        <mask id={mask} maskUnits="userSpaceOnUse" x="-100000" y="-100000" width="200000" height="200000">
          <path className="edge-draw" d={path} pathLength={1} onAnimationEnd={() => setDrawn(true)} />
        </mask>
      )}
      <BaseEdge path={path} markerEnd={markerEnd} mask={drawn ? undefined : `url(#${mask})`} />
    </>
  );
}

function AddCardForm({ onAdd, onClose }: { onAdd: (title: string, description: string) => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    return () => document.getElementById('add-card-btn')?.focus();
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get('title') ?? '').trim();
    if (!title) {
      setErr('제목을 써 주세요.');
      titleRef.current?.focus();
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onAdd(title, String(f.get('description') ?? '').trim());
      onClose();
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  }

  return (
    <form id="add-card" className="panel wf-add" aria-labelledby="add-card-h" onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && onClose()} noValidate>
      <header className="panel__head"><h2 className="panel__title" id="add-card-h">카드 추가</h2></header>
      <div className="panel__body wf-add__body">
        <div className="field">
          <label className="field__label" htmlFor="new-title">제목</label>
          <input
            ref={titleRef} className="input" id="new-title" name="title" maxLength={80} placeholder="예: 보스 디자인"
            aria-invalid={err ? true : undefined} aria-describedby={err ? 'new-title-err' : undefined}
          />
          {err && <p className="field__error" id="new-title-err">{err}</p>}
        </div>
        <div className="field">
          <label className="field__label" htmlFor="new-desc">설명</label>
          <textarea className="textarea" id="new-desc" name="description" rows={2} maxLength={400} placeholder="예: 지하 정원 끝에서 만나는 상대 정하기" />
        </div>
      </div>
      <footer className="panel__foot">
        <button type="submit" className="btn" disabled={busy} aria-busy={busy}>추가</button>
        <button type="button" className="btn btn--ghost" onClick={onClose}>닫기</button>
      </footer>
    </form>
  );
}
