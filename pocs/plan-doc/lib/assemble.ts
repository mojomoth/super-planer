// Pure Markdown assembly for the plan document (no I/O, so lib/assemble.test.ts can run it with node --test).
export type Decision = { id: string; title: string; body: string; source: string | null };
export type ImageInput = { id: string; title: string; url: string; source: string | null };

export const SECTIONS = ['개요', '핵심 재미', '코어 루프', '주요 시스템', '아트·분위기', '결정 로그', '열린 질문/리스크', '다음 단계'] as const;

const FALLBACK_TITLE = '이름 미정 게임';

/** Escape a value for one GFM table cell: one line, pipes escaped. */
export function cell(text: string): string {
  return text.replace(/\s*\r?\n\s*/g, ' ').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').trim() || '-';
}

/** `![caption](url)` with the caption and URL made safe for Markdown. */
export function imageMd(img: Pick<ImageInput, 'title' | 'url'>): string {
  const alt = img.title.replace(/\s+/g, ' ').replace(/([[\]\\])/g, '\\$1').trim() || '이미지';
  return `![${alt}](${mdUrl(img.url)})`;
}

const mdUrl = (url: string) => url.replace(/[\s()<>]/g, (c) => encodeURIComponent(c));

export function sourceLabel(source: string | null): string {
  if (!source) return '직접 입력';
  if (source === 'seed') return '예시';
  if (source === 'upload' || source === 'manual') return '직접 입력';
  if (source.startsWith('wf:')) return '워크플로우';
  if (source.startsWith('step1:')) return 'Step1';
  return source;
}

