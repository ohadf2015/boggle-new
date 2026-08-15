/**
 * Server-side ghost-rival lookup for Quick Play.
 *
 * Split from `ghostRivals.ts` (which both game boards import) so the avatar
 * config generator never reaches the client bundle.
 */
import { getSeededAvatarConfig, hashString, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { pickGhostRivals, type QuickGhostRival } from './ghostRivals';

/** How many recent rows to draw the cohort from. */
const GHOST_CANDIDATE_LIMIT = 120;

type GhostDb = {
  from: (table: string) => any;
};

/**
 * Recent finishers on this mode, named from `public_profiles`.
 *
 * Never throws: a ghost fetch that fails must not stop a round from starting.
 * It is reported (silent no-op on error is forbidden here) and the round simply
 * runs without rivals.
 */
export async function fetchGhostRivals(
  db: GhostDb,
  mode: string,
  seed: string,
  onError?: (err: Error) => void
): Promise<QuickGhostRival[]> {
  try {
    const { data, error } = await db
      .from('quick_play_results')
      .select('user_id, score_pct')
      .eq('mode', mode)
      .gt('score_pct', 0)
      .order('created_at', { ascending: false })
      .limit(GHOST_CANDIDATE_LIMIT);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{ user_id: string; score_pct: number | string }>;
    if (rows.length === 0) return [];

    const picked = pickGhostRivals(
      rows.map((r) => ({ userId: r.user_id, name: '', scorePct: Number(r.score_pct) })),
      seed
    );
    if (picked.length === 0) return [];

    const { data: profiles } = await db
      .from('public_profiles')
      .select('id, username, avatar_config')
      .in(
        'id',
        picked.map((g) => g.userId)
      );

    const byId = new Map(
      ((profiles ?? []) as Array<{ id: string; username: string | null; avatar_config: unknown }>).map(
        (p) => [p.id, p]
      )
    );

    return picked
      .map((g): QuickGhostRival | null => {
        const p = byId.get(g.userId);
        if (!p?.username) return null;
        return {
          ...g,
          name: p.username,
          // Avatar falls back to a seeded face from `userId` — but the MP
          // leaderboard row passes no userId, so a config-less ghost would
          // render as a permanent skeleton. Resolve the same seeded face here
          // (server side, so the generator stays out of the client bundle).
          customAvatar: (p.avatar_config as CustomAvatarConfig | null) ?? getSeededAvatarConfig(hashString(g.userId)),
        };
      })
      .filter((g): g is QuickGhostRival => g !== null);
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
    return [];
  }
}
