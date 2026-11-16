import { randomUUID } from 'node:crypto';
import { db } from './db';
import { completeJSON, provider } from './llm';
import { ensureSchema } from './schema';
import {
  HARD_CAP, MAX_QUESTIONS, RECOMMEND, TRACKS, CLEAR, QUESTION_SYSTEM, CONCEPT_SYSTEM,
  applyAnswer, blockedTrack, conceptUser, decisions, goalLine, initialLedger, label, mockConcept, mockQuestion,
  overall, parseConcept, parseQuestion, pickTrack, questionUser, resolveAnswer, shouldStop,
  type Answer, type Ledger, type Question, type TrackKey, type Turn,
} from './interview';

type TurnRow = { id: string; idx: number; track: TrackKey; question: string; hint: string | null; options: string; allow_free: number; multi: number; answer: string | null; ledger: string | null; provider: string | null };
type SessionRow = { id: string; prompt: string; status: 'interviewing' | 'done'; ambiguity: number | null; tracks: string | null; created_at: string };

export type TurnView = { id: string; idx: number; track: TrackKey; trackLabel: string; question: string; hint: string; options: string[]; multi: boolean; allowFree: boolean; answer: Answer | null; provider: string };
export type Concept = { what: string; analogy: string; details: string[]; so_what: string; decisions: { track: string; decision: string }[] };
export type State = {
  id: string; prompt: string; status: 'interviewing' | 'done'; createdAt: string;
  overall: number; ledger: { key: TrackKey; label: string; score: number; clear: boolean }[];
  turns: TurnView[]; open: TurnView | null;
  restate: { goal: string; decisions: { track: string; decision: string }[]; fuzzy: string[]; canAskMore: boolean } | null;
  result: { title: string; one_liner: string; concept: Concept; provider: string } | null;
  maxQuestions: number;
};

const now = () => new Date().toISOString();
const newId = () => randomUUID().replaceAll('-', '').slice(0, 10);

function rows(id: string) {
  ensureSchema();
  const s = db().prepare('SELECT * FROM step1_sessions WHERE id = ?').get(id) as SessionRow | undefined;
  if (!s) return null;
  const t = db().prepare('SELECT * FROM step1_turns WHERE session_id = ? ORDER BY idx').all(id) as TurnRow[];
  return { s, t, ledger: JSON.parse(s.tracks ?? '{}') as Ledger };
}

const toTurn = (r: TurnRow): Turn => ({ track: r.track, question: r.question, options: JSON.parse(r.options), answer: r.answer ? JSON.parse(r.answer) : null });

export function getState(id: string): State | null {
  const x = rows(id);
  if (!x) return null;
  const { s, t, ledger } = x;
  const views: TurnView[] = t.map((r) => ({
    id: r.id, idx: r.idx, track: r.track, trackLabel: label(r.track), question: r.question, hint: r.hint ?? '',
    options: JSON.parse(r.options), multi: !!r.multi, allowFree: !!r.allow_free, answer: r.answer ? JSON.parse(r.answer) : null, provider: r.provider ?? '',
  }));
  const open = views.find((v) => !v.answer) ?? null;
  const turns = t.map(toTurn);
  const res = db().prepare('SELECT * FROM step1_results WHERE session_id = ?').get(id) as { title: string; one_liner: string; concept: string; provider: string | null } | undefined;
  const ledgerView = TRACKS.map((tr) => ({ key: tr.key, label: tr.label, score: ledger[tr.key] ?? 1, clear: (ledger[tr.key] ?? 1) <= CLEAR }));
  return {
    id: s.id, prompt: s.prompt, status: s.status, createdAt: s.created_at,
    overall: overall(ledger), ledger: ledgerView, turns: views, open,
    restate: s.status === 'interviewing' && !open
      ? { goal: goalLine(s.prompt, turns), decisions: decisions(turns).map(({ track, decision }) => ({ track, decision })), fuzzy: ledgerView.filter((l) => !l.clear).map((l) => l.label), canAskMore: t.length < HARD_CAP }
      : null,
    result: res ? { title: res.title, one_liner: res.one_liner, concept: JSON.parse(res.concept), provider: res.provider ?? '' } : null,
    maxQuestions: MAX_QUESTIONS,
  };
}

