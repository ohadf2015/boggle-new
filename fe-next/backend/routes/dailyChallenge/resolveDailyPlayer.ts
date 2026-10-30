import type { Request } from 'express';
import { getSupabase } from '../../modules/supabaseServer';
import { cookieAccessToken } from '../../../lib/auth/getAuthedUser';

export type DailyPlayerResolution = { ok: true; playerId: string | null } | { ok: false; status: 401 };

/** A body `playerId` is only trusted when it matches the caller's verified session; guests (no playerId) pass through. */
export async function resolveDailyPlayer(req: Pick<Request, 'headers'>, bodyPlayerId: string | undefined | null): Promise<DailyPlayerResolution> {
  if (!bodyPlayerId) return { ok: true, playerId: null };

  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ')
    ? auth.slice(7)
    : await cookieAccessToken({ headers: { get: (name: string) => (req.headers[name.toLowerCase()] as string | undefined) ?? null } } as never);
  if (!token) return { ok: false, status: 401 };

  const supabase = getSupabase();
  if (!supabase) return { ok: false, status: 401 };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || data?.user?.id !== bodyPlayerId) return { ok: false, status: 401 };
  return { ok: true, playerId: data.user.id };
}
