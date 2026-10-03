import type { Request, Response } from 'express';
import { getSupabase, isSupabaseConfigured } from '../../modules/supabaseServer';
import logger from '../../utils/logger';
import { isProfane } from '../../utils/profanityFilter';
import { sanitizeGuestDisplayName } from './utils';

// ponytail: classic daily_puzzle_attempts left out — its leaderboard is Redis-cached and would need invalidation
const GUEST_NAME_TABLES = ['daily_word_hunt_attempts', 'daily_word_wheel_attempts'] as const;

/**
 * POST /api/daily-challenge/guest-name
 * Renames every daily leaderboard row of a guest. Keyed on the client fingerprint,
 * the same trust boundary /submit already uses for guest writes.
 */
export async function renameGuestDailyName(req: Request, res: Response): Promise<void> {
  const { guestFingerprint, displayName } = (req.body ?? {}) as { guestFingerprint?: unknown; displayName?: unknown };

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

  const supabase = isSupabaseConfigured() ? getSupabase() : null;
  if (!supabase) {
    res.status(503).json({ error: 'Service not available' });
    return;
  }

  const results = await Promise.all(
    GUEST_NAME_TABLES.map((table) =>
      supabase.from(table).update({ display_name: name }).eq('guest_fingerprint', guestFingerprint).is('player_id', null),
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
