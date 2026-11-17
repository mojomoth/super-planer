import fs from 'node:fs/promises';
import path from 'node:path';
import { UPLOAD_DIR } from '@/lib/db';
import { wf } from '@/lib/store';

export const runtime = 'nodejs';

/** GET /api/images/<id>: an image generated for an agent answer (lib/imagegen.ts). Only ids in wf_images, never other files in UPLOAD_DIR. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return new Response('잘못된 이미지 id', { status: 400 });
  const row = wf().prepare('SELECT mime FROM wf_images WHERE id = ?').get(id) as { mime: string } | undefined;
  const bytes = row && (await fs.readFile(path.join(UPLOAD_DIR, id)).catch(() => null));
  if (!row || !bytes) return new Response('이미지를 찾지 못했어요', { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': row.mime,
      // private: the site sits behind Basic auth, so no shared cache may keep a copy
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
}
