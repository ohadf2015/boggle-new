import type { Request } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookieAccessToken } from '../../../lib/auth/getAuthedUser';
export { fetchTestAccountIds as testAccountIds } from '../../../lib/leaderboard/testAccountIds';

const LOOKUP_CAP_MS = 1_000;

export type BoardRow = Record<string, unknown> & { player_id?: string | null; guest_fingerprint?: string | null };

export interface Viewer { playerId: string | null; guestFingerprint: string | null }

/** Resolves to null when the work fails or outlives the cap, so a slow lookup never holds the board. */
export function capped<T>(work: PromiseLike<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    Promise.resolve(work),
    new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), LOOKUP_CAP_MS); }),
  ]).catch(() => null).finally(() => clearTimeout(timer));
}

/** QA accounts never rank on a public board. Fails open: a slow or failed lookup keeps every row. */
export async function excludeTestAccounts<T extends BoardRow>(supabase: SupabaseClient, rows: T[]): Promise<T[]> {
  const ids = [...new Set(rows.map(r => r.player_id).filter((id): id is string => !!id))];
  if (ids.length === 0) return rows;
  const lookup = await capped(supabase.from('profiles').select('id, is_test_account').in('id', ids));
  if (!lookup || lookup.error) return rows;
  const test = new Set(((lookup.data ?? []) as Array<{ id: string; is_test_account?: boolean | null }>)
    .filter(p => p.is_test_account === true).map(p => p.id));
  return test.size === 0 ? rows : rows.filter(r => !r.player_id || !test.has(r.player_id));
}

function queryString(req: Request, key: string): string | null {
  const v = req.query[key];
  return typeof v === 'string' && v ? v : null;
}

/** Who is asking, so a caller below the cut still sees their own row. Null for an anonymous read. */
export async function resolveViewer(req: Request, supabase: SupabaseClient): Promise<Viewer | null> {
  const fp = queryString(req, 'fp') ?? queryString(req, 'guestFingerprint');
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ')
    ? auth.slice(7)
    : await cookieAccessToken({ headers: { get: (name: string) => (req.headers[name.toLowerCase()] as string | undefined) ?? null } } as never).catch(() => null);
  if (token) {
    const result = await capped(supabase.auth.getUser(token));
    const id = result && !result.error ? result.data?.user?.id ?? null : null;
    if (id) return { playerId: id, guestFingerprint: null };
  }
  return fp ? { playerId: null, guestFingerprint: fp } : null;
}

export const isViewer = (row: BoardRow, v: Viewer) =>
  v.playerId ? row.player_id === v.playerId : !row.player_id && row.guest_fingerprint === v.guestFingerprint;
