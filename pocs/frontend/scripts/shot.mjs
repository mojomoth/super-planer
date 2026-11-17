// Usage: node scripts/shot.mjs [id-or-prefix...] [--tag <tag>]
// Captures each route at its draft's size into .shots/<id>[-tag].png and a side-by-side
// .shots/<id>[-tag]-compare.png (draft left, implementation right). Starts `next dev -p 3200` if needed.
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRAFTS = path.resolve(ROOT, "../../docs/drafts");
const OUT = path.join(ROOT, ".shots");
const PORT = 3200;
const BASE = `http://localhost:${PORT}`;

const SCREENS = [
  { id: "01-prompt-entry", route: "/", w: 1586, h: 992 },
  { id: "02-guided-questions", route: "/questions", w: 1586, h: 992 },
  { id: "03-workflow-canvas", route: "/workflow", w: 1586, h: 992 },
  { id: "04-expanded-node-chat", route: "/workflow/node", w: 1717, h: 916 },
  { id: "05-plan-document-preview", route: "/document", w: 1586, h: 992 },
];

const args = process.argv.slice(2);
const tagAt = args.indexOf("--tag");
const tag = tagAt >= 0 ? args.splice(tagAt, 2)[1] : "";
const screens = args.length ? SCREENS.filter((s) => args.some((a) => s.id.startsWith(a))) : SCREENS;
if (!screens.length) throw new Error(`unknown id: ${args.join(" ")} (ids: ${SCREENS.map((s) => s.id).join(", ")})`);

const up = () => fetch(BASE, { signal: AbortSignal.timeout(5000) }).then(() => true, () => false);
const portBusy = () =>
  new Promise((resolve) => {
    const sock = net.connect(PORT, "127.0.0.1", () => (sock.destroy(), resolve(true)));
    sock.on("error", () => resolve(false));
  });

async function ensureServer() {
  fs.mkdirSync(OUT, { recursive: true });
  const lock = path.join(OUT, "dev.lock");
  const deadline = Date.now() + 180_000;
  while (!(await up())) {
    if (Date.now() > deadline) throw new Error(`dev server on ${PORT} did not respond; see .shots/dev.log`);
    try {
      // a lock older than 90s belongs to a starter that died
      if (Date.now() - fs.statSync(lock).mtimeMs > 90_000) fs.rmSync(lock, { force: true });
    } catch {}
    // Only the caller that wins the exclusive lock on a free port starts the server; others just wait.
    if (!(await portBusy())) {
      try {
        fs.writeFileSync(lock, String(process.pid), { flag: "wx" });
        const log = fs.openSync(path.join(OUT, "dev.log"), "a");
        spawn(path.join(ROOT, "node_modules/.bin/next"), ["dev", "-p", String(PORT)], {
          cwd: ROOT,
          detached: true,
          stdio: ["ignore", log, log],
        }).unref();
        console.log(`started next dev on ${PORT} (log: .shots/dev.log)`);
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  fs.rmSync(lock, { force: true });
}

await ensureServer();
fs.mkdirSync(OUT, { recursive: true });
// headless defaults to --hide-scrollbars, which hides even styled scrollbars the drafts show
const browser = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
try {
  for (const s of screens) {
    const name = s.id + (tag ? `-${tag}` : "");
    const shot = path.join(OUT, `${name}.png`);
    const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 });
    await page.goto(BASE + s.route, { waitUntil: "networkidle", timeout: 180_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: shot });
    await page.close();

    const draft = path.join(DRAFTS, `${s.id}.png`);
    const gap = 16;
    await sharp({ create: { width: s.w * 2 + gap, height: s.h, channels: 3, background: "#d4d4d8" } })
      .composite([
        { input: await sharp(draft).resize({ height: s.h }).toBuffer(), left: 0, top: 0 },
        { input: shot, left: s.w + gap, top: 0 },
      ])
      .png()
      .toFile(path.join(OUT, `${name}-compare.png`));
    console.log(`${s.id} ${s.route} -> .shots/${name}.png, .shots/${name}-compare.png`);
  }
} finally {
  await browser.close();
}
