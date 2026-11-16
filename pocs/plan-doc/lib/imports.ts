import { createHash } from 'node:crypto';
import { tableExists } from './db';
import { extractImageUrls } from './images';
import { store, now } from './schema';

const hid = (prefix: string, ...parts: string[]) => `${prefix}_${createHash('sha1').update(parts.join('\n')).digest('hex').slice(0, 16)}`;

export type ImportResult = { ids: string[]; message?: string };

/** Frozen workflow cards → decision inputs, image URLs in their messages → image inputs.
 * Idempotent per card/URL and INSERT OR IGNORE, so a re-import never overwrites the user's edited copy. */
export function importWorkflow(workflowId: string): ImportResult {
  const d = store();
  if (!['wf_workflows', 'wf_cards', 'wf_messages'].every(tableExists)) return { ids: [], message: '워크플로우 데이터가 아직 없어요. 워크플로우 화면을 먼저 열어 주세요.' };
  const wf = d.prepare('SELECT id, title FROM wf_workflows WHERE id = ?').get(workflowId) as { id: string; title: string } | undefined;
  if (!wf) return { ids: [], message: '이 워크플로우를 찾지 못했어요.' };
  const cards = d
    .prepare("SELECT id, title, description, decision FROM wf_cards WHERE workflow_id = ? AND status = 'frozen' ORDER BY y, x")
    .all(workflowId) as { id: string; title: string; description: string | null; decision: string | null }[];
  if (!cards.length) return { ids: [], message: `'${wf.title}'에 동결된 카드가 없어요. 카드를 동결한 뒤 다시 가져와 주세요.` };

  const source = `wf:${workflowId}`;
  const addDec = d.prepare("INSERT OR IGNORE INTO plan_inputs (id, kind, title, body, url, source, created_at) VALUES (?, 'decision', ?, ?, NULL, ?, ?)");
  const addImg = d.prepare("INSERT OR IGNORE INTO plan_inputs (id, kind, title, body, url, source, created_at) VALUES (?, 'image', ?, NULL, ?, ?, ?)");
  const msgs = d.prepare('SELECT content FROM wf_messages WHERE card_id = ? ORDER BY created_at');
  const ids: string[] = [];
  for (const c of cards) {
    const id = hid('wfc', source, c.id);
    // No decision summary → the card description becomes an open item (미정:), not a fake decision; nothing at all → empty body.
    const decision = (c.decision ?? '').trim();
    const desc = (c.description ?? '').trim();
    addDec.run(id, c.title.slice(0, 200), decision ? `결정: ${decision}` : desc ? `미정: ${desc}` : '', source, now());
    ids.push(id);
    const urls = (msgs.all(c.id) as { content: string }[]).flatMap((m) => extractImageUrls(m.content));
    [...new Set(urls)].forEach((url, i) => {
      const imgId = hid('wfi', source, url);
      addImg.run(imgId, `${c.title.slice(0, 160)} 참고 이미지 ${i + 1}`, url, source, now());
      ids.push(imgId);
    });
  }
  return { ids: [...new Set(ids)] };
}

type Concept = { what?: string; analogy?: string; details?: string[]; so_what?: string; decisions?: { track?: string; decision?: string }[] };

/** Workflow title for a `wf:<id>` source, used as the game title when no decision names one. */
export function workflowTitle(source: string | null): string | undefined {
  if (!source?.startsWith('wf:') || !tableExists('wf_workflows')) return;
  const r = store().prepare('SELECT title FROM wf_workflows WHERE id = ?').get(source.slice(3)) as { title: string } | undefined;
  return r?.title.replace(/\s*\([^)]*\)\s*$/, '').trim() || undefined;
}

export function listStep1(): { session_id: string; title: string; one_liner: string; created_at: string }[] {
  store();
  if (!tableExists('step1_results')) return [];
  return store().prepare('SELECT session_id, title, one_liner, created_at FROM step1_results ORDER BY created_at DESC LIMIT 20').all() as never;
}

/** One Step1 result → one decision input holding the ELI5 concept (kept as-is once imported, like workflow cards). */
export function importStep1(sessionId: string): ImportResult {
  const d = store();
  if (!tableExists('step1_results')) return { ids: [], message: 'Step1 결과가 아직 없어요.' };
  const r = d.prepare('SELECT session_id, title, one_liner, concept FROM step1_results WHERE session_id = ?').get(sessionId) as
    | { session_id: string; title: string; one_liner: string; concept: string }
    | undefined;
  if (!r) return { ids: [], message: '이 Step1 결과를 찾지 못했어요.' };
  let c: Concept = {};
  try {
    c = JSON.parse(r.concept) as Concept;
  } catch {
    // keep the title and one-liner even if the concept JSON is broken
  }
  const lines = [`결정: ${r.one_liner}`, '', `- 가제: ${r.title}`, `- 한 줄 소개: ${r.one_liner}`];
  if (c.what) lines.push('', '#### 한 줄 요약', '', c.what);
  if (c.analogy) lines.push('', '#### 비유로 말하면', '', c.analogy);
  if (Array.isArray(c.details) && c.details.length) lines.push('', '#### 자세히', '', ...c.details.map((x) => `- ${String(x)}`));
  if (c.so_what) lines.push('', '#### 그래서 뭐가 좋아?', '', c.so_what);
  if (Array.isArray(c.decisions) && c.decisions.length)
    lines.push('', '#### 결정한 것들', '', ...c.decisions.map((x) => `- ${x.track ?? '항목'}: ${x.decision ?? ''}`));
  const source = `step1:${r.session_id}`;
  const id = hid('s1', source);
  d.prepare("INSERT OR IGNORE INTO plan_inputs (id, kind, title, body, url, source, created_at) VALUES (?, 'decision', ?, ?, NULL, ?, ?)").run(id, `${r.title} 콘셉트`.slice(0, 200), lines.join('\n'), source, now());
  return { ids: [id] };
}
