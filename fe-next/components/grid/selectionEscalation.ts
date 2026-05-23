/**
 * Selection Escalation
 * Drives escalating visual intensity as more letters are selected within a single word.
 * Compounds with combo level (between-word streaks) for multiplicative intensity.
 *
 * Tiers (based on effectiveLength = totalSelected + comboBoost):
 *   ≤2: base (warm yellow)
 *   3-4: momentum (orange glow)
 *   5-6: heating up (pink, particles)
 *   7+:  on fire (cyan/rainbow, max juice)
 *
 * Combo also amplifies within-tier: glow radius, particle count, scale.
 */

export interface SelectionEscalation {
  /** 0-based tier: 0=base, 1=momentum, 2=hot, 3=fire */
  tier: number;
  /** Scale multiplier for this tile (later tiles pop more) */
  scale: number;
  /** Glow box-shadow CSS */
  glow: string;
  /** Text shadow intensity */
  textShadow: string;
  /** Border color override */
  borderColor: string;
  /** Whether to show burst particles on this tile */
  showBurst: boolean;
  /** Particle color palette for this tier */
  particleColors: readonly string[];
  /** Number of burst particles */
  particleCount: number;
  /** Particle travel distance */
  particleDistance: number;
  /** Particle diameter */
  particleSize: number;
  /** Y offset (lift) */
  liftY: number;
}

const TIER_COLORS = {
  base: ['#FFE135', '#FFD700', '#FFA500'],
  momentum: ['#FF6B35', '#FF8C00', '#FFE135', '#FFA500'],
  hot: ['#FF1493', '#FF3366', '#FF6B35', '#FFE135', '#FF69B4'],
  fire: ['#00FFFF', '#FF3366', '#BFFF00', '#FF1493', '#8B5CF6', '#FFE135'],
} as const;

// Caps to prevent tiles from overlapping neighbors
const MAX_SCALE = 1.15;
const MIN_LIFT_Y = -5;

/**
 * Combo amplification factor — multiplies glow size, particle count, etc.
 * Returns 1.0 at combo 0, scaling up to ~1.6 at combo 5+.
 */
function comboAmplification(comboLevel: number): number {
  return 1 + Math.min(comboLevel, 6) * 0.1;
}

/**
 * Module-level cache keyed by (depth, tier, comboLevel). The function is pure
 * w.r.t. these inputs, so caching gives stable object references across drag
 * steps within the same tier — required for downstream React.memo to hold.
 * Bounded (~depth 0-15 × tier 0-3 × combo 0-10 ≈ 640 entries), no eviction.
 */
const escalationCache = new Map<string, SelectionEscalation>();

/**
 * Get escalation properties for a tile based on its position in the selection chain.
 * Combo level compounds in two ways:
 *   1. Tier shift: each combo level adds 0.5 "virtual letters" → reach higher tiers sooner
 *   2. Intensity amplification: glow radius, particle count/size/distance scale with combo
 *
 * @param selectionIndex 0-based index of this tile in the selection order
 * @param totalSelected total number of currently selected tiles
 * @param comboLevel current between-word combo level (default 0)
 */
export function getSelectionEscalation(
  selectionIndex: number,
  totalSelected: number,
  comboLevel = 0,
): SelectionEscalation {
  const comboBoost = comboLevel * 0.5;
  const effectiveLength = totalSelected + comboBoost;
  const tier = effectiveLength <= 2 ? 0 : effectiveLength <= 4 ? 1 : effectiveLength <= 6 ? 2 : 3;
  const cacheKey = `${selectionIndex}|${tier}|${comboLevel}`;
  const cached = escalationCache.get(cacheKey);
  if (cached) return cached;

  const depth = selectionIndex;
  const amp = comboAmplification(comboLevel);
  const result = tier === 0 ? baseTier(depth, amp)
    : tier === 1 ? momentumTier(depth, amp)
    : tier === 2 ? hotTier(depth, amp)
    : fireTier(depth, amp);
  escalationCache.set(cacheKey, result);
  return result;
}

function baseTier(_depth: number, amp: number): SelectionEscalation {
  const glowRadius = Math.round(6 * amp);
  const glowAlpha = Math.min(0.3 * amp, 0.6).toFixed(2);
  return {
    tier: 0,
    scale: Math.min(1.05, MAX_SCALE),
    glow: `0 0 ${glowRadius}px rgba(255, 225, 53, ${glowAlpha})`,
    textShadow: 'none',
    borderColor: 'rgba(0, 0, 0, 0.4)',
    showBurst: false,
    particleColors: TIER_COLORS.base,
    particleCount: 0,
    particleDistance: 0,
    particleSize: 0,
    liftY: -2,
  };
}

