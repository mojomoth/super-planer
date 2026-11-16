// Tiny markdown-ish parser for chat messages: paragraphs, bullet/numbered lists, **bold**, [text](url), bare URLs.
// Returns plain data; the React side renders it, so no HTML string is ever injected.
import { trimUrl } from './urls.ts';

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'link'; v: string; href: string }
  | { t: 'url'; href: string };

export type Block = { t: 'p'; lines: string[] } | { t: 'ul' | 'ol'; items: string[] };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBER = /^\s*\d+[.)]\s+(.*)$/;

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of text.replace(/\r\n/g, '\n').split(/\n\s*\n/)) {
    const lines = chunk.split('\n').filter((l) => l.trim());
    let para: string[] = [];
    let list: { t: 'ul' | 'ol'; items: string[] } | null = null;
    const flush = () => {
      if (para.length) blocks.push({ t: 'p', lines: para });
      if (list) blocks.push(list);
      para = [];
      list = null;
    };
    for (const line of lines) {
      const b = BULLET.exec(line);
      const n = b ? null : NUMBER.exec(line);
      const kind = b ? 'ul' : n ? 'ol' : null;
      if (kind) {
        if (para.length || (list && list.t !== kind)) flush();
        list ??= { t: kind, items: [] };
        list.items.push((b ?? n)![1]);
      } else {
        if (list) flush();
        para.push(line.trim());
      }
    }
    flush();
  }
  return blocks;
}

const INLINE_RE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[A-Za-z0-9\-._~:/?#@!$&*+,;=%()]+)/g;

export function parseInline(line: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of line.matchAll(INLINE_RE)) {
    let end = m.index + m[0].length;
    let tok: Inline;
    if (m[1] !== undefined) tok = { t: 'bold', v: m[1] };
    else if (m[2] !== undefined) tok = { t: 'link', v: m[2], href: m[3] };
    else {
      const u = trimUrl(m[4]); // trailing punctuation / unbalanced ")" stays as text
      end = m.index + u.length;
      tok = { t: 'url', href: u };
    }
    if (m.index > last) out.push({ t: 'text', v: line.slice(last, m.index) });
    out.push(tok);
    last = end;
  }
  if (last < line.length) out.push({ t: 'text', v: line.slice(last) });
  return out;
}

/** Plain-text gist of a message: no URLs, markdown marks or "참고" lines, cut at a sentence end near `max`. */
export function condense(text: string, max = 220): string {
  const flat = text
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1')
    .split('\n')
    .map((l) => l.replace(/https?:\/\/\S+/g, '').replace(/\*\*/g, '').replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
    .filter((l) => l && !/^(참고|분위기 참고|비슷한 구조)\s*:?$/.test(l) && !/:\s*$/.test(l))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('요 '), cut.lastIndexOf('다 '));
  return end > max / 3 ? cut.slice(0, end + 1).trim() : `${cut.trimEnd()}…`;
}
