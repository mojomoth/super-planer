// Pure image helpers (no I/O): upload sniffing and image-URL extraction from chat messages.
export const MAX_UPLOAD = 5 * 1024 * 1024;

/** MIME type from magic bytes; only png/jpeg/gif/webp. SVG and everything else → null. */
export function sniffImage(b: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 6 && (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a')) return 'image/gif';
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** True for an absolute https URL with a host. */
export function isHttpsUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password;
  } catch {
    return false;
  }
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

/** http(s) image URLs in free text: path ends in an image extension, or any picsum.photos link.
 * http is kept (workflow-view links its own http://localhost samples); the server never fetches these, the browser loads them as <img>. */
export function extractImageUrls(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/https?:\/\/[^\s<>()"'`[\]]+/g)) {
    const raw = m[0].replace(/[.,;:!?。、]+$/, '');
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol) || !u.hostname || u.username || u.password) continue;
    if (IMAGE_EXT.test(u.pathname) || u.hostname === 'picsum.photos' || u.hostname.endsWith('.picsum.photos')) out.push(u.href);
  }
  return [...new Set(out)];
}
