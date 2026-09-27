/**
 * Synthetic ghost rivals — fill the field when real data is sparse.
 *
 * Quick Play boards always need GHOST_COUNT rivals (see ghostRivals.ts).
 * When real `quick_play_results` rows are too few, we generate synthetic
 * rivals from the bot names + seeded avatars to guarantee a competitive field.
 *
 * Synthetic rivals are marked with userIds prefixed "synthetic:" so they never
 * collide with real UUIDs. They use difficulty-appropriate bot names and carry
 * seeded avatars so they render as people, not skeletons.
 */
import { getSeededAvatarConfig, hashString } from '@/shared/types/customAvatar';
import type { QuickGhostRival } from './ghostRivals';
import { BOT_CONFIG, type LanguageBotNames } from '@/backend/modules/botConfig';

/**
 * Score percentile bands for synthetic rivals — derived from real
 * `quick_play_results` distribution when available, with a fallback
 * for when the table is sparse.
 *
 * Bands map to easy/medium/hard difficulty bands, so a synthetic rival
 * is one the player can catch and one to chase relative to the mode's
 * real distribution.
 *
 * Fallback: measured on 2026-08-18 with N=1 real row (scorePct 1–4).
 * Once ≥8 rows per mode exist, recompute these bands from live data.
 * Goal: [weak-ish, mid, strong] so round has both catchable + stretch.
 */
const DEFAULT_SCORE_BANDS = {
  weak: 30,     // Weak but not zero — something to catch
  medium: 60,   // Mid: reasonable player
  strong: 85,   // Strong: something to chase
};

/** Minimum real rows before we trust the distribution — otherwise use fallback. */
const MIN_ROWS_FOR_DISTRIBUTION = 8;

export interface ScoreBands {
  weak: number;
  medium: number;
  strong: number;
}

/**
 * Compute score percentile bands from real data when sufficient rows exist.
 * Returns the fallback when data is sparse.
 */
export function computeScoreBands(realRows: Array<{ scorePct: number }>): ScoreBands {
  if (realRows.length < MIN_ROWS_FOR_DISTRIBUTION) {
    return DEFAULT_SCORE_BANDS;
  }

  const scores = realRows.map((r) => r.scorePct).sort((a, b) => a - b);
  const len = scores.length;
  return {
    weak: scores[Math.floor(len * 0.33)],
    medium: scores[Math.floor(len * 0.67)],
    strong: scores[Math.floor(len * 0.95)],
  };
}

/**
 * Apply seeded jitter to a score so it's not identical every round.
 * Derived from seed + index, deterministic, ±8 points max.
 */
function applyJitter(basePct: number, seed: string, index: number): number {
  const h = hashString(`${seed}:jitter:${index}`);
  const jitter = ((h % 17) - 8); // ±8 points
  return Math.max(1, Math.min(99, basePct + jitter));
}

/**
 * Shift score bands to anchor one rival below the player, one near, one above.
 * When recentPct is 0 or absent, returns bands unchanged.
 * ponytail: naive anchor—mid ± player delta; better design would use
 * the actual distribution, but this works for the measured solo-player behavior.
 */
function anchorBandsToPlayerLevel(
  bands: ScoreBands,
  recentPct: number
): ScoreBands {
  if (!recentPct || recentPct <= 0) return bands;

  // Shift bands so the middle band centers near the player's level.
  // weak → player - 30, medium → player, strong → player + 30
  const delta = recentPct - bands.medium;
  return {
    weak: Math.max(1, Math.min(99, bands.weak + delta)),
    medium: Math.max(1, Math.min(99, bands.medium + delta)),
    strong: Math.max(1, Math.min(99, bands.strong + delta)),
  };
}

/**
 * Generate a synthetic rival with a bot name and seeded avatar.
 * Used to fill the field when real rivals are scarce.
 */
function makeSyntheticRival(
  seed: string,
  index: number,
  scorePct: number,
  language: string,
  botNames: LanguageBotNames
): QuickGhostRival {
  // Synthetic userId is prefixed so it never collides with a real UUID.
  const synthesisId = `synthetic:${seed}:${index}`;

  // Pick a bot name deterministically from the pool for this difficulty level.
  // Use the same seeding we use for everything else so re-fetching the same
  // round always gives the same field.
  const namePool =
    scorePct < 40 ? botNames.easy : scorePct < 70 ? botNames.medium : botNames.hard;
  const h = hashString(`${seed}:name:${index}`);
  const botName = namePool[h % namePool.length];

  return {
    userId: synthesisId,
    name: botName.name,
    customAvatar: getSeededAvatarConfig(hashString(synthesisId)),
    scorePct,
  };
}

/**
 * Pad real rivals up to GHOST_COUNT by generating synthetic ones
 * from bot names + seeded avatars. Returns the realRivals (unchanged,
 * first in the field) plus synthetic ones to reach the target count.
 *
 * Synthetic rivals are chosen to span the skill range: one weak, one mid,
 * one strong — seeded from `seed` so same seed → same field.
 *
 * When recentPct is provided (>0), bands shift to anchor rivals around the
 * player's level: one clearly below, one near, one clearly above.
 *
 * All scores get seeded jitter (±8 pct) so the field doesn't feel canned
 * across multiple rounds.
 *
 * Always returns exactly `targetCount` rivals, even if the input is empty.
 */
export function padRivalsWithSynthetic(
  realRivals: QuickGhostRival[],
  targetCount: number,
  seed: string,
  bands: ScoreBands,
  language: string,
  recentPct: number = 0
): QuickGhostRival[] {
  const botNames = BOT_CONFIG.NAMES[language] ?? BOT_CONFIG.NAMES.en;
  const toAdd = Math.max(0, targetCount - realRivals.length);

  if (toAdd === 0) return realRivals.slice(0, targetCount);

  // Anchor bands to the player's level if provided.
  const anchoredBands = anchorBandsToPlayerLevel(bands, recentPct);

  // Generate synthetic rivals spread across the skill range.
  // Index 0 → weak, 1 → medium, 2 → strong. If we need <3, take the first N.
  const synthetic: QuickGhostRival[] = [];
  for (let i = 0; i < toAdd; i++) {
    const scorePcts = [anchoredBands.weak, anchoredBands.medium, anchoredBands.strong];
    let scorePct = scorePcts[Math.min(i, scorePcts.length - 1)];
    // Apply jitter so the same band doesn't show identical rivals every round.
    scorePct = applyJitter(scorePct, seed, i);
    synthetic.push(makeSyntheticRival(seed, i, scorePct, language, botNames));
  }

  return [...realRivals, ...synthetic];
}
