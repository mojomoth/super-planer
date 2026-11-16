// Server-side link preview with an SSRF guard. Every hop (first URL and each redirect) is re-checked,
// and the DNS answer is checked inside the socket's own lookup, so a rebinding name cannot slip past.
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import zlib from 'node:zlib';
import type { Readable } from 'node:stream';

export type Preview = {
  url: string;
  kind: 'image' | 'page';
  title: string | null;
  description: string | null;
  image: string | null;
  site: string | null;
};

const MAX_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 5000;

// Two lists: a v6 rule like ::ffff:0:0/96 would otherwise also match every plain IPv4 address.
const blocked4 = new net.BlockList();
const blocked6 = new net.BlockList();
const embeds4 = new net.BlockList(); // v6 prefixes whose last 32 bits are an IPv4 address: judge that address
for (const [a, p] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked4.addSubnet(a, p, 'ipv4');
for (const [a, p] of [
  ['::', 96], // unspecified, loopback, IPv4-compatible
  ['64:ff9b:1::', 48], ['100::', 64], ['2001::', 32], ['2001:db8::', 32], ['2002::', 16],
  ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8],
] as const) blocked6.addSubnet(a, p, 'ipv6');
embeds4.addSubnet('::ffff:0:0', 96, 'ipv6'); // IPv4-mapped
embeds4.addSubnet('64:ff9b::', 96, 'ipv6'); // NAT64 well-known prefix (DNS64 networks answer with it)

/** True for anything that is not a public unicast address (loopback, private, link-local/metadata, CGNAT, …). */
export function isBlockedIp(ip: string): boolean {
  const v = net.isIP(ip);
  if (!v) return true;
  if (v === 4) return blocked4.check(ip, 'ipv4');
  if (embeds4.check(ip, 'ipv6')) {
    // URL normalises to compressed hex, so the last two groups are the low 32 bits ("::" → 0)
    const g = new URL(`http://[${ip}]/`).hostname.slice(1, -1).split(':').slice(-2).map((x) => parseInt(x || '0', 16));
    return isBlockedIp(`${g[0] >> 8}.${g[0] & 255}.${g[1] >> 8}.${g[1] & 255}`);
  }
  return blocked6.check(ip, 'ipv6');
}

class BlockedError extends Error {}

function assertAllowed(u: URL) {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new BlockedError(`protocol ${u.protocol} not allowed`);
  if (u.username || u.password) throw new BlockedError('credentials in URL not allowed');
  if (u.port && u.port !== '80' && u.port !== '443') throw new BlockedError(`port ${u.port} not allowed`);
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isBlockedIp(host)) throw new BlockedError(`address ${host} not allowed`);
}

type LookupCb = (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void;
const guardedLookup = ((hostname: string, options: dns.LookupOptions, cb: LookupCb) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addrs) => {
    if (err) return cb(err, '');
    const bad = addrs.find((a) => isBlockedIp(a.address));
    if (!addrs.length || bad) return cb(new BlockedError(`${hostname} resolves to a blocked address`), '');
    if (options.all) cb(null, addrs);
    else cb(null, addrs[0].address, addrs[0].family);
  });
}) as unknown as net.LookupFunction;

function get(u: URL, signal: AbortSignal): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = (u.protocol === 'https:' ? https : http).get(u, {
      agent: false,
      lookup: guardedLookup,
      signal,
      headers: {
        'user-agent': 'SuperPlanerLinkPreview/0.1',
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
        'accept-encoding': 'gzip, deflate, br',
      },
    });
    req.on('response', resolve);
    req.on('error', reject);
  });
}

function readCapped(res: http.IncomingMessage): Promise<Buffer> {
  const enc = String(res.headers['content-encoding'] ?? '').toLowerCase();
  const stream: Readable =
    enc === 'gzip' ? res.pipe(zlib.createGunzip())
    : enc === 'deflate' ? res.pipe(zlib.createInflate())
    : enc === 'br' ? res.pipe(zlib.createBrotliDecompress())
    : res;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      res.destroy();
      resolve(Buffer.concat(chunks).subarray(0, MAX_BYTES));
    };
    stream.on('data', (c: Buffer) => {
      chunks.push(c);
      size += c.length;
      if (size >= MAX_BYTES) finish(); // shortcut: parse only the first 1MB, enough for <head>
    });
    stream.on('end', finish);
    const fail = (e: Error) => {
      if (done) return;
      done = true;
      reject(e);
    };
    stream.on('error', fail);
    if (stream !== res) res.on('error', fail);
  });
}

function decode(buf: Buffer, contentType: string): string {
  const sniff = buf.subarray(0, 2048).toString('latin1');
  const label =
    /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(sniff)?.[1] ?? 'utf-8';
  try {
    return new TextDecoder(label).decode(buf);
  } catch {
    return new TextDecoder('utf-8').decode(buf);
  }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+|#39);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
}

const clip = (s: string | undefined | null, n: number) => {
  const t = s?.replace(/\s+/g, ' ').trim();
  return t ? (t.length > n ? `${t.slice(0, n - 1)}…` : t) : null;
};

/** og:/twitter:/<title> metadata from an HTML string. Relative og:image resolves against `base`. */
export function parseMeta(html: string, base: URL): Omit<Preview, 'url' | 'kind'> {
  const metas = new Map<string, string>();
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (attr(m[0], 'property') ?? attr(m[0], 'name'))?.toLowerCase();
    const content = attr(m[0], 'content');
    if (key && content !== null && !metas.has(key)) metas.set(key, decodeEntities(content));
  }
  const titleTag = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1];
  let image: string | null = null;
  const rawImage = metas.get('og:image') ?? metas.get('og:image:url') ?? metas.get('twitter:image');
  if (rawImage) {
    try {
      const iu = new URL(rawImage, base);
      if (iu.protocol === 'http:' || iu.protocol === 'https:') image = iu.href;
    } catch {
      /* ignore a broken og:image */
    }
  }
  return {
    title: clip(metas.get('og:title') ?? metas.get('twitter:title') ?? (titleTag ? decodeEntities(titleTag) : null), 200),
    description: clip(metas.get('og:description') ?? metas.get('twitter:description') ?? metas.get('description'), 400),
    image,
    site: clip(metas.get('og:site_name'), 80) ?? base.hostname.replace(/^www\./, ''),
  };
}

/** Fetch a page's preview. Throws on a blocked target, a non-2xx, a non-HTML body or a timeout. */
export async function fetchPreview(raw: string): Promise<Preview> {
  let u = new URL(raw);
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  for (let hop = 0; ; hop++) {
    assertAllowed(u);
    const res = await get(u, signal);
    const status = res.statusCode ?? 0;
    if (status >= 300 && status < 400 && res.headers.location) {
      res.resume();
      if (hop >= MAX_REDIRECTS) throw new Error('too many redirects');
      u = new URL(res.headers.location, u);
      continue;
    }
    if (status < 200 || status >= 300) {
      res.resume();
      throw new Error(`HTTP ${status}`);
    }
    const type = String(res.headers['content-type'] ?? '');
    if (/^image\//i.test(type)) {
      res.destroy();
      return { url: raw, kind: 'image', title: null, description: null, image: u.href, site: u.hostname };
    }
    if (!/text\/html|application\/xhtml\+xml/i.test(type)) {
      res.destroy();
      throw new Error(`not HTML (${type || 'no content-type'})`);
    }
    const html = decode(await readCapped(res), type);
    return { url: raw, kind: 'page', ...parseMeta(html, u) };
  }
}
