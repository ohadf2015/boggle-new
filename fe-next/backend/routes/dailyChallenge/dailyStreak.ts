import { getSupabase } from '../../modules/supabaseServer';
import { computeCurrentStreak } from '../../../lib/daily/weeklyChest';

/**
 * Read a player's or guest's daily streak, on the same rules an authenticated
 * player already gets from GET /api/daily/weekly-chest/status: the full
 * consecutive-day run across all three daily modes (classic puzzle, Word Hunt,
 * Word Wheel), via the same `computeCurrentStreak` used there — see
 * fe-next/lib/daily/weeklyChest.ts and fe-next/app/api/daily/weekly-chest/status/route.ts.
 *
 * `word_hunt_player_stats` (current_streak/longest_streak columns, migrations
 * 020/067) is NOT used here: verified directly against the live database that
 * the table doesn't exist and no trigger calls update_word_hunt_player_stats()
 * — it's an orphaned function left behind by a migration that was never
 * actually wired up. The /check-played read that used to hit it (guarded by
 * `if (playerId)`) was already dead for authenticated players too; this
 * replaces it with the mechanism the product's "day N" fire icon actually
 * uses today, extended to accept a guest_fingerprint the same as a player_id.
 *
 * Guests don't get streak-freeze bridging (daily_streak_freezes and
 * player_engagement are player_id-only tables — no guest_fingerprint column),
 * so an authenticated caller of this same endpoint may occasionally read one
 * lower than the fire icon on a day a freeze is actively bridging a gap. That
 * is a disclosed simplification, not a fabricated number — it only ever
 * under-reports a real, unfrozen gap.
 */
export async function fetchDailyStreak(
  supabase: ReturnType<typeof getSupabase>,
  idColumn: 'player_id' | 'guest_fingerprint',
  idValue: string
): Promise<{ currentStreak: number; lastPlayedDate: string | null }> {
  const today = new Date().toISOString().split('T')[0];

  const [puzzleRes, huntRes, wheelRes] = await Promise.all([
    supabase!.from('daily_puzzle_attempts').select('puzzle_date').eq(idColumn, idValue).gt('word_count', 0),
    // Catch-up replays count: a missed day replayed inside the window repairs
    // the streak (it only lengthens the current run when it fills a gap).
    supabase!.from('daily_word_hunt_attempts').select('puzzle_date').eq(idColumn, idValue).eq('solved', true),
    supabase!.from('daily_word_wheel_attempts').select('puzzle_date').eq(idColumn, idValue).gt('word_count', 0),
  ]);

  const allDates = [
    ...(puzzleRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
    ...(huntRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
    ...(wheelRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
  ];

  const currentStreak = computeCurrentStreak(allDates, today);
  const lastPlayedDate = allDates.length > 0 ? allDates.reduce((max, d) => (d > max ? d : max)) : null;

  return { currentStreak, lastPlayedDate };
}
