import { wf } from '@/lib/store';
import { fetchPreview, type Preview } from '@/lib/preview';
import { isHttpUrl, isImageUrl, hostOf } from '@/lib/urls';
import { bad } from '@/lib/http';

export const runtime = 'nodejs';

const ok = (p: Preview) => Response.json(p, { headers: { 'cache-control': 'private, max-age=3600' } });

const TTL_MS = 7 * 24 * 3600 * 1000;
const MAX_ROWS = 500;
// Outbound fetches per minute for this process; cache hits are free. Enough for a canvas full of links.
const FETCHES_PER_MIN = 30;
let win = { start: 0, count: 0 };
function allowFetch(now: number): boolean {
  if (now - win.start >= 60_000) win = { start: now, count: 0 };
  return ++win.count <= FETCHES_PER_MIN;
}

/** GET /api/preview?url= — og: metadata for a page URL, cached in wf_link_previews (7-day TTL, newest 500 rows). Image URLs are never fetched. */
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url') ?? '';
  if (url.length > 2048 || !isHttpUrl(url)) return bad('http 또는 https 주소만 미리 볼 수 있어요.');
  if (isImageUrl(url)) return ok({ url, kind: 'image', title: null, description: null, image: url, site: hostOf(url) });

  const d = wf();
  const hit = d.prepare('SELECT * FROM wf_link_previews WHERE url = ?').get(url);
  const now = Date.now();
  if (hit && now - Date.parse(hit.fetched_at as string) < TTL_MS) {
    return ok({
      url, kind: hit.kind === 'image' ? 'image' : 'page', title: (hit.title as string | null) ?? null,
      description: (hit.description as string | null) ?? null, image: (hit.image as string | null) ?? null, site: (hit.site as string | null) ?? null,
    });
  }
  if (!allowFetch(now)) return bad('미리보기 요청이 많아요. 잠시 뒤에 다시 시도해 주세요.', 429);
  try {
    const p = await fetchPreview(url);
    d.prepare(
      `INSERT INTO wf_link_previews (url, kind, title, description, image, site, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(url) DO UPDATE SET kind = excluded.kind, title = excluded.title, description = excluded.description,
       image = excluded.image, site = excluded.site, fetched_at = excluded.fetched_at`,
    ).run(url, p.kind, p.title, p.description, p.image, p.site, new Date(now).toISOString());
    d.prepare('DELETE FROM wf_link_previews WHERE url NOT IN (SELECT url FROM wf_link_previews ORDER BY fetched_at DESC LIMIT ?)').run(MAX_ROWS);
    return ok(p);
  } catch (e) {
    // shortcut: failures are not cached, so a dead link is re-fetched on every view; cache with a TTL if that gets slow
    return Response.json(
      { url, kind: 'page', title: null, description: null, image: null, site: hostOf(url), error: (e as Error).message.slice(0, 200) },
      { status: 200 },
    );
  }
}
