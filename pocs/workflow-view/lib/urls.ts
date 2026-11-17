// URL helpers shared by the chat renderer (client) and the plan-doc hand-off (server).

// Own-origin links are stored root-relative under an app's basePath (/workflow/…, /plan/…), so they work on any host.
// In text they count only at a word start (line start, space, "(", "<", "["), never inside another URL's path.
export const OWN_PATH = String.raw`(?<![^\s(<\[])\/(?:workflow|plan)\/`;
const URL_CHARS = String.raw`[A-Za-z0-9\-._~:/?#@!$&*+,;=%()]`;
export const URL_SRC = String.raw`https?:\/\/${URL_CHARS}+|${OWN_PATH}${URL_CHARS}*`;
const URL_RE = new RegExp(URL_SRC, 'g');
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)$/i;
// Images an app serves from its own API (plan-doc uploads, generated images in both apps) carry no file extension.
const OWN_IMAGE_API = /^\/(?:workflow|plan)\/api\/images\/[\w-]+$/;

/** Trim sentence punctuation and an unbalanced closing paren (markdown `[t](url)`, "(see https://x)"). */
export function trimUrl(raw: string): string {
  let u = raw.replace(/[.,;:!?*]+$/, '');
  while (u.endsWith(')') && (u.match(/\(/g)?.length ?? 0) < (u.match(/\)/g)?.length ?? 0)) {
    u = u.slice(0, -1).replace(/[.,;:!?*]+$/, '');
  }
  return u;
}

/** Every distinct http(s) URL and own-origin path in the text, in order of appearance. */
export function extractUrls(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(URL_RE)) {
    const u = trimUrl(m[0]);
    if (!(isHttpUrl(u) || isOwnPath(u)) || out.includes(u)) continue;
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

/** Root-relative path into one of the PoC apps on this origin, e.g. /workflow/samples/a.svg. */
export const isOwnPath = (s: string): boolean => /^\/(?:workflow|plan)\/\S*$/.test(s);

/** Image by file extension or an own image API path; such URLs render as <img> and are never fetched server-side. */
export function isImageUrl(s: string): boolean {
  try {
    if (isOwnPath(s)) {
      const p = new URL(s, 'http://own.invalid').pathname;
      return IMAGE_EXT.test(p) || OWN_IMAGE_API.test(p);
    }
    const u = new URL(s);
    return IMAGE_EXT.test(u.pathname);
  } catch {
    return false;
  }
}

export function hostOf(s: string): string {
  if (isOwnPath(s)) return 'Super Planer';
  try {
    return new URL(s).hostname.replace(/^www\./, '');
  } catch {
    return s;
  }
}
