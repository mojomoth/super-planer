import { randomUUID } from 'node:crypto';
import { db, tableExists } from './db';
import { ensureSchema } from './schema';
import { SEED } from './seed';

export type Status = 'active' | 'frozen' | 'cancelled';
export type Workflow = { id: string; title: string; source: string | null; created_at: string };
export type Card = {
  id: string; workflow_id: string; title: string; description: string; status: Status;
  decision: string | null; x: number; y: number; expanded: boolean; created_at: string;
};
export type Edge = { id: string; workflow_id: string; source: string; target: string };
export type Message = { id: string; card_id: string; role: 'user' | 'agent'; content: string; created_at: string };

const g = globalThis as unknown as { __wfReady?: boolean };

/** The shared DB with workflow-view's tables created and the sample workflow seeded. */
export function wf() {
  const d = db();
  if (!g.__wfReady) {
    ensureSchema(d);
    if (!d.prepare('SELECT 1 FROM wf_workflows LIMIT 1').get()) seed();
    g.__wfReady = true;
  }
  return d;
}

/** BEGIN/COMMIT around fn; node:sqlite has no transaction helper. */
function tx<T>(fn: () => T): T {
  const d = db();
  d.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    d.exec('COMMIT');
    return r;
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}

const now = () => new Date().toISOString();

// node:sqlite rows have a null prototype and INTEGER flags; normalise once here.
const toCard = (r: Record<string, unknown>): Card => ({
  id: String(r.id), workflow_id: String(r.workflow_id), title: String(r.title), description: String(r.description),
  status: r.status as Status, decision: (r.decision as string | null) ?? null, x: Number(r.x), y: Number(r.y),
  expanded: !!r.expanded, created_at: String(r.created_at),
});
const plain = <T,>(r: unknown) => ({ ...(r as object) }) as T;

export function insertWorkflow(title: string, source: string | null): string {
  const id = randomUUID();
  db().prepare('INSERT INTO wf_workflows (id, title, source, created_at) VALUES (?, ?, ?, ?)').run(id, title, source, now());
  return id;
}