function momentumTier(depth: number, amp: number): SelectionEscalation {
  const baseGlow = 8 + depth * 2;
  const glowRadius = Math.round(baseGlow * amp);
  const intensity = Math.min((depth >= 2 ? 0.6 : 0.35) * amp, 0.85);
  return {
    tier: 1,
    scale: Math.min(1.05 + depth * 0.012, MAX_SCALE),
    glow: `0 0 ${glowRadius}px rgba(255, 107, 53, ${intensity.toFixed(2)})`,
    textShadow: depth >= 2 ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
    borderColor: depth >= 2 ? `rgba(255, 107, 53, ${Math.min(0.6 * amp, 0.9).toFixed(2)})` : 'rgba(0, 0, 0, 0.4)',
    showBurst: depth >= 2,
    particleColors: TIER_COLORS.momentum,
    particleCount: Math.round(4 * amp),
    particleDistance: Math.round((18 + depth * 2) * amp),
    particleSize: Math.round(5 * amp),
    liftY: Math.max(-2 - depth * 0.4, MIN_LIFT_Y),
  };
}

function hotTier(depth: number, amp: number): SelectionEscalation {
  const baseGlow = 10 + depth * 3;
  const glowRadius = Math.round(baseGlow * amp);
  const intensity = Math.min((0.4 + depth * 0.06) * amp, 0.9);
  const secondGlow = Math.round((16 + depth * 2) * amp);
  return {
    tier: 2,
    scale: Math.min(1.06 + depth * 0.015, MAX_SCALE),
    glow: `0 0 ${glowRadius}px rgba(255, 20, 147, ${intensity.toFixed(2)}), 0 0 ${secondGlow}px rgba(255, 107, 53, ${Math.min(0.2 * amp, 0.5).toFixed(2)})`,
    textShadow: '0 1px 4px rgba(0,0,0,0.25)',
    borderColor: `rgba(255, 20, 147, ${Math.min((0.4 + depth * 0.08) * amp, 0.95).toFixed(2)})`,
    showBurst: depth >= 1,
    particleColors: TIER_COLORS.hot,
    particleCount: Math.round(6 * amp),
    particleDistance: Math.round((22 + depth * 2) * amp),
    particleSize: Math.round(6 * amp),
    liftY: Math.max(-3 - depth * 0.4, MIN_LIFT_Y),
  };
}

function fireTier(depth: number, amp: number): SelectionEscalation {
  const baseGlow = 12 + depth * 3;
  const glowRadius = Math.round(baseGlow * amp);
  const intensity = Math.min((0.5 + depth * 0.05) * amp, 0.95);
  const secondGlow = Math.round((20 + depth * 2) * amp);
  return {
    tier: 3,
    scale: Math.min(1.08 + depth * 0.012, MAX_SCALE),
    glow: `0 0 ${glowRadius}px rgba(0, 255, 255, ${intensity.toFixed(2)}), 0 0 ${secondGlow}px rgba(255, 51, 102, ${Math.min(0.3 * amp, 0.6).toFixed(2)})`,
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    borderColor: `rgba(0, 255, 255, ${Math.min((0.5 + depth * 0.06) * amp, 0.95).toFixed(2)})`,
    showBurst: true,
    particleColors: TIER_COLORS.fire,
    particleCount: Math.round(8 * amp),
    particleDistance: Math.round((28 + depth * 2) * amp),
    particleSize: Math.round(7 * amp),
    liftY: Math.max(-4 - depth * 0.3, MIN_LIFT_Y),
  };
}

/**
 * Get the escalation background gradient for tiles at higher tiers.
 * ALL selected tiles share the same tier color (based on totalSelected),
 * creating a unified color shift as the word grows.
 * Returns inline style object or empty object for base tier.
 */
export function getEscalationBackground(
  _selectionIndex: number,
  totalSelected: number,
  comboLevel = 0,
): React.CSSProperties {
  const esc = getSelectionEscalation(0, totalSelected, comboLevel);

  if (esc.tier <= 0) return {};

  if (esc.tier === 1) {
    return {
      background: 'linear-gradient(135deg, #FFE135, #FF6B35)',
    };
  }

  if (esc.tier === 2) {
    return {
      background: 'linear-gradient(135deg, #FF6B35 10%, #FF1493)',
    };
  }

  if (esc.tier === 3) {
    return {
      background: 'linear-gradient(135deg, #00FFFF, #FF3366, #BFFF00, #FF1493, #8B5CF6)',
      backgroundSize: '300% 300%',
      animation: 'rainbow-cell 2s ease infinite',
    };
  }

  return {};
}