const plain = (line: string) => line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '').replace(/\*\*|__|`/g, '').trim();

/** `키: 값` lines (also `- **키**: 값`) from a decision body. */
function keyValues(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const raw of body.split('\n')) {
    const m = plain(raw).match(/^([^:：]{1,20})[:：]\s*(.+)$/);
    if (m) out.set(m[1].trim(), m[2].trim());
  }
  return out;
}

function find(decisions: Decision[], keys: string[]): string | undefined {
  for (const d of decisions) {
    const kv = keyValues(d.body);
    for (const k of keys) if (kv.get(k)) return kv.get(k);
  }
}

const has = (d: Decision, words: string[]) => words.some((w) => d.title.includes(w));

const OPEN_LINE = /^(열린 질문|질문|리스크|미정)[:：]/;

/** The decided line of a decision (`결정: X` or its first plain line); undefined when it only holds open items. */
function decided(d: Decision): string | undefined {
  const lines = d.body.split('\n').map(plain).filter((l) => l && !l.startsWith('#') && !OPEN_LINE.test(l));
  const line = lines.find((l) => /^결정\s*[:：]/.test(l)) ?? lines[0];
  return line?.replace(/^결정\s*[:：]\s*/, '') || undefined;
}

/** A fact named by any of `words`: a `키: 값` line whose key contains a word (e.g. `플랫폼과 한 판 길이: 폰`),
 * else the decided line of a decision whose title contains one (workflow cards and Step1 tracks use such titles). */
function fact(decisions: Decision[], words: string[]): string | undefined {
  for (const d of decisions) for (const [k, v] of keyValues(d.body)) if (words.some((w) => k.includes(w))) return v;
  for (const d of decisions) if (has(d, words)) {
    const v = decided(d);
    if (v) return v;
  }
}

/** First line of a decision that reads as its conclusion. */
export function summary(d: Decision): string {
  const lines = d.body.split('\n').map(plain).filter((l) => l && !l.startsWith('#'));
  const line = lines.find((l) => /^결정\s*[:：]/.test(l)) ?? lines[0] ?? d.title;
  return line.replace(/^결정\s*[:：]\s*/, '') || d.title;
}

export function gameTitle(decisions: Decision[], fallback?: string): string {
  return find(decisions, ['가제', '게임 이름', '제목']) ?? (fallback?.trim() || FALLBACK_TITLE);
}

/** Lines tagged as open questions or risks, or lines that end in a question mark. */
function openItems(decisions: Decision[]): string[] {
  const out: string[] = [];
  for (const d of decisions) {
    for (const raw of d.body.split('\n')) {
      const l = plain(raw);
      if (l.startsWith('#')) continue;
      const tagged = l.match(new RegExp(`${OPEN_LINE.source}\\s*(.+)$`));
      if (tagged) out.push(`${tagged[1] === '리스크' ? '리스크' : '질문'}: ${tagged[2]} (${d.title})`);
      else if (/[?？]$/.test(l)) out.push(`질문: ${l} (${d.title})`);
    }
  }
  return [...new Set(out)];
}

const LOOP_WORDS = ['루프', '흐름'];

/** Loop steps: the loop decision's numbered list, else its decided line (or a `코어 루프: …` line) split on arrows.
 * A single step with no arrow is still a decided loop. */
export function loopSteps(decisions: Decision[]): string[] {
  const d = decisions.find((x) => has(x, LOOP_WORDS));
  const numbered = d ? d.body.split('\n').filter((l) => /^\s*\d+[.)]\s+/.test(l)).map(plain) : [];
  if (numbered.length) return numbered;
  const line = fact(decisions, LOOP_WORDS);
  if (!line) return [];
  return line.split(/\s*(?:→|->|⟶|⇒)\s*/).map((x) => x.replace(/[.。]+$/, '').trim()).filter(Boolean);
}

/** `결정: X` reads as X inside prose sections. */
const unlabel = (text: string) => text.replace(/^(\s*(?:[-*+]\s+)?)결정\s*[:：]\s*/gm, '$1');

/** Body without the `키: 값` lines already shown elsewhere. */
function bodyRest(body: string, drop: string[]): string {
  return body
    .split('\n')
    .filter((l) => !drop.some((k) => new RegExp(`^${k}\\s*[:：]`).test(plain(l))))
    .join('\n')
    .trim();
}

const OVERVIEW_KEYS = ['가제', '게임 이름', '제목', '한 줄 소개', '장르', '플랫폼', '타깃'];
const OPEN_KEYS = ['열린 질문', '질문', '리스크', '미정'];

/** Deterministic plan document built only from the given inputs. */
export function assemble(decisions: Decision[], images: ImageInput[], fallbackTitle?: string): { title: string; markdown: string } {
  const title = gameTitle(decisions, fallbackTitle);
  // Overview facts; undecided ones also go to 열린 질문 so the gap is visible.
  const overview = [
    { label: '한 줄 소개', words: ['한 줄 소개', '한 줄 요약', '컨셉', '콘셉트'], ask: '한 줄 소개를' },
    { label: '장르', words: ['장르'], ask: '장르를' },
    { label: '플랫폼', words: ['플랫폼'], ask: '플랫폼을' },
    { label: '타깃', words: ['타깃', '대상', '누가 할'], ask: '타깃을' },
  ].map((o) => ({ ...o, value: fact(decisions, o.words) }));
  const loopDec = decisions.find((x) => has(x, ['루프', '흐름']));
  const artDecs = decisions.filter((x) => has(x, ['아트', '분위기', '비주얼']));
  const funDecs = decisions.filter((x) => has(x, ['재미', '콘셉트', '컨셉']));
  // A decision whose body is only overview lines (가제, 장르, ...) already lives in 개요.
  const detail = (x: Decision) => bodyRest(x.body, [...OVERVIEW_KEYS, ...OPEN_KEYS, '결정']);
  const systemDecs = decisions.filter((x) => x !== loopDec && !artDecs.includes(x) && detail(x));
  const funFrom = funDecs.length ? funDecs : decisions.filter((x) => x !== loopDec && detail(x));

  const md: string[] = [`# ${title} 기획서`, ''];

  md.push('## 개요', '');
  md.push(...overview.map((o) => `- ${o.label}: ${o.value ?? '아직 정하지 않았어요'}`), '');

  md.push('## 핵심 재미', '');
  const fun = (funFrom.length ? funFrom : decisions).map((d) => `- ${summary(d)}`);
  md.push(...(fun.length ? fun : ['- 결정 문서가 없어요. 결정을 하나 이상 고른 뒤 다시 만들어 주세요.']), '');

  md.push('## 코어 루프', '');
  const steps = loopSteps(decisions);
  if (steps.length) md.push(...steps.map((s, i) => `${i + 1}. ${s}`), '');
  else md.push('1. 아직 정하지 않았어요. 코어 루프를 정한 결정 문서(제목에 루프나 흐름)를 추가해 주세요.', '');

  md.push('## 주요 시스템', '');
  if (!systemDecs.length) md.push('주요 시스템을 다룬 결정 문서가 아직 없어요.', '');
  for (const d of systemDecs) {
    const rest = unlabel(bodyRest(d.body, [...OVERVIEW_KEYS, ...OPEN_KEYS])).replace(/^#{1,6}\s/gm, '#### ');
    md.push(`### ${d.title}`, '', rest || summary(d), '');
  }

  md.push('## 아트·분위기', '');
  const artText = artDecs.map((d) => unlabel(bodyRest(d.body, OPEN_KEYS)).replace(/^#{1,6}\s/gm, '#### ')).filter(Boolean);
  for (const t of artText) md.push(t, '');
  if (!artText.length && !images.length) md.push('아트 방향을 정한 결정이나 이미지가 아직 없어요.', '');
  for (const img of images) md.push(imageMd(img), '');

  md.push('## 결정 로그', '', '| 항목 | 결정 | 출처 |', '| --- | --- | --- |');
  for (const d of decisions) md.push(`| ${cell(d.title)} | ${cell(summary(d))} | ${cell(sourceLabel(d.source))} |`);
  if (!decisions.length) md.push('| - | 선택한 결정 문서가 없어요 | - |');
  md.push('');

  md.push('## 열린 질문/리스크', '');
  const open = [...overview.filter((o) => !o.value).map((o) => `질문: ${o.ask} 아직 정하지 않았어요 (개요)`), ...openItems(decisions)];
  md.push(...(open.length ? open.map((o) => `- ${o}`) : ['- 결정 문서에서 열린 질문을 찾지 못했어요. 검토할 때 채워 주세요.']), '');

  md.push('## 다음 단계', '');
  const next = ['결정 로그를 팀과 함께 검토하고 빠진 결정을 채우기', '코어 루프 한 바퀴를 종이 프로토타입으로 돌려 보기'];
  if (open.length) next.push('열린 질문마다 담당자와 답할 날짜 정하기');
  if (!images.length) next.push('아트 레퍼런스 이미지를 모아 분위기 정하기');
  md.push(...next.map((s, i) => `${i + 1}. ${s}`), '');

  return { title, markdown: md.join('\n') };
}

/** Section names missing from a Markdown document (H1 `… 기획서` counts as `title`). */
export function missingSections(markdown: string): string[] {
  const heads = markdown.split('\n').filter((l) => /^##\s/.test(l)).map((l) => l.replace(/^##\s+/, ''));
  const missing: string[] = SECTIONS.filter((s) => !heads.some((h) => h.includes(s)));
  if (!/^#\s+.+기획서\s*$/m.test(markdown)) missing.unshift('title');
  return missing;
}

/** Make sure every image is embedded: missing ones go at the end of the 아트·분위기 section. */
export function ensureImages(markdown: string, images: ImageInput[]): string {
  const absent = images.filter((img) => !markdown.includes(`](${mdUrl(img.url)}`));
  if (!absent.length) return markdown;
  const block = absent.map(imageMd).join('\n\n');
  const lines = markdown.split('\n');
  const art = lines.findIndex((l) => /^##\s.*아트/.test(l));
  if (art < 0) return `${markdown.trimEnd()}\n\n## 아트·분위기\n\n${block}\n`;
  let end = lines.findIndex((l, i) => i > art && /^##\s/.test(l));
  if (end < 0) end = lines.length;
  lines.splice(end, 0, block, '');
  return lines.join('\n');
}
