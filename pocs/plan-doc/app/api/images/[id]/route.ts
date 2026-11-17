import fs from 'node:fs/promises';
import path from 'node:path';
import { sniffImage } from '@/lib/images';
import { UPLOAD_DIR } from '@/lib/schema';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return new Response('잘못된 이미지 id', { status: 400 });
  const bytes = await fs.readFile(path.join(UPLOAD_DIR, id)).catch(() => null);
  if (!bytes) return new Response('이미지를 찾지 못했어요', { status: 404 });
  const type = sniffImage(bytes);
  if (!type) return new Response('지원하지 않는 형식', { status: 415 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': type,
      // private: the site sits behind Basic auth, so no shared cache may keep a copy
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
}
