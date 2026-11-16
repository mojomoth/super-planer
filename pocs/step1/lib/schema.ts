import { db } from './db';
import { applyAnswer, initialLedger, mockConcept, mockQuestion, overall, pickTrack, decisions, shouldStop, type Answer, type TrackKey, type Turn } from './interview';

// step1 owns step1_* only (pocs/CONTRACT.md). Added columns beyond the contract: sessions.tracks, turns.multi/ledger/provider, results.provider.
const g = globalThis as unknown as { __step1Schema?: boolean };

export function ensureSchema() {
  if (g.__step1Schema) return;
  db().exec(`
    CREATE TABLE IF NOT EXISTS step1_sessions (
      id TEXT PRIMARY KEY, prompt TEXT NOT NULL, status TEXT NOT NULL, ambiguity REAL,
      tracks TEXT,                       -- JSON {track: 0..1}, the live ambiguity ledger
      created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS step1_turns (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, idx INTEGER NOT NULL, track TEXT,
      question TEXT NOT NULL, hint TEXT, options TEXT NOT NULL,
      allow_free INTEGER NOT NULL DEFAULT 1, multi INTEGER NOT NULL DEFAULT 0,
      answer TEXT,
      ledger TEXT,                       -- ledger when this question was asked (restored by 이전)
      provider TEXT,
      created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS step1_turns_session ON step1_turns(session_id, idx);
    CREATE TABLE IF NOT EXISTS step1_results (
      session_id TEXT PRIMARY KEY, title TEXT NOT NULL, one_liner TEXT NOT NULL, concept TEXT NOT NULL,
      provider TEXT, created_at TEXT NOT NULL);
  `);
  seed();
  g.__step1Schema = true;
}

// A finished sample interview (id 'sample') so the app and the workflow-view hand-off can be reviewed with an empty DB.
const SAMPLE_PROMPT = '고양이가 우주 농장을 운영하는 느긋한 게임';
const SAMPLE: Record<TrackKey, Answer> = {
  fun: { choices: ['차곡차곡 키우고 꾸미는 재미'], text: '행성마다 다른 작물이 자라는 걸 보는 맛' },
  loop: { choices: ['심고 기다렸다가 수확하기', '모은 것으로 공간 꾸미기'], text: '' },
  role: { choices: ['고양이 본인(직접 조종)'], text: '' },
  win: { choices: ['끝이 없고 계속 성장만 해요'], text: '대신 주간 목표가 있어요' },
  mood: { choices: ['말랑하고 귀여운 파스텔'], text: '' },
  unique: { choices: [], text: '친구 우주 농장에 놀러 가서 작물을 몰래 가져오기' },
  platform: { choices: ['폰으로 자기 전에 20분쯤'], text: '' },
  audience: { choices: ['게임을 잘 안 하는 친구'], text: '' },
};

function seed() {
  const d = db();
  if (d.prepare('SELECT 1 FROM step1_sessions LIMIT 1').get()) return;
  const now = new Date().toISOString();
  let ledger = initialLedger(SAMPLE_PROMPT);
  const turns: Turn[] = [];
  const ins = d.prepare('INSERT INTO step1_turns (id, session_id, idx, track, question, hint, options, allow_free, multi, answer, ledger, provider, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)');
  d.exec('BEGIN');
  try {
    for (let i = 0; !shouldStop(ledger, i); i++) {
      const q = mockQuestion(SAMPLE_PROMPT, turns, pickTrack(ledger, turns.map((t) => t.track)));
      const a = SAMPLE[q.track];
      ins.run(`sample-${i}`, 'sample', i, q.track, q.question, q.hint, JSON.stringify(q.options), q.multi ? 1 : 0, JSON.stringify(a), JSON.stringify(ledger), 'seed', now);
      turns.push({ track: q.track, question: q.question, options: q.options, answer: a });
      ledger = applyAnswer(ledger, q.track, a);
    }
    const c = mockConcept(SAMPLE_PROMPT, turns);
    d.prepare('INSERT INTO step1_sessions (id, prompt, status, ambiguity, tracks, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('sample', SAMPLE_PROMPT, 'done', overall(ledger), JSON.stringify(ledger), now);
    d.prepare('INSERT INTO step1_results (session_id, title, one_liner, concept, provider, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      'sample', c.title, c.one_liner,
      JSON.stringify({ what: c.what, analogy: c.analogy, details: c.details, so_what: c.so_what, decisions: decisions(turns).map(({ track, decision }) => ({ track, decision })) }),
      'seed', now,
    );
    d.exec('COMMIT');
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}
