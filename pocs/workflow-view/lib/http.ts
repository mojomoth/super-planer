// Small helpers for route handlers: JSON-only bodies (a cross-site form post cannot send application/json without a preflight).

export const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function jsonBody(req: Request): Promise<Record<string, unknown> | null> {
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return null;
  try {
    const b: unknown = await req.json();
    return b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Trimmed string within [min, max] chars, else null. */
export function str(v: unknown, min: number, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length >= min && s.length <= max ? s : null;
}

export const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e6 ? v : null);
