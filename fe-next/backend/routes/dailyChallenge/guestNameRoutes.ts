import type { Request, Response } from 'express';
import { getSupabase, isSupabaseConfigured } from '../../modules/supabaseServer';
import logger from '../../utils/logger';
import { isProfane } from '../../utils/profanityFilter';
import { isDefaultPlayerName } from '@/utils/defaultPlayerNames';
import { sanitizeGuestDisplayName } from './utils';
import { GUEST_COOKIE, verifyGuestToken } from '@/lib/auth/guestCookie';

// ponytail: classic daily_puzzle_attempts left out — its leaderboard is Redis-cached and would need invalidation
const GUEST_NAME_TABLES = ['daily_word_hunt_attempts', 'daily_word_wheel_attempts'] as const;
// Each of these keys its guest rows on a different id, so each gets its own lookup.
const TOWER_TABLE = 'daily_word_tower_attempts';
const BRIDGE_TABLE = 'connections_daily_scores';

function signedGuestId(cookieHeader: string | undefined): string | null {
  const prefix = `${GUEST_COOKIE}=`;
  const raw = cookieHeader?.split(';').map((c) => c.trim()).find((c) => c.startsWith(prefix));
  if (!raw) return null;
  let id: string | null = null;
  try {
    id = verifyGuestToken(decodeURIComponent(raw.slice(prefix.length)));
  } catch {
    id = null;
  }
  // A cookie Next signed that Express can't verify means the two disagree on the secret.
  if (!id) logger.warn('DAILY', 'guest-name: lc_guest cookie failed verification; Word Bridge rows not renamed');
  return id;
}

/**
 * POST /api/daily-challenge/guest-name
 * Renames every daily leaderboard row of a guest. Keyed on the client fingerprint,
 * the same trust boundary /submit already uses for guest writes.
 */
export async function renameGuestDailyName(req: Request, res: Response): Promise<void> {
  const { guestFingerprint, towerFingerprint, displayName } = (req.body ?? {}) as {
    guestFingerprint?: unknown;
    towerFingerprint?: unknown;
    displayName?: unknown;
  };

  if (typeof guestFingerprint !== 'string' || !guestFingerprint) {
    res.status(400).json({ error: 'guestFingerprint required' });
    return;
  }
  const name = sanitizeGuestDisplayName(displayName, '');
  if (!name) {
    res.status(400).json({ error: 'invalid_name' });
    return;
  }
  if (isProfane(name)) {
    res.status(400).json({ error: 'profane' });
    return;
  }

  if (isDefaultPlayerName(name)) {
    res.status(400).json({ error: 'default_name' });
    return;
  }

  const supabase = isSupabaseConfigured() ? getSupabase() : null;
  if (!supabase) {
    res.status(503).json({ error: 'Service not available' });
    return;
  }

  const targets: Array<[string, string]> = GUEST_NAME_TABLES.map((table) => [table, guestFingerprint]);
  if (typeof towerFingerprint === 'string' && towerFingerprint) targets.push([TOWER_TABLE, towerFingerprint]);
  // Word Bridge guest rows are keyed on the server-signed cookie, never on anything the client sends.
  const bridgeGuestId = signedGuestId(req.headers.cookie);
  if (bridgeGuestId) targets.push([BRIDGE_TABLE, bridgeGuestId]);

  const results = await Promise.all(
    targets.map(([table, guestId]) =>
      supabase.from(table).update({ display_name: name }).eq('guest_fingerprint', guestId).is('player_id', null),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed) {
    logger.error('DAILY', 'guest-name update failed', failed.error);
    res.status(500).json({ error: 'update_failed' });
    return;
  }

  res.json({ displayName: name });
}
