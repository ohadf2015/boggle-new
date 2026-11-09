/**
 * Server-side ghost-rival lookup for Quick Play.
 *
 * Split from `ghostRivals.ts` (which both game boards import) so the avatar
 * config generator never reaches the client bundle.
 */
import { getSeededAvatarConfig, hashString, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { pickGhostRivals, GHOST_COUNT, type QuickGhostRival } from './ghostRivals';
import { computeScoreBands, padRivalsWithSynthetic } from './syntheticRivals';
import { shownPlayerName } from '@/lib/friendlyPlayerName';

/**
 * Rounds from this moment on are scored against the 60-second par
 * (quickPlayRound.parScoreForMode). Older rows were % of the solver perfect —
 * 0-5% for everyone — so they would read as near-zero rivals on today's scale.
 */
export const PAR_SCALE_SINCE = '2026-11-08T00:00:00Z';

/** How many recent rows to draw the cohort from. */
const GHOST_CANDIDATE_LIMIT = 120;

type GhostDb = {
  from: (table: string) => any;
};

/**
 * Recent finishers on this mode, named from `public_profiles`, padded with
 * synthetic rivals to guarantee GHOST_COUNT total.
 *
 * Synthetic rivals anchor to the player's recent level so one is catchable
 * and one is a stretch, rather than fixed bands that feel canned.
 *
 * Never throws: a ghost fetch that fails must not stop a round from starting.
 * It is reported (silent no-op on error is forbidden here) and the round always
 * returns GHOST_COUNT rivals, synthetic if needed.
 */
export async function fetchGhostRivals(
  db: GhostDb,
  mode: string,
  seed: string,
  onError?: (err: Error) => void,
  /**
   * The requesting player, excluded from their own cohort — otherwise you race
   * your own past runs under your own name. Filtered in SQL, not after: the
   * candidate window is a fixed 120 most-recent rows, and the person playing
   * right now owns most of them, so post-filtering would spend the whole budget
   * on rows it discards and leave few real rivals. Null/undefined for guests.
   */
  excludeUserId?: string | null,
  language: string = 'en',
  /**
   * Player's trailing average score_pct (0 when unknown, e.g. first round).
   * Used to anchor synthetic rival bands so one is clearly below, one near,
   * one clearly above the player's level. Guests included via localStorage.
   */
  recentPct: number = 0
): Promise<QuickGhostRival[]> {
  try {
    let query = db
      .from('quick_play_results')
      .select('user_id, score_pct')
      .eq('mode', mode)
      .gt('score_pct', 0)
      .gte('created_at', PAR_SCALE_SINCE);
    if (excludeUserId) query = query.neq('user_id', excludeUserId);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(GHOST_CANDIDATE_LIMIT);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{ user_id: string; score_pct: number | string }>;

    // Compute score bands from the real data for synthetic rival generation.
    const bands = computeScoreBands(rows.map((r) => ({ scorePct: Number(r.score_pct) })));

    const picked = pickGhostRivals(
      rows.map((r) => ({ userId: r.user_id, name: '', scorePct: Number(r.score_pct) })),
      seed
    );

    // If we have no real rivals, we still need to return something. Bail early
    // and let the padding step return pure synthetics.
    if (picked.length === 0) {
      return padRivalsWithSynthetic([], GHOST_COUNT, seed, bands, language, recentPct);
    }

    const { data: profiles } = await db
      .from('public_profiles')
      .select('id, username, display_name, avatar_config')
      .in(
        'id',
        picked.map((g) => g.userId)
      );

    const byId = new Map(
      ((profiles ?? []) as Array<{ id: string; username: string | null; display_name?: string | null; avatar_config: unknown }>).map(
        (p) => [p.id, p]
      )
    );

    // Most profiles were never named (username is the `Player_<hex>` default),
    // so the shown name is the chosen one or a readable stand-in, never the id.
    const taken = new Set<string>();
    const realRivals = picked
      .map((g): QuickGhostRival | null => {
        const p = byId.get(g.userId);
        if (!p) return null;
        return {
          ...g,
          name: shownPlayerName(p, language, taken),
          // Avatar falls back to a seeded face from `userId` — but the MP
          // leaderboard row passes no userId, so a config-less ghost would
          // render as a permanent skeleton. Resolve the same seeded face here
          // (server side, so the generator stays out of the client bundle).
          customAvatar: (p.avatar_config as CustomAvatarConfig | null) ?? getSeededAvatarConfig(hashString(g.userId)),
        };
      })
      .filter((g): g is QuickGhostRival => g !== null);

    // Pad with synthetic rivals to guarantee GHOST_COUNT total.
    return padRivalsWithSynthetic(realRivals, GHOST_COUNT, seed, bands, language, recentPct);
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
    // Even on error, return synthetic rivals so the round never fails.
    const fallbackBands = computeScoreBands([]);
    return padRivalsWithSynthetic([], GHOST_COUNT, seed, fallbackBands, language, recentPct);
  }
}
