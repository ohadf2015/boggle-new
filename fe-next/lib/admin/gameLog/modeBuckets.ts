/**
 * Canonical game-mode buckets for the admin game log stats.
 *
 * Source of truth: distinct `analytics_events.metadata->>gameMode` values observed
 * live (2026-05-30). Some modes are logged under more than one spelling
 * (Word Wheel = 'wheel-rush' | 'word-wheel'; Word Craft = 'wordCraft' |
 * 'wordCraftCards' | 'wordCraftGems'), so a bucket can map several raw values.
 *
 * Game *type* and *multiplayer-ness* are ORTHOGONAL axes. A `blast` and a
 * `blast_multiplayer` game are the same type played with a different player
 * count, so both fold into the `blast` type bucket. The `multiplayer` bucket is
 * the cross-cutting aggregate (counted via `isMultiplayer` OR gameMode), which
 * is why it is allowed to overlap the type buckets and is skipped from
 * `RAW_TO_BUCKET`.
 */

export interface ModeBucket {
  key: string;
  /** i18n key suffix + fallback label. */
  labelKey: string;
  label: string;
  /** Raw gameMode values that fold into this bucket. */
  modes: string[];
  /** True for the cross-cutting MP aggregate (counted via isMultiplayer OR gameMode). */
  multiplayer?: boolean;
}

export const CANONICAL_MODE_BUCKETS: ModeBucket[] = [
  { key: 'multiplayer', labelKey: 'multiplayer', label: 'Multiplayer', modes: ['multiplayer'], multiplayer: true },
  { key: 'wordHunt', labelKey: 'wordHunt', label: 'Word Hunt', modes: ['word-hunt'] },
  { key: 'classic', labelKey: 'classic', label: 'Classic', modes: ['classic'] },
  { key: 'wordWheel', labelKey: 'wordWheel', label: 'Word Wheel', modes: ['wheel-rush', 'word-wheel'] },
  { key: 'survival', labelKey: 'survival', label: 'Survival', modes: ['survival'] },
  { key: 'random', labelKey: 'random', label: 'Random', modes: ['random'] },
  // blast & blast_multiplayer = same type, different player count (MP axis is separate).
  { key: 'blast', labelKey: 'blast', label: 'Blast', modes: ['blast', 'blast_multiplayer'] },
  // adventure & adventure-boss both belong to the Adventure campaign.
  { key: 'adventure', labelKey: 'adventure', label: 'Adventure', modes: ['adventure', 'adventure-boss'] },
  { key: 'connections', labelKey: 'connections', label: 'Connections', modes: ['connections'] },
  { key: 'wordTower', labelKey: 'wordTower', label: 'Word Tower', modes: ['word-tower'] },
  { key: 'wordCraft', labelKey: 'wordCraft', label: 'Word Craft', modes: ['wordCraft', 'wordCraftCards', 'wordCraftGems', 'word-craft'] },
  { key: 'crossword', labelKey: 'crossword', label: 'Crossword', modes: ['crossword'] },
  { key: 'arena', labelKey: 'arena', label: 'Arena', modes: ['arena'] },
  { key: 'brainGym', labelKey: 'brainGym', label: 'Brain Gym', modes: ['brainGym'] },
  // Brain drills (rare-gems, speed-reader, …) all log under 'brain-drill';
  // 'drill' is the game_results spelling for the same type.
  { key: 'brainDrill', labelKey: 'brainDrill', label: 'Brain Drill', modes: ['brain-drill', 'drill'] },
  { key: 'practice', labelKey: 'practice', label: 'Classroom Practice', modes: ['practice'] },
  { key: 'quickPlay', labelKey: 'quickPlay', label: 'Quick Play', modes: ['quickPlay'] },
  { key: 'tutorial', labelKey: 'tutorial', label: 'Tutorial', modes: ['tutorial'] },
  // singleplayer + solo-bots = generic single-player session (no specific mode tag).
  { key: 'singleplayer', labelKey: 'singleplayer', label: 'Single Player', modes: ['singleplayer', 'solo-bots'] },
];

/** Raw gameMode values that are intentionally NOT type-bucketed (handled by the MP aggregate). */
const AGGREGATE_ONLY_MODES = new Set(['multiplayer']);

const RAW_TO_BUCKET: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const b of CANONICAL_MODE_BUCKETS) {
    if (b.multiplayer) continue;
    for (const m of b.modes) map[m] = b.key;
  }
  return map;
})();

export function bucketForMode(mode: string | null | undefined): string {
  if (!mode) return 'other';
  return RAW_TO_BUCKET[mode] ?? 'other';
}

/**
 * Gap guard: given the raw gameMode values seen in a window, return the ones
 * that fall through to 'other' (i.e. have no type bucket) so a newly-added game
 * mode can't silently rot in the "other" pile. The MP aggregate value
 * ('multiplayer') is intentionally excluded — it has no type by design.
 */
export function unbucketedModes(modes: Array<string | null | undefined>): string[] {
  const out = new Set<string>();
  for (const m of modes) {
    if (!m) continue;
    if (AGGREGATE_ONLY_MODES.has(m)) continue;
    if (bucketForMode(m) === 'other') out.add(m);
  }
  return [...out].sort();
}
