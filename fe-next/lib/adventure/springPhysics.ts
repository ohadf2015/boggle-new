/**
 * Adventure spring physics — canonical motion vocabulary.
 *
 * Audit GF-001 (2026-05-01) found 6 ad-hoc spring values across the surface
 * (180/12, 200/20, 300/15, 300/25, 400/22, 500/20...). Player's brain expects
 * consistent spring behavior; variance reads as "unfinished".
 *
 * Use these named presets for new motion. Leave intentional asymmetry alone
 * (e.g. BossVictory.tsx uses 150 stiffness for victory wobble vs 300 for
 * defeat slam — that's character, not inconsistency).
 *
 * Selection guide:
 * - SNAPPY  — small UI pops, tiles, badges; the player wants it gone fast
 * - BOUNCY  — celebration overlays, milestones, loot reveals; lingers
 * - SMOOTH  — modals, level previews, big chrome; arrives gently
 */

export interface SpringConfig {
  type: 'spring';
  stiffness: number;
  damping: number;
}

export const SNAPPY: SpringConfig = {
  type: 'spring',
  stiffness: 400,
  damping: 22,
};

export const BOUNCY: SpringConfig = {
  type: 'spring',
  stiffness: 300,
  damping: 18,
};

export const SMOOTH: SpringConfig = {
  type: 'spring',
  stiffness: 250,
  damping: 25,
};

export const ADVENTURE_SPRINGS = { SNAPPY, BOUNCY, SMOOTH } as const;
