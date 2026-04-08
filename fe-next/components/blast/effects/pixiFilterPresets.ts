/**
 * Pixi Filter Presets — reusable factory functions for game-specific filter effects.
 *
 * Wraps pixi-filters v6 classes with game-tuned defaults matching the neo-brutalist palette.
 * Each factory returns a filter instance ready to add to a Container's filters array.
 *
 * @example
 * ```ts
 * import { createGlowFilter, createOutlineFilter } from './pixiFilterPresets';
 * container.filters = [createGlowFilter('#BFFF00', 2)];
 * ```
 */

import { GlowFilter, OutlineFilter, BloomFilter, ShockwaveFilter } from 'pixi-filters';

// ─── Neo-brutalist color constants ──────────────────────────────────────

const NEO_LIME = 0xbfff00;
const NEO_PINK = 0xff1493;
const NEO_CYAN = 0x00ffff;
const NEO_PURPLE = 0x8b5cf6;

/** Tile type → glow color mapping */
export const TILE_GLOW_COLORS: Record<string, number> = {
  lightning: NEO_CYAN,
  prism: NEO_PURPLE,
  gem: 0xffe135,
  bomb: NEO_PINK,
  magnet: NEO_PURPLE,
  diamond: 0xffffff,
  gold: 0xffe135,
  rainbow: NEO_LIME,
  wildcard: NEO_LIME,
  frozen: NEO_CYAN,
  ice: NEO_CYAN,
  countdown: NEO_PINK,
  virus: 0x00ff00,
  portal: NEO_PURPLE,
  catalyst: 0xffe135,
  normal: NEO_LIME,
};

// ─── Filter Factories ───────────────────────────────────────────────────

/**
 * Soft outer glow — ideal for active/selected/hovered tiles.
 * @param color - Hex color number or string (e.g. 0xBFFF00 or '#BFFF00')
 * @param intensity - Glow strength (default 2, range 0–5)
 */
export function createGlowFilter(color: number = NEO_LIME, intensity = 2): InstanceType<typeof GlowFilter> {
  return new GlowFilter({
    distance: 10 + intensity * 4,
    outerStrength: intensity,
    innerStrength: 0.5,
    color,
    quality: 0.3,
  });
}

/**
 * Crisp outline — ideal for word path highlighting and selection state.
 * @param color - Outline color (default neo-lime)
 * @param thickness - Line thickness in pixels (default 2)
 */
export function createOutlineFilter(color: number = NEO_LIME, thickness = 2): InstanceType<typeof OutlineFilter> {
  return new OutlineFilter({
    thickness,
    color,
    quality: 0.3,
  });
}

/**
 * Bloom / HDR glow — makes bright areas bleed light. Used for combo/chain intensity.
 * @param intensity - Bloom strength (default 2, max ~15 for mega cascade)
 */
export function createBloomFilter(intensity = 2): InstanceType<typeof BloomFilter> {
  return new BloomFilter({
    strength: intensity,
    quality: 4,
  });
}

/**
 * Shockwave distortion — expanding ring from an origin point.
 * Returns the filter + an `animate()` function that drives the wave.
 *
 * @param center - Wave origin in local coordinates { x, y }
 * @param amplitude - Distortion intensity (default 20)
 * @param speed - Expansion speed in px/ms (default 300)
 */
export function createShockwaveFilter(
  center: { x: number; y: number },
  amplitude = 20,
  speed = 300,
): { filter: InstanceType<typeof ShockwaveFilter>; animate: () => void; stop: () => void } {
  const filter = new ShockwaveFilter({
    center,
    radius: -1,
    speed,
    amplitude,
    wavelength: 120,
  });
  filter.enabled = false;

  let rafId = 0;

  const animate = () => {
    filter.time = 0;
    filter.enabled = true;
    const start = performance.now();
    const duration = 600;

    const tick = () => {
      const t = Math.min((performance.now() - start) / duration, 1);
      filter.time = t;
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        filter.enabled = false;
      }
    };
    rafId = requestAnimationFrame(tick);
  };

  const stop = () => {
    cancelAnimationFrame(rafId);
    filter.enabled = false;
  };

  return { filter, animate, stop };
}

// ─── Preset Combos ──────────────────────────────────────────────────────

/** Glow + outline combo for strongly highlighted tiles (e.g. selected word path) */
export function createHighlightFilters(color: number = NEO_LIME) {
  return [createGlowFilter(color, 3), createOutlineFilter(color, 2)];
}

/** Get the appropriate glow color for a blast tile type */
export function getGlowColorForTile(tileType: string): number {
  return TILE_GLOW_COLORS[tileType] ?? NEO_LIME;
}