export function listSessions(limit = 20) {
  ensureSchema();
  return db().prepare(`
    SELECT s.id, s.prompt, s.status, s.created_at, r.title, (SELECT COUNT(*) FROM step1_turns t WHERE t.session_id = s.id AND t.answer IS NOT NULL) AS answered
    FROM step1_sessions s LEFT JOIN step1_results r ON r.session_id = s.id ORDER BY s.created_at DESC LIMIT ?`).all(limit) as
    { id: string; prompt: string; status: string; created_at: string; title: string | null; answered: number }[];
}

/** Ask the next question (LLM, or the mock bank when the model is off/fails/breaks a rule). No-op if one is already open. */
async function askNext(id: string, force = false): Promise<void> {
  const x = rows(id)!;
  if (x.t.some((r) => !r.answer) || x.s.status !== 'interviewing') return;
  const turns = x.t.map(toTurn);
  if (turns.length >= HARD_CAP || (!force && shouldStop(x.ledger, turns.length))) return;
  const history = turns.map((t) => t.track);
  const blocked = blockedTrack(history);
  const target = pickTrack(x.ledger, history);
  const mock = () => ({ ...mockQuestion(x.s.prompt, turns, target), ambiguity: x.ledger, done: false });
  const res = await completeJSON(QUESTION_SYSTEM, questionUser(x.s.prompt, turns, x.ledger, target, blocked), mock);
  const parsed = parseQuestion(res.data, blocked);
  const ledger = { ...x.ledger, ...parsed.ledger };
  let q: Question;
  let used: string = res.provider;
  if (parsed.q) q = parsed.q;
  else if (parsed.done && !force && res.provider !== 'mock') {
    db().prepare('UPDATE step1_sessions SET tracks = ?, ambiguity = ? WHERE id = ?').run(JSON.stringify(ledger), overall(ledger), id);
    return; // model says every track is clear: go to the Restate gate
  } else {
    const pick = pickTrack(ledger, history);
    q = mockQuestion(x.s.prompt, turns, pick);
    used = res.provider === 'mock' ? 'mock' : 'mock (LLM 응답을 쓸 수 없어 기본 질문)';
  }
  if (res.error) used = 'mock (LLM 호출 실패)';
  const d = db();
  if (d.prepare('SELECT 1 FROM step1_turns WHERE session_id = ? AND answer IS NULL').get(id)) return; // a parallel request won
  d.prepare('INSERT INTO step1_turns (id, session_id, idx, track, question, hint, options, allow_free, multi, answer, ledger, provider, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)')
    .run(newId(), id, turns.length, q.track, q.question, q.hint, JSON.stringify(q.options), q.allow_free ? 1 : 0, q.multi ? 1 : 0, JSON.stringify(ledger), used, now());
  d.prepare('UPDATE step1_sessions SET tracks = ?, ambiguity = ? WHERE id = ?').run(JSON.stringify(ledger), overall(ledger), id);
}

