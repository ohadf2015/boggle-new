/**
 * XP-by-mode attribution (read-time estimate).
 *
 * XP is stored as a single global total (`profiles.total_xp`); it is never recorded
 * per mode. We estimate each mode's XP from the player's `game_results` history using
 * the same base weights the XP system uses.
 *
 * IMPORTANT — `game_results` only logs the *competitive* flow (classic, word-hunt,
 * blast, wheel-rush, word-tower). A large share of `total_xp` comes from paths that
 * never write a row: single-player adventure/blast/drills/daily, education/practice,
 * and all bonus XP (missions, quests, login calendar). So we must NOT normalize the
 * logged modes up to `total_xp` — that would smear all that XP onto the competitive
 * modes. Instead we estimate each logged mode's *absolute* XP and surface the
 * remainder as an explicit "Other" slice. Σ(all slices incl. Other) === total_xp.
 *
 * Per-game weight mirrors `XP_CONFIG.GAME_COMPLETION` (50) and
 * `XP_CONFIG.SCORE_MULTIPLIER` (0.15) from `backend/modules/xpManager.ts`; kept in
 * sync by `xpByMode.weights.test.ts`. This is a deliberate rough proxy — it ignores
 * per-game caps, daily decay, level diminishing, and the prestige multiplier (all
 * unreconstructable from aggregated history).
 */

/** Per-mode aggregate read from `game_results`. */
export interface ModeAggregate {
  mode: string;
  games: number;
  score: number;
}

/** A mode's estimated slice of the player's total XP. */
export interface ModeXpSlice {
  mode: string;
  xp: number;
  /** Fraction of total XP (0..1). */
  share: number;
}

export const XP_WEIGHT_PER_GAME = 50;
export const XP_WEIGHT_PER_SCORE = 0.15;

/** Sentinel mode id for XP earned outside the competitive game_results flow. */
export const OTHER_MODE = '__other__';

function estimatedXp(row: ModeAggregate): number {
  return row.games * XP_WEIGHT_PER_GAME + row.score * XP_WEIGHT_PER_SCORE;
}

/**
 * Estimate the player's XP split across modes, with an explicit "Other" slice for
 * XP earned outside the logged competitive flow. Real modes sorted by xp desc,
 * Other always last. All slices sum exactly to `totalXp`. Returns [] when there's
 * nothing meaningful to show.
 */
export function splitXpByMode(rows: ModeAggregate[], totalXp: number): ModeXpSlice[] {
  if (totalXp <= 0) return [];

  const estimated = rows
    .map((row) => ({ mode: row.mode, xp: estimatedXp(row) }))
    .filter((e) => e.xp > 0);

  const attributedTotal = estimated.reduce((acc, e) => acc + e.xp, 0);
  if (attributedTotal <= 0) return [];

  // If our pre-cap estimate exceeds the real total (caps/diminishing reduced the
  // actual award), scale the modes down to fit — there's no room for an Other slice.
  const scale = attributedTotal > totalXp ? totalXp / attributedTotal : 1;

  const modes: ModeXpSlice[] = estimated
    .map((e) => {
      const xp = Math.round(e.xp * scale);
      return { mode: e.mode, xp, share: xp / totalXp };
    })
    .sort((a, b) => b.xp - a.xp);

  // Remainder is XP from solo + bonus sources not present in game_results.
  let otherXp = totalXp - modes.reduce((acc, s) => acc + s.xp, 0);

  if (otherXp < 0) {
    // Only from rounding in the scaled case — trim the largest mode so the parts fit.
    if (modes.length > 0) modes[0].xp += otherXp;
    otherXp = 0;
  }

  // Recompute shares after any drift adjustment.
  for (const s of modes) s.share = s.xp / totalXp;

  if (otherXp > 0) {
    modes.push({ mode: OTHER_MODE, xp: otherXp, share: otherXp / totalXp });
  }

  return modes;
}
