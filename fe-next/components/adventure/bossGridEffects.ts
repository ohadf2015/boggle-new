/**
 * Boss Grid Effects Configuration
 *
 * Maps the 18 gridEffect strings from bossConfig.ts phase modifiers
 * to 5 visual effect categories with CSS class names and durations.
 * Pure config — no React, no side effects.
 */

export type GridEffectCategory = 'obscure' | 'rotate' | 'decay' | 'scramble' | 'cosmetic';

export interface GridEffectDefinition {
  category: GridEffectCategory;
  cssClass: string;
  durationMs: number;
  dataAttr: GridEffectCategory;
}

export const GRID_EFFECT_MAP: Record<string, GridEffectDefinition> = {
  // OBSCURE — temporarily darken/hide random tiles
  'cave-in-hide':           { category: 'obscure',  cssClass: 'boss-effect-obscure-cavein',     durationMs: 1800, dataAttr: 'obscure' },
  'mirror-crack-zones':     { category: 'obscure',  cssClass: 'boss-effect-obscure-mirror',     durationMs: 1500, dataAttr: 'obscure' },
  'combined-quiz':          { category: 'obscure',  cssClass: 'boss-effect-obscure-quiz',       durationMs: 1200, dataAttr: 'obscure' },

  // ROTATE — CSS transform on grid container
  'board-rotate':           { category: 'rotate',   cssClass: 'boss-effect-rotate-board',       durationMs: 1200, dataAttr: 'rotate' },
  'grid-rotate-symmetric':  { category: 'rotate',   cssClass: 'boss-effect-rotate-symmetric',   durationMs: 1500, dataAttr: 'rotate' },
  'tile-shift':             { category: 'rotate',   cssClass: 'boss-effect-rotate-shift',       durationMs: 1000, dataAttr: 'rotate' },
  'anchor-cannon':          { category: 'rotate',   cssClass: 'boss-effect-rotate-anchor',      durationMs: 1000, dataAttr: 'rotate' },

  // DECAY — tiles visually degrade
  'tile-decay':             { category: 'decay',    cssClass: 'boss-effect-decay-tiles',        durationMs: 1800, dataAttr: 'decay' },
  'tile-absorption':        { category: 'decay',    cssClass: 'boss-effect-decay-absorption',   durationMs: 1800, dataAttr: 'decay' },
  'hazard-tiles':           { category: 'decay',    cssClass: 'boss-effect-decay-hazard',       durationMs: 1500, dataAttr: 'decay' },
  'stacking-difficulty':    { category: 'decay',    cssClass: 'boss-effect-decay-stack',        durationMs: 1500, dataAttr: 'decay' },

  // SCRAMBLE — letter shuffle animation
  'continuous-scramble':    { category: 'scramble', cssClass: 'boss-effect-scramble-full',      durationMs: 1200, dataAttr: 'scramble' },
  'maze-paths':             { category: 'scramble', cssClass: 'boss-effect-scramble-maze',      durationMs: 1500, dataAttr: 'scramble' },

  // COSMETIC — overlay effects, color tints
  'sticky-multiply':        { category: 'cosmetic', cssClass: 'boss-effect-cosmetic-sticky',    durationMs: 1200, dataAttr: 'cosmetic' },
  'all-sticky':             { category: 'cosmetic', cssClass: 'boss-effect-cosmetic-allsticky', durationMs: 1200, dataAttr: 'cosmetic' },
  'rare-letter-explosions': { category: 'cosmetic', cssClass: 'boss-effect-cosmetic-cosmic',    durationMs: 1500, dataAttr: 'cosmetic' },
  'all-languages-active':   { category: 'cosmetic', cssClass: 'boss-effect-cosmetic-babel',     durationMs: 1500, dataAttr: 'cosmetic' },
};