export async function createSession(prompt: string): Promise<string> {
  ensureSchema();
  const id = newId();
  const ledger = initialLedger(prompt);
  db().prepare('INSERT INTO step1_sessions (id, prompt, status, ambiguity, tracks, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, prompt, 'interviewing', overall(ledger), JSON.stringify(ledger), now());
  await askNext(id);
  return id;
}

export class InputError extends Error {}

export async function act(id: string, body: Record<string, unknown>): Promise<State | null> {
  const x = rows(id);
  if (!x) return null;
  const open = x.t.find((r) => !r.answer);
  const d = db();
  switch (body.action) {
    case 'answer': {
      if (x.s.status !== 'interviewing' || !open || body.turnId !== open.id) throw new InputError('이미 답한 질문이에요. 화면을 새로 고쳐 주세요.');
      const options: string[] = JSON.parse(open.options);
      const raw = Array.isArray(body.choices) ? body.choices : [];
      const choices = [...new Set(raw.filter((c): c is string => typeof c === 'string'))];
      if (choices.some((c) => c !== RECOMMEND && !options.includes(c))) throw new InputError('보기에 없는 답이 섞여 있어요.');
      if (!open.multi && choices.length > 1) throw new InputError('이 질문은 하나만 고를 수 있어요.');
      if (choices.includes(RECOMMEND) && choices.length > 1) throw new InputError('‘추천해 줘’는 다른 보기와 함께 고를 수 없어요.');
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (text.length > 500) throw new InputError('직접 쓰기는 500자까지예요.');
      if (!open.allow_free && text) throw new InputError('이 질문은 직접 쓰기를 받지 않아요.');
      if (!choices.length && !text) throw new InputError('보기를 고르거나 직접 써 주세요.');
      const answer: Answer = resolveAnswer({ choices, text }, options); // store the recommendation itself, not "추천해 줘"
      const ledger = applyAnswer(x.ledger, open.track, answer);
      d.prepare('UPDATE step1_turns SET answer = ? WHERE id = ?').run(JSON.stringify(answer), open.id);
      d.prepare('UPDATE step1_sessions SET tracks = ?, ambiguity = ? WHERE id = ?').run(JSON.stringify(ledger), overall(ledger), id);
      await askNext(id);
      break;
    }
    case 'wrap': // 여기까지로 정리하기: drop the open question, go to the Restate gate
      if (x.s.status !== 'interviewing') break;
      if (!x.t.some((r) => r.answer)) throw new InputError('질문에 하나 이상 답해야 정리할 수 있어요.');
      if (open) d.prepare('DELETE FROM step1_turns WHERE id = ?').run(open.id);
      break;
    case 'more': // Restate gate: "질문 하나 더"
      if (x.s.status === 'interviewing' && !open) await askNext(id, true);
      break;
    case 'back': { // 이전: drop the open question, reopen the last answered one and restore its ledger
      if (x.s.status !== 'interviewing') break;
      const last = [...x.t].reverse().find((r) => r.answer);
      if (!last) break;
      if (open) d.prepare('DELETE FROM step1_turns WHERE id = ?').run(open.id);
      d.prepare('UPDATE step1_turns SET answer = NULL WHERE id = ?').run(last.id);
      const ledger = last.ledger ?? x.s.tracks ?? '{}';
      d.prepare('UPDATE step1_sessions SET tracks = ?, ambiguity = ? WHERE id = ?').run(ledger, overall(JSON.parse(ledger)), id);
      break;
    }
    case 'finish': { // Restate gate confirmed: write the ELI5 concept
      if (x.s.status !== 'interviewing' || open) throw new InputError('정리할 준비가 아직 안 됐어요.');
      const turns = x.t.map(toTurn);
      if (!turns.length) throw new InputError('질문에 하나 이상 답해야 정리할 수 있어요.');
      const fallback = mockConcept(x.s.prompt, turns);
      const res = await completeJSON(CONCEPT_SYSTEM, conceptUser(x.s.prompt, turns), () => fallback);
      const c = parseConcept(res.data, fallback);
      const concept = { what: c.what, analogy: c.analogy, details: c.details, so_what: c.so_what, decisions: decisions(turns).map(({ track, decision }) => ({ track, decision })) };
      if (rows(id)!.s.status === 'done') break; // a parallel request already finished it
      d.prepare('INSERT OR REPLACE INTO step1_results (session_id, title, one_liner, concept, provider, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, c.title, c.one_liner, JSON.stringify(concept), res.error ? 'mock (LLM 호출 실패)' : res.provider, now());
      d.prepare("UPDATE step1_sessions SET status = 'done' WHERE id = ?").run(id);
      break;
    }
    default:
      throw new InputError('알 수 없는 요청이에요.');
  }
  return getState(id);
}

export { provider };
