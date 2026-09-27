/**
 * Ghost rivals — the "other players" a solo quick round races against.
 *
 * Quick Play runs the MULTIPLAYER boards solo. Those boards already own a full
 * race UI (mobile rank rail, live standings, closest-rivals gap) that switches
 * on the moment the leaderboard has more than one row — so a race needs no new
 * UI, only more rows. These are those rows.
 *
 * Two facts shape the design:
 *  - Round seeds are per-round UUIDs (see quickPlayRound.buildQuickRound), so a
 *    same-BOARD cohort would always be empty. The comparison axis is instead
 *    `score_pct` — how much of that board's solver-perfect a player took — which
 *    remaps cleanly onto MY board via my own perfectScore.
 *  - Only final scores are persisted; there is no per-second trace to replay.
 *    So the in-round curve is synthesized (see ghostPaceFactor).
 *
 * NOT the same thing as `ghostRivalManager` / `/api/ghost-rival`, which is the
 * WEEKLY cumulative-points rivalry shown on the results screen. These ghosts
 * live and die inside one round.
 */
import { hashString } from '@/utils/dailyChallenge/prng';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface QuickGhostRival {
  userId: string;
  name: string;
  customAvatar?: CustomAvatarConfig | null;
  /** Their finished round as a share of solver-perfect, 0-100. */
  scorePct: number;
}

/** A leaderboard row in the shape both MP boards (InGameScreen / BlastStage) read. */
export interface GhostRow {
  username: string;
  score: number;
  wordsFound: number;
  /** Quick Play's existing rows use `wordCount`; blast reads that name. */
  wordCount: number;
  /** `undefined`, never null — the MP Avatar prop rejects null. */
  avatar: { customAvatar?: CustomAvatarConfig };
  /** Marks a synthesized opponent — never a live socket player. */
  isGhost: true;
}

export const GHOST_COUNT = 3;
/**
 * Three rivals spread across the skill range — one weak-ish, one mid, one
 * strong — so the round has both a rival you can catch and one to chase.
 * Seed-derived within each band so consecutive rounds show different faces
 * while a re-fetch of the SAME round shows the same ones.
 */
export function pickGhostRivals(
  candidates: QuickGhostRival[],
  seed: string,
  count: number = GHOST_COUNT
): QuickGhostRival[] {
  const best = new Map<string, QuickGhostRival>();
  for (const c of candidates) {
    if (!c || !(c.scorePct > 0)) continue;
    const prev = best.get(c.userId);
    if (!prev || c.scorePct > prev.scorePct) best.set(c.userId, c);
  }

  const pool = [...best.values()].sort((a, b) => a.scorePct - b.scorePct);
  if (pool.length <= count) return pool;

  const h = hashString(seed);
  const band = pool.length / count;
  return Array.from({ length: count }, (_, i) => {
    const start = Math.floor(i * band);
    const end = Math.max(start + 1, Math.floor((i + 1) * band));
    return pool[start + ((h + i * 7) % (end - start))];
  });
}

/**
 * ponytail: no per-second score trace is stored, so the in-round curve is
 * synthesized. A mild ease-out beats linear because real players clear the easy
 * words first and slow as the board thins — a linear ghost feels robotic and
 * always passes you at the same moment. Upgrade path: persist a coarse
 * score-vs-time array on submit and replay it verbatim.
 */
const GHOST_PACE_EXPONENT = 0.72;

export function ghostPaceFactor(progress: number): number {
  if (!Number.isFinite(progress) || progress <= 0) return 0;
  if (progress >= 1) return 1;
  return progress ** GHOST_PACE_EXPONENT;
}

export interface BuildGhostRowsOptions {
  /**
   * Solver-perfect for MY board — the ghost's score_pct is remapped onto it.
   * Same axis on both sides: `score_pct` is recorded in quickPlaySubmit as the
   * player's own submitted score over that round's perfectScore, so a ghost's
   * number is what a real player did on comparable terms. One known distortion:
   * that pct is clamped at 100, so a player who beat solver-perfect (combos, or
   * a blast cascade — blast accepts up to 3x) is stored as exactly 100 and their
   * ghost under-reads.
   */
  perfectScore: number;
  totalWords: number;
  /** 0-1 through the round clock. */
  progress: number;
  /** My own leaderboard username; rank matching is by string, so no collisions. */
  selfUsername: string;
}

export function buildGhostRows(
  ghosts: QuickGhostRival[],
  { perfectScore, totalWords, progress, selfUsername }: BuildGhostRowsOptions
): GhostRow[] {
  const pace = ghostPaceFactor(progress);
  return ghosts
    .filter((g) => g.name && g.name !== selfUsername)
    .map((g) => {
      const share = (g.scorePct / 100) * pace;
      const words = Math.round(totalWords * share);
      return {
        username: g.name,
        score: Math.round(perfectScore * share),
        wordsFound: words,
        wordCount: words,
        avatar: { customAvatar: g.customAvatar ?? undefined },
        isGhost: true as const,
      };
    });
}

/** The wheel's rival shape (WordWheelGame's `rivals` prop). */
export interface WheelRival {
  name: string;
  score: number;
  avatarImage: string | null;
  customAvatar: CustomAvatarConfig | null;
  playerId: string | null;
  guestFingerprint: string | null;
}

/**
 * Wheel rivals are FINISHED scores, not live racers: the wheel's pill reads
 * "N points to pass {name}", and its daily cohort is likewise a board of
 * completed runs. So no pacing here — the ghost's full remapped score is the
 * target, which is exactly the existing idiom.
 */
export function ghostsToWheelRivals(
  ghosts: QuickGhostRival[],
  perfectScore: number,
  /**
   * My own row's label, when the caller prepends one (word hunt does; the wheel
   * does not). Rank matching downstream is by username string, so a real player
   * who happens to be named like the label would otherwise count as me twice.
   */
  selfUsername?: string
): WheelRival[] {
  return ghosts
    .map((g) => ({
      name: g.name,
      score: Math.round(perfectScore * (g.scorePct / 100)),
      avatarImage: null,
      customAvatar: g.customAvatar ?? null,
      playerId: g.userId,
      guestFingerprint: null,
    }))
    .filter((r) => r.name && r.score > 0 && r.name !== selfUsername)
    .sort((a, b) => a.score - b.score);
}
