/**
 * Forgiving drill scoring.
 *
 * The governing principle of the Brain Gym rework: **forgive the DISPLAY,
 * keep the METRIC honest.**
 *
 * - `displayScore` is the warm, floored number a player sees on the results
 *   screen. It can never be 0/insulting, it always earns a colored badge, and
 *   it drives the gold floor + encouraging tone. Showing up is rewarded.
 * - `performanceScore` (0..100) is the HONEST signal. It is *not* floored — a
 *   wiped session returns a genuinely low number. This is what should feed the
 *   cognitive-domain rolling average so the Brain Score / radar / tiers stay
 *   truthful and the dashboard never becomes a participation trophy.
 *
 * Keeping these two numbers separate is the whole point. Wire `displayScore`
 * into UI + rewards; submit the raw/honest performance to the domain calc.
 *
 * Pure + framework-free so it can be unit-tested in isolation.
 *
 * @module shared/utils/drillScoring
 */

/** The 5-level target-score ladder every drill shares (mirrors LEVEL_CONFIGS). */
const LEVEL_TARGET_SCORES = [50, 100, 200, 350, 500];

export type DrillBadge = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface ForgivingScoreInput {
  /** Drill level 1..5. */
  level: number;
  /** Points actually earned during the drill (the harsh, real number). */
  rawScore: number;
  /** Words / combos / gems the player actually landed. */
  wordsFound: number;
  /** The goal for this drill (targetWords | targetCombo | targetRare | totalWords). */
  target: number;
  /** Breaks or lives lost this session. */
  setbacks: number;
  /** Max breaks / starting lives — the denominator for the setback ratio. */
  maxSetbacks: number;
}

export interface ForgivingScoreResult {
  /** Floored, player-facing, never 0. Drives UI + gold + badge + tone. */
  displayScore: number;
  /** Honest 0..100. Feeds the cognitive-domain metric. NOT floored. */
  performanceScore: number;
  /** Always colored — bronze is still a win. */
  badge: DrillBadge;
  /** The guaranteed "you showed up" portion of displayScore. */
  participation: number;
  /** The earned portion of displayScore (forgiving, partial-credit). */
  performance: number;
}

const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, n));

const levelTargetScore = (level: number): number =>
  LEVEL_TARGET_SCORES[clamp(Math.round(level), 1, 5) - 1];

/**
 * Map a 0..1 quality ratio to an always-present badge.
 * Never returns a falsy value — the floor is `bronze`, not "no badge".
 */
export function badgeForRatio(ratio: number): DrillBadge {
  if (ratio >= 0.85) return 'platinum';
  if (ratio >= 0.65) return 'gold';
  if (ratio >= 0.4) return 'silver';
  return 'bronze';
}

/**
 * Compute the forgiving display score + honest performance score + badge.
 *
 * displayScore = participation (level-scaled floor) + performance (forgiving,
 * with a 35% accuracy floor and at most a 35% survival haircut).
 * performanceScore = honest blend of score-ratio + accuracy minus a setback
 * haircut, clamped to 0..100, with NO floor.
 */
export function calculateForgivingDrillScore(
  input: ForgivingScoreInput
): ForgivingScoreResult {
  const { level, rawScore, wordsFound, target, setbacks, maxSetbacks } = input;

  const targetScore = levelTargetScore(level);
  const hasTarget = target > 0;
  const hasSetbackCap = maxSetbacks > 0;

  // ── Participation: guaranteed floor for showing up, scales with level ──
  const participation = Math.round((20 + level * 12) * 0.65);

  // ── Forgiving "earned" portion of the DISPLAY number ──
  // Accuracy never drops below 35% credit — partial effort still pays.
  const accuracyFloored = hasTarget
    ? Math.max(0.35, Math.min(1, wordsFound / target))
    : 0.35;
  const setbackRatio = hasSetbackCap ? Math.min(1, setbacks / maxSetbacks) : 0;
  const survival = 1 - setbackRatio * 0.35; // at most a 35% haircut
  const performance = Math.max(
    0,
    Math.round((rawScore * 0.7 + targetScore * 0.5 * accuracyFloored) * survival)
  );

  const displayScore = participation + performance;

  // ── Honest performance signal (0..100, un-floored) ──
  const scoreRatio = Math.min(1, rawScore / targetScore);
  const accuracyRatio = hasTarget ? Math.min(1, wordsFound / target) : 0;
  const perfRaw = 100 * (0.6 * scoreRatio + 0.4 * accuracyRatio);
  const setbackPenalty = setbackRatio * 20; // honest haircut, up to 20 pts
  const performanceScore = clamp(Math.round(perfRaw - setbackPenalty), 0, 100);

  // Badge reflects honest skill but is never gray/absent.
  const badge = badgeForRatio(performanceScore / 100);

  return { displayScore, performanceScore, badge, participation, performance };
}
