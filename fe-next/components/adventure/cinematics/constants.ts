/**
 * Cinematic duration constants — pure TypeScript, no Remotion imports.
 *
 * Keeping these in a separate file prevents the Remotion bundle from being
 * pulled into modules that only need the numeric constants (e.g.
 * AdventureGameOverlays, which lazily loads the actual cinematic components
 * via next/dynamic but previously imported from the barrel and triggered
 * synchronous Remotion evaluation).
 */

/** Victory cinematic total duration in frames (6 s × 30 fps) */
export const VICTORY_DURATION_FRAMES = 180;

/** Defeat cinematic total duration in frames (5 s × 30 fps) */
export const DEFEAT_DURATION_FRAMES = 150;

/** World-unlock cinematic total duration in frames (10 s × 30 fps) */
export const WORLD_UNLOCK_DURATION_FRAMES = 300;
