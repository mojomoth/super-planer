// One origin for the three PoCs: a reverse proxy on 0.0.0.0:PORT (default 3100) in front of
// step1 (/), workflow-view (/workflow) and plan-doc (/plan), each a Next server on 127.0.0.1:PORT+1..3.
// `node serve.mjs dev` runs `next dev`; plain `node serve.mjs` runs `next start` (after `npm run build`).
// BASIC_AUTH_USER + BASIC_AUTH_PASSWORD protect every path except /healthz. Cross-site non-GET requests get 403 (CSRF).
import { spawn } from 'node:child_process';
import { createHash, timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';

const dev = process.argv[2] === 'dev';
const PORT = Number(process.env.PORT) || 3100;
const NEXT = path.join(import.meta.dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
// First match wins; step1 takes everything that is not /workflow or /plan.
const apps = [
  { dir: 'workflow-view', prefix: '/workflow', port: PORT + 2 },
  { dir: 'plan-doc', prefix: '/plan', port: PORT + 3 },
  { dir: 'step1', prefix: '', port: PORT + 1 },
];
const appFor = (url) => {
  const p = url.split('?')[0];
  return apps.find((a) => !a.prefix || p === a.prefix || p.startsWith(`${a.prefix}/`));
};

const { BASIC_AUTH_USER: user, BASIC_AUTH_PASSWORD: pass } = process.env;
if (!user !== !pass) {
  console.error('[serve] BASIC_AUTH_USER와 BASIC_AUTH_PASSWORD는 둘 다 넣거나 둘 다 비워야 해요.');
  process.exit(1);
}
// Fixed-length digests so timingSafeEqual never throws on a length mismatch and leaks nothing about it.
const sha = (s) => createHash('sha256').update(s).digest();
const expected = user ? sha(`${user}:${pass}`) : null;
const authorized = (req) => {
  if (!expected) return true;
  const m = /^Basic +([A-Za-z0-9+/=]+)$/i.exec(req.headers.authorization ?? '');
  return !!m && timingSafeEqual(sha(Buffer.from(m[1], 'base64').toString('utf8')), expected);
};
const CHALLENGE = 'Basic realm="Super Planer", charset="UTF-8"';

// ---------- children ----------
// Any child exiting takes the whole service down with a non-zero code, so the host restarts it.
let exitCode = null;
const children = apps.map((a) => {
  // Production: a 2MB young generation keeps the three servers ~25-30MB smaller on Render's 512MB plan (README 배포).
  const flags = dev ? [] : ['--max-semi-space-size=2'];
  const c = spawn(process.execPath, [...flags, NEXT, dev ? 'dev' : 'start', '-p', String(a.port), '-H', '127.0.0.1'], {
    cwd: path.join(import.meta.dirname, a.dir),
    stdio: 'inherit',
    env: { ...process.env, PORT: String(a.port), NEXT_TELEMETRY_DISABLED: '1' },
  });
  c.on('exit', (code, signal) => {
    if (exitCode === null) console.error(`[serve] ${a.dir} stopped (${signal ?? code}); stopping the rest`);
    stop(1);
  });
  return c;
});

function stop(code) {
  if (exitCode === null) {
    exitCode = code;
    for (const c of children) c.kill('SIGTERM');
    setTimeout(() => process.exit(exitCode), 5000).unref();
  }
  if (children.every((c) => c.exitCode !== null || c.signalCode !== null)) process.exit(exitCode);
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

// An app is up once its port accepts a connection; until then the proxy answers 502 and /healthz 503.
for (const a of apps) {
  const probe = () => {
    const s = net.connect(a.port, '127.0.0.1', () => {
      s.destroy();
      a.up = true;
    });
    s.on('error', () => setTimeout(probe, 300));
  };
  probe();
}

// ---------- proxy ----------
const HOP = new Set(['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'te', 'trailer']);
const forwarded = (req) => ({
  'x-forwarded-for': [req.headers['x-forwarded-for'], req.socket.remoteAddress].filter(Boolean).join(', '),
  'x-forwarded-proto': req.headers['x-forwarded-proto'] ?? 'http',
  'x-forwarded-host': req.headers['x-forwarded-host'] ?? req.headers.host ?? '',
});
const BOOTING = '<!doctype html><html lang="ko"><meta charset="utf-8"><meta http-equiv="refresh" content="2"><title>Super Planer</title><p>앱을 켜는 중이에요. 잠시 뒤 자동으로 다시 열어요.</p></html>';
const booting = (res) => res.writeHead(502, { 'content-type': 'text/html; charset=utf-8', 'retry-after': '2', 'cache-control': 'no-store' }).end(BOOTING);

const server = http.createServer((req, res) => {
  if (req.url === '/healthz' || req.url.startsWith('/healthz?')) {
    const ok = apps.every((a) => a.up);
    return res.writeHead(ok ? 200 : 503, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }).end(ok ? 'ok' : 'starting');
  }
  if (!authorized(req)) {
    return res.writeHead(401, { 'www-authenticate': CHALLENGE, 'content-type': 'text/plain; charset=utf-8' }).end('로그인이 필요해요.');
  }
  // CSRF: browsers attach cached Basic credentials to another site's form POST, which would start paid LLM/image calls.
  // Sec-Fetch-Site is set by the browser and cannot be forged by a page; requests without it (curl, old browsers) pass.
  const site = req.headers['sec-fetch-site'];
  if (req.method !== 'GET' && req.method !== 'HEAD' && site && site !== 'same-origin' && site !== 'none') {
    return res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' }).end('다른 사이트에서 보낸 요청은 받지 않아요.');
  }
  const app = appFor(req.url);
  if (!app.up) return booting(res);
  const headers = Object.fromEntries(Object.entries(req.headers).filter(([k]) => !HOP.has(k)));
  // agent: false = a fresh localhost connection per request, so no reused socket can be closed under us (no ECONNRESET race).
  const up = http.request(
    { host: '127.0.0.1', port: app.port, method: req.method, path: req.url, headers: { ...headers, ...forwarded(req) }, agent: false },
    (r) => {
      const out = Object.fromEntries(Object.entries(r.headers).filter(([k]) => !HOP.has(k)));
      res.writeHead(r.statusCode ?? 502, out);
      r.pipe(res);
    },
  );
  up.on('error', () => (res.headersSent ? res.destroy() : booting(res)));
  res.on('close', () => up.destroy()); // the browser left (or the response is done): drop the upstream request too
  req.pipe(up);
});

// WebSocket upgrades (next dev HMR): authenticate, then splice the two sockets together.
server.on('upgrade', (req, socket, head) => {
  socket.on('error', () => socket.destroy());
  if (!authorized(req)) return socket.end(`HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: ${CHALLENGE}\r\nConnection: close\r\n\r\n`);
  const app = appFor(req.url);
  const up = net.connect(app.port, '127.0.0.1', () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      if (!req.rawHeaders[i].toLowerCase().startsWith('x-forwarded-')) lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    }
    for (const [k, v] of Object.entries(forwarded(req))) lines.push(`${k}: ${v}`);
    up.write(`${lines.join('\r\n')}\r\n\r\n`);
    if (head.length) up.write(head);
    up.pipe(socket).pipe(up);
  });
  up.on('error', () => socket.destroy());
  socket.on('close', () => up.destroy());
});

server.listen(PORT, '0.0.0.0', () => console.log(`[serve] http://localhost:${PORT}  (/ step1, /workflow, /plan)${expected ? ', basic auth on' : ''}`));