/**
 * Get the escalation breathing animation for selected tiles.
 * Replaces the old continuous shake (which read as a GPU glitch) with
 * a breathing glow that communicates "charging up" through pulsing
 * box-shadow and subtle scale oscillation.
 *
 * Returns a full CSS animation shorthand string or undefined for base tier.
 */
export function getEscalationShake(
  totalSelected: number,
  comboLevel = 0,
): string | undefined {
  const esc = getSelectionEscalation(0, totalSelected, comboLevel);
  if (esc.tier <= 0) return undefined;
  if (esc.tier === 1) return 'escalation-breathe-1 1.4s ease-in-out infinite';
  if (esc.tier === 2) return 'escalation-breathe-2 1.0s ease-in-out infinite';
  return 'escalation-breathe-3 0.7s ease-in-out infinite';
}

/**
 * Compose the full inline style a selected tile applies for its escalation tier:
 * the tier background gradient plus the breathing animation (unless reduced motion).
 *
 * Hoisted out of GridCell's JSX, where the prior inline form called
 * getEscalationBackground + getEscalationShake TWICE each (4 calls) per selected
 * cell per render. Selected cells re-render on every letter added during a drag,
 * so collapsing to one call site each trims redundant work on the hottest path.
 */
export function composeEscalationStyle(
  selectionIndex: number,
  totalSelected: number,
  comboLevel: number,
  reduceMotion: boolean,
): React.CSSProperties {
  const bg = getEscalationBackground(selectionIndex, totalSelected, comboLevel);
  const shake = reduceMotion ? undefined : getEscalationShake(totalSelected, comboLevel);
  if (!shake) return bg;
  return {
    ...bg,
    animation: [bg.animation, shake].filter(Boolean).join(', '),
  };
}

/**
 * Compose the full background/animation style for a SELECTED cell — the
 * rainbow / combo-gradient / flicker / escalation-tier branches that GridCell
 * used to inline.
 *
 * `suppressAnimations` is the performance gate. The selected-cell styles run
 * INFINITE box-shadow / background-position animations (rainbow-cell,
 * gradient-x, flicker, escalation-breathe). Neither box-shadow nor
 * background-position is GPU-composited, so each animates via main-thread
 * raster repaints EVERY frame. With several cells selected this repaints
 * continuously for the whole word build — the dominant cause of "grid feels
 * super slow when selecting words" on every device, drag OR desktop click.
 *
 * While a word is being built (`suppressAnimations` = a selection is in
 * progress) we keep the STATIC escalation look (tier gradient + glow + scale,
 * which still escalate per letter and paint once) but drop the infinite
 * animations. Reduced-motion users already got this; now everyone does during
 * active selection. The expressive payoff lives in the static escalation + the
 * word-submit celebration, not a continuous repaint storm.
 */
export function composeSelectedCellStyle(params: {
  isRainbow: boolean;
  flicker: boolean;
  comboLevel: number;
  selectionIndex: number;
  totalSelected: number;
  escalationCombo: number;
  escalationTier: number;
  reduceMotion: boolean;
  suppressAnimations: boolean;
}): React.CSSProperties {
  const {
    isRainbow, flicker, comboLevel, selectionIndex, totalSelected,
    escalationCombo, escalationTier, reduceMotion, suppressAnimations,
  } = params;
  const noAnim = reduceMotion || suppressAnimations;

  if (isRainbow) {
    return {
      background: 'linear-gradient(135deg, #FF3366, #FF6B35, #FFE135, #BFFF00, #00FFFF, #FF1493, #8B5CF6)',
      backgroundSize: '300% 300%',
      animation: noAnim ? 'none' : `rainbow-cell ${Math.max(0.4, 2 - (totalSelected - 6) * 0.2)}s ease infinite`,
    };
  }
  if (comboLevel >= 5) {
    return {
      background: 'linear-gradient(135deg, #FF6B35, #FF3366, #FF6B35)',
      backgroundSize: '200% 200%',
      animation: noAnim ? 'none' : 'gradient-x 1.5s ease infinite',
    };
  }
  if (comboLevel >= 3) {
    return { background: 'linear-gradient(135deg, #F97316, #EF4444)' };
  }
  if (flicker) {
    return noAnim ? {} : { animation: 'flicker 0.1s infinite alternate' };
  }
  if (escalationTier >= 1) {
    return composeEscalationStyle(selectionIndex, totalSelected, escalationCombo, noAnim);
  }
  return {};
}