export function insertCard(c: Omit<Card, 'id' | 'created_at' | 'expanded'> & { expanded?: boolean }, at = now()): Card {
  const id = randomUUID();
  db().prepare(
    'INSERT INTO wf_cards (id, workflow_id, title, description, status, decision, x, y, expanded, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(id, c.workflow_id, c.title, c.description, c.status, c.decision, c.x, c.y, c.expanded ? 1 : 0, at);
  return { ...c, id, expanded: !!c.expanded, created_at: at };
}

export function insertEdge(workflowId: string, source: string, target: string): Edge {
  const id = randomUUID();
  db().prepare('INSERT INTO wf_edges (id, workflow_id, source, target) VALUES (?, ?, ?, ?)').run(id, workflowId, source, target);
  return { id, workflow_id: workflowId, source, target };
}

export function insertMessage(cardId: string, role: Message['role'], content: string, at = now()): Message {
  const id = randomUUID();
  db().prepare('INSERT INTO wf_messages (id, card_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)').run(id, cardId, role, content, at);
  return { id, card_id: cardId, role, content, created_at: at };
}

export function getCard(id: string): Card | null {
  const r = wf().prepare('SELECT * FROM wf_cards WHERE id = ?').get(id);
  return r ? toCard(r) : null;
}

export function cardMessages(cardId: string): Message[] {
  return wf().prepare('SELECT * FROM wf_messages WHERE card_id = ? ORDER BY created_at, rowid').all(cardId).map((r) => plain<Message>(r));
}

export function getWorkflow(id: string): Workflow | null {
  const r = wf().prepare('SELECT * FROM wf_workflows WHERE id = ?').get(id);
  return r ? plain<Workflow>(r) : null;
}

export function listWorkflows(): Workflow[] {
  return wf().prepare('SELECT * FROM wf_workflows ORDER BY created_at DESC').all().map((r) => plain<Workflow>(r));
}

export function loadWorkflow(id: string) {
  const workflow = getWorkflow(id);
  if (!workflow) return null;
  const d = wf();
  const cards = d.prepare('SELECT * FROM wf_cards WHERE workflow_id = ? ORDER BY created_at, rowid').all(id).map(toCard);
  const edges = d.prepare('SELECT * FROM wf_edges WHERE workflow_id = ?').all(id).map((r) => plain<Edge>(r));
  const messages = d
    .prepare('SELECT m.* FROM wf_messages m JOIN wf_cards c ON c.id = m.card_id WHERE c.workflow_id = ? ORDER BY m.created_at, m.rowid')
    .all(id)
    .map((r) => plain<Message>(r));
  return { workflow, cards, edges, messages };
}

function seed() {
  tx(() => {
    const wid = insertWorkflow(SEED.title, 'seed');
    const ids: Record<string, string> = {};
    const t0 = Date.now() - 60 * 60 * 1000;
    SEED.cards.forEach((c, i) => {
      const at = (k: number) => new Date(t0 + i * 6 * 60 * 1000 + k * 60 * 1000).toISOString();
      const card = insertCard({ workflow_id: wid, title: c.title, description: c.description, status: c.status, decision: c.decision ?? null, x: c.x, y: c.y }, at(0));
      ids[c.key] = card.id;
      c.messages.forEach(([role, content], k) => insertMessage(card.id, role, content, at(k)));
    });
    for (const [a, b] of SEED.edges) insertEdge(wid, ids[a], ids[b]);
  });
}

// ---------- step1 import ----------

const TRACKS: Record<string, string> = {
  // step1's own track keys (step1/lib/interview.ts TRACKS)
  fun: '핵심 재미', role: '플레이어 역할', loop: '코어 루프', win: '이기고 지는 조건', platform: '플랫폼과 한 판 길이',
  mood: '분위기와 그림체', audience: '누가 할 게임인지', unique: '다른 게임과 다른 점',
  // older or LLM-invented keys
  genre: '장르', core_loop: '코어 루프', goal: '목표', player: '플레이어',
  setting: '배경', world: '세계관', character: '캐릭터', characters: '캐릭터', art: '아트', art_style: '아트',
  tone: '분위기', controls: '조작', progression: '성장', difficulty: '난이도', session: '플레이 시간',
  monetization: '수익 모델', scope: '범위', story: '이야기', twist: '차별점', differentiation: '차별점',
};

const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function answerText(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return '';
  try {
    const a = JSON.parse(raw) as { choices?: unknown; text?: unknown };
    const parts = [...(Array.isArray(a.choices) ? a.choices.map(String) : []), typeof a.text === 'string' ? a.text.trim() : ''];
    return parts.filter(Boolean).join(', ');
  } catch {
    return raw;
  }
}

/** Create (once per session) a workflow from step1's tables. */
export function importStep1(sessionId: string): { id: string } | { error: string } {
  const source = `step1:${sessionId}`;
  const d = wf();
  const existing = d.prepare('SELECT id FROM wf_workflows WHERE source = ?').get(source);
  if (existing) return { id: String(existing.id) };
  if (!tableExists('step1_sessions') || !tableExists('step1_turns')) {
    return { error: '질문하기 기록이 아직 없어요. 질문하기에서 먼저 답변을 끝내 주세요.' };
  }
  const session = d.prepare('SELECT * FROM step1_sessions WHERE id = ?').get(sessionId);
  if (!session) return { error: '그 질문하기 기록을 찾지 못했어요. 예시 워크플로우를 보여 드려요.' };
  const turns = d.prepare('SELECT * FROM step1_turns WHERE session_id = ? AND answer IS NOT NULL ORDER BY idx').all(sessionId);
  // Import only finished sessions: the workflow is created once per source, so a partial import would stick forever.
  if (session.status !== 'done' || turns.length === 0) {
    return { error: '이 질문하기는 아직 끝나지 않았어요. 질문하기에서 답변을 끝낸 뒤 다시 가져와 주세요. 지금은 예시 워크플로우를 보여 드려요.' };
  }
  const result = tableExists('step1_results') ? d.prepare('SELECT * FROM step1_results WHERE session_id = ?').get(sessionId) : undefined;

  let concept: { what?: string; analogy?: string; details?: string[]; so_what?: string } = {};
  try {
    concept = result ? JSON.parse(String(result.concept)) : {};
  } catch {
    /* keep empty; the one-liner still carries the concept */
  }
  const prompt = String(session.prompt);
  const gameTitle = result ? String(result.title) : short(prompt, 30);
  const oneLiner = result ? String(result.one_liner) : prompt;

  return tx(() => {
    const wid = insertWorkflow(gameTitle, source);
    const PER_ROW = 4;
    const pos = (i: number) => ({ x: (i % PER_ROW) * 360, y: Math.floor(i / PER_ROW) * 280 });
    const t0 = Date.now();
    const at = (i: number, k: number) => new Date(t0 + i * 1000 + k).toISOString();

    const conceptCard = insertCard({
      workflow_id: wid, title: `컨셉: ${short(gameTitle, 24)}`, description: short(oneLiner, 200),
      status: result ? 'frozen' : 'active', decision: result ? (concept.what ? `${oneLiner}\n\n${concept.what}` : oneLiner) : null, ...pos(0),
    }, at(0, 0));
    insertMessage(conceptCard.id, 'user', prompt, at(0, 1));
    if (result) {
      const body = [
        concept.what, concept.analogy && `비유로 말하면: ${concept.analogy}`,
        Array.isArray(concept.details) && concept.details.length ? concept.details.map((x) => `- ${x}`).join('\n') : '',
        concept.so_what && `그래서 좋은 점: ${concept.so_what}`,
      ].filter(Boolean).join('\n\n');
      insertMessage(conceptCard.id, 'agent', `**${gameTitle}**\n\n${oneLiner}${body ? `\n\n${body}` : ''}`, at(0, 2));
    }

    let prev = conceptCard.id;
    turns.forEach((t, n) => {
      const i = n + 1;
      const question = String(t.question);
      const answer = answerText(t.answer) || '(답변 없음)';
      const track = typeof t.track === 'string' ? t.track : '';
      const card = insertCard({
        workflow_id: wid, title: Object.hasOwn(TRACKS, track) ? TRACKS[track] : `${i}번째 질문`, description: question,
        status: 'frozen', decision: answer, ...pos(i),
      }, at(i, 0));
      insertMessage(card.id, 'agent', t.hint ? `${question}\n\n${String(t.hint)}` : question, at(i, 1));
      insertMessage(card.id, 'user', answer, at(i, 2));
      insertEdge(wid, prev, card.id);
      prev = card.id;
    });
    return { id: wid };
  });
}
