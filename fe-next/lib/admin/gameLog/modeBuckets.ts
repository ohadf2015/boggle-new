/**
 * Canonical game-mode buckets for the admin game log stats.
 *
 * Source of truth: distinct `analytics_events.metadata->>gameMode` values observed
 * live (2026-05-30). Some modes are logged under more than one spelling (Word Wheel =
 * 'wheel-rush' | 'word-wheel'), so a bucket can map several raw values. The
 * `multiplayer` bucket is a cross-cutting aggregate (a game is MP *and* some mode),
 * which is why it is allowed to overlap the mode buckets.
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
  { key: 'blast', labelKey: 'blast', label: 'Blast', modes: ['blast'] },
  { key: 'adventure', labelKey: 'adventure', label: 'Adventure', modes: ['adventure'] },
  { key: 'connections', labelKey: 'connections', label: 'Connections', modes: ['connections'] },
  { key: 'wordTower', labelKey: 'wordTower', label: 'Word Tower', modes: ['word-tower'] },
  { key: 'singleplayer', labelKey: 'singleplayer', label: 'Single Player', modes: ['singleplayer'] },
];

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
