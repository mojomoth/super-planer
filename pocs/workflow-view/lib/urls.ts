// URL helpers shared by the chat renderer (client) and the plan-doc hand-off (server).

const URL_RE = /https?:\/\/[A-Za-z0-9\-._~:/?#@!$&*+,;=%()]+/g;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)$/i;
const IMAGE_HOSTS = new Set(['picsum.photos', 'images.unsplash.com']);

/** Trim sentence punctuation and an unbalanced closing paren (markdown `[t](url)`, "(see https://x)"). */
export function trimUrl(raw: string): string {
  let u = raw.replace(/[.,;:!?*]+$/, '');
  while (u.endsWith(')') && (u.match(/\(/g)?.length ?? 0) < (u.match(/\)/g)?.length ?? 0)) {
    u = u.slice(0, -1).replace(/[.,;:!?*]+$/, '');
  }
  return u;
}

/** Every distinct http(s) URL in the text, in order of appearance. */
export function extractUrls(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(URL_RE)) {
    const u = trimUrl(m[0]);
    if (!isHttpUrl(u) || out.includes(u)) continue;
    out.push(u);
  }
  return out;
}

export function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.hostname;
  } catch {
    return false;
  }
}

/** Image by file extension or by a known image host; such URLs render as <img> and are never fetched server-side. */
export function isImageUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return IMAGE_EXT.test(u.pathname) || IMAGE_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

export function hostOf(s: string): string {
  try {
    return new URL(s).hostname.replace(/^www\./, '');
  } catch {
    return s;
  }
}
