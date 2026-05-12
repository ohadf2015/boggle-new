/**
 * Blast Effect Variations — Randomized animation pools for DOM-layer effects.
 *
 * Each effect type has multiple animation configs. One is picked randomly per
 * event so that repeated combos / score flies / milestones always feel fresh.
 */

import type { Transition, TargetAndTransition } from 'framer-motion';

// ─── Utility ──────────────────────────────────────────────────────────

/** Pick a random element from an array */
export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick a random number between min and max */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// ─── Score Fly Path Variations ────────────────────────────────────────

export interface ScoreFlyPath {
  /** Keyframed x positions [start, mid, end] */
  x: (startX: number, targetX: number) => number[];
  /** Keyframed y positions [start, mid, end] */
  y: (startY: number, targetY: number) => number[];
  /** Keyframed scale values */
  scale: number[];
  /** Keyframed rotation (degrees) */
  rotate?: number[];
  /** Duration in seconds */
  duration: number;
  /** Easing per keyframe */
  times: number[];
}

/** Classic arc — the original path with slight random offset */
const ARC_PATH: () => ScoreFlyPath = () => {
  const xOff = rand(-20, 20);
  return {
    x: (sx, tx) => [sx, sx - 40 + xOff, tx],
    y: (sy, ty) => [sy, sy - 80, ty],
    scale: [1.2, 1, 0.6],
    duration: 0.6,
    times: [0, 0.4, 1],
  };
};

/** Spiral upward — corkscrews to target */
const SPIRAL_PATH: () => ScoreFlyPath = () => {
  const dir = Math.random() > 0.5 ? 1 : -1;
  return {
    x: (sx, tx) => [sx, sx + 50 * dir, sx - 30 * dir, tx],
    y: (sy, ty) => [sy, sy - 50, sy - 100, ty],
    scale: [1.4, 1.1, 0.9, 0.5],
    rotate: [0, 180 * dir, 360 * dir, 0],
    duration: 0.7,
    times: [0, 0.3, 0.6, 1],
  };
};

/** Bounce — pops up, bounces off invisible ceiling, lands at target */
const BOUNCE_PATH: () => ScoreFlyPath = () => ({
  x: (sx, tx) => [sx, sx + rand(-15, 15), tx],
  y: (sy, ty) => [sy, sy - 120, sy - 60, ty],
  scale: [1.5, 0.8, 1.1, 0.5],
  duration: 0.75,
  times: [0, 0.35, 0.6, 1],
});

/** Rocket — shoots straight up then curves to target */
const ROCKET_PATH: () => ScoreFlyPath = () => ({
  x: (sx, tx) => [sx, sx, tx],
  y: (sy, ty) => [sy, sy - 130, ty],
  scale: [1.0, 1.6, 0.4],
  duration: 0.55,
  times: [0, 0.5, 1],
});

/** Zigzag — snakes left-right on the way up */
const ZIGZAG_PATH: () => ScoreFlyPath = () => {
  const dir = Math.random() > 0.5 ? 1 : -1;
  return {
    x: (sx, tx) => [sx, sx + 40 * dir, sx - 30 * dir, tx],
    y: (sy, ty) => [sy, sy - 40, sy - 90, ty],
    scale: [1.3, 1.0, 0.8, 0.5],
    duration: 0.65,
    times: [0, 0.25, 0.55, 1],
  };
};

/** Drift — slow lazy upward float with a sideways drift, soft fade */
const DRIFT_PATH: () => ScoreFlyPath = () => {
  const drift = rand(-60, 60);
  return {
    x: (sx, tx) => [sx, sx + drift * 0.3, sx + drift * 0.6, tx],
    y: (sy, ty) => [sy, sy - 35, sy - 80, ty],
    scale: [1.1, 1.05, 0.95, 0.55],
    rotate: [rand(-8, 8), rand(-12, 12), rand(-6, 6), 0],
    duration: 0.85,
    times: [0, 0.3, 0.65, 1],
  };
};

/** Whirl — playful tumble with overshoot at midpoint */
const WHIRL_PATH: () => ScoreFlyPath = () => {
  const dir = Math.random() > 0.5 ? 1 : -1;
  return {
    x: (sx, tx) => [sx, sx + 25 * dir, sx + 60 * dir, sx + 10 * dir, tx],
    y: (sy, ty) => [sy, sy - 70, sy - 110, sy - 80, ty],
    scale: [1.2, 1.4, 1.0, 0.85, 0.5],
    rotate: [0, 90 * dir, 270 * dir, 360 * dir, 360 * dir],
    duration: 0.78,
    times: [0, 0.25, 0.5, 0.75, 1],
  };
};

/** Comet — fast straight dash with overshoot, lands hot */
const COMET_PATH: () => ScoreFlyPath = () => ({
  x: (sx, tx) => [sx, sx + (tx - sx) * 0.3, sx + (tx - sx) * 1.1, tx],
  y: (sy, ty) => [sy, sy - 40, ty - 6, ty],
  scale: [1.6, 1.2, 0.9, 0.6],
  rotate: [rand(-15, 15), 0, 0, 0],
  duration: 0.5,
  times: [0, 0.4, 0.85, 1],
});

export const SCORE_FLY_PATHS = [
  ARC_PATH, ARC_PATH, SPIRAL_PATH, BOUNCE_PATH, ROCKET_PATH, ZIGZAG_PATH,
  DRIFT_PATH, WHIRL_PATH, COMET_PATH,
] as const;

export function getRandomScoreFlyPath(): ScoreFlyPath {
  const factory = pickRandom(SCORE_FLY_PATHS);
  return factory();
}

// ─── Combo Flash Variations ───────────────────────────────────────────

export interface ComboFlashVariation {
  /** Background shape — 'radial' | 'cross' | 'diamond' | 'ripple' */
  type: string;
  /** Extra DOM elements to render */
  extraElements?: number;
  /** Rotation of the flash overlay in degrees */
  rotation?: number;
  /** Scale animation override */
  scaleRange?: [number, number];
}

const COMBO_FLASH_VARIATIONS: ComboFlashVariation[] = [
  { type: 'radial' },
  { type: 'radial', rotation: 45 },
  { type: 'cross', extraElements: 2 },
  { type: 'diamond', rotation: 45, scaleRange: [0.5, 2.0] },
  { type: 'ripple', extraElements: 3 },
  { type: 'radial', scaleRange: [0.1, 1.8] },
];

export function getRandomComboFlash(): ComboFlashVariation {
  return pickRandom(COMBO_FLASH_VARIATIONS);
}

// ─── Chain Text Entrance Variations ───────────────────────────────────

export interface ChainTextEntrance {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
}

/** Classic pop-in */
const POP_ENTRANCE: () => ChainTextEntrance = () => ({
  initial: { scale: 1.5, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: 'easeOut' },
});

/** Slam down from above */
const SLAM_ENTRANCE: () => ChainTextEntrance = () => ({
  initial: { y: -80, scale: 1.8, opacity: 0, rotateX: -30 },
  animate: { y: 0, scale: 1, opacity: 1, rotateX: 0 },
  exit: { y: 30, scale: 0.5, opacity: 0 },
  transition: { type: 'spring', stiffness: 500, damping: 20 },
});

/** Elastic overshoot from center */
const ELASTIC_ENTRANCE: () => ChainTextEntrance = () => ({
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 2, opacity: 0, filter: 'blur(8px)' },
  transition: { type: 'spring', stiffness: 400, damping: 12 },
});

/** Rotate-in from random side */
const SPIN_ENTRANCE: () => ChainTextEntrance = () => {
  const dir = Math.random() > 0.5 ? 1 : -1;
  return {
    initial: { rotate: 90 * dir, scale: 0.3, opacity: 0, x: 60 * dir },
    animate: { rotate: 0, scale: 1, opacity: 1, x: 0 },
    exit: { rotate: -45 * dir, scale: 0.6, opacity: 0 },
    transition: { type: 'spring', stiffness: 350, damping: 18 },
  };
};

/** Glitch stutter — appears with jittery position */
const GLITCH_ENTRANCE: () => ChainTextEntrance = () => ({
  initial: { opacity: 0, x: rand(-20, 20), skewX: rand(-15, 15) },
  animate: { opacity: 1, x: 0, skewX: 0 },
  exit: { opacity: 0, x: rand(-30, 30), skewX: rand(-20, 20), scale: 0.8 },
  transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
});

/** Rise from below with blur */
const RISE_ENTRANCE: () => ChainTextEntrance = () => ({
  initial: { y: 60, opacity: 0, filter: 'blur(12px)', scale: 0.6 },
  animate: { y: 0, opacity: 1, filter: 'blur(0px)', scale: 1 },
  exit: { y: -40, opacity: 0, filter: 'blur(6px)' },
  transition: { duration: 0.35, ease: 'easeOut' },
});

export const CHAIN_TEXT_ENTRANCES = [
  POP_ENTRANCE, POP_ENTRANCE, SLAM_ENTRANCE, ELASTIC_ENTRANCE,
  SPIN_ENTRANCE, GLITCH_ENTRANCE, RISE_ENTRANCE,
] as const;

export function getRandomChainEntrance(): ChainTextEntrance {
  const factory = pickRandom(CHAIN_TEXT_ENTRANCES);
  return factory();
}

// ─── Wave Clear Celebration Variations ────────────────────────────────

export interface WaveClearVariation {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
}

const WAVE_ZOOM: () => WaveClearVariation = () => ({
  initial: { scale: 2, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.6, opacity: 0, y: -30 },
  transition: { duration: 0.4, ease: 'easeOut' },
});

const WAVE_SLAM: () => WaveClearVariation = () => ({
  initial: { y: -100, scale: 1.5, opacity: 0, rotateZ: rand(-10, 10) },
  animate: { y: 0, scale: 1, opacity: 1, rotateZ: 0 },
  exit: { y: 40, scale: 0.3, opacity: 0 },
  transition: { type: 'spring', stiffness: 400, damping: 15 },
});

const WAVE_ELASTIC: () => WaveClearVariation = () => ({
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 3, opacity: 0, filter: 'blur(16px)' },
  transition: { type: 'spring', stiffness: 500, damping: 10 },
});

const WAVE_SPLIT: () => WaveClearVariation = () => ({
  initial: { scaleX: 4, scaleY: 0.1, opacity: 0 },
  animate: { scaleX: 1, scaleY: 1, opacity: 1 },
  exit: { scaleX: 0.1, scaleY: 3, opacity: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
});

const WAVE_ROTATE: () => WaveClearVariation = () => {
  const dir = Math.random() > 0.5 ? 1 : -1;
  return {
    initial: { rotate: 180 * dir, scale: 0.2, opacity: 0 },
    animate: { rotate: 0, scale: 1, opacity: 1 },
    exit: { rotate: -90 * dir, scale: 0.5, opacity: 0 },
    transition: { type: 'spring', stiffness: 300, damping: 16 },
  };
};

export const WAVE_CLEAR_VARIATIONS = [
  WAVE_ZOOM, WAVE_ZOOM, WAVE_SLAM, WAVE_ELASTIC, WAVE_SPLIT, WAVE_ROTATE,
] as const;

export function getRandomWaveClear(): WaveClearVariation {
  const factory = pickRandom(WAVE_CLEAR_VARIATIONS);
  return factory();
}

// ─── Score Milestone Entrance Variations ──────────────────────────────

export interface MilestoneEntrance {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
}

const MS_SPRING: () => MilestoneEntrance = () => ({
  initial: { opacity: 0, scale: 0.4, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 1.8, y: -20 },
  transition: { type: 'spring', stiffness: 350, damping: 18 },
});

const MS_FLIP: () => MilestoneEntrance = () => ({
  initial: { opacity: 0, rotateX: -90, scale: 0.6 },
  animate: { opacity: 1, rotateX: 0, scale: 1 },
  exit: { opacity: 0, rotateX: 90, scale: 0.6 },
  transition: { type: 'spring', stiffness: 300, damping: 20 },
});

const MS_SLIDE_BOUNCE: () => MilestoneEntrance = () => {
  const dir = Math.random() > 0.5 ? 1 : -1;
  return {
    initial: { opacity: 0, x: 120 * dir, scale: 0.5, rotate: 15 * dir },
    animate: { opacity: 1, x: 0, scale: 1, rotate: 0 },
    exit: { opacity: 0, x: -80 * dir, scale: 0.8 },
    transition: { type: 'spring', stiffness: 400, damping: 16 },
  };
};

const MS_PUNCH: () => MilestoneEntrance = () => ({
  initial: { opacity: 0, scale: 3, filter: 'blur(12px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 0.3, filter: 'blur(8px)' },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
});

const MS_ELASTIC_DROP: () => MilestoneEntrance = () => ({
  initial: { opacity: 0, y: -60, scaleY: 1.4, scaleX: 0.7 },
  animate: { opacity: 1, y: 0, scaleY: 1, scaleX: 1 },
  exit: { opacity: 0, y: 40, scaleY: 0.6 },
  transition: { type: 'spring', stiffness: 450, damping: 14 },
});

export const MILESTONE_ENTRANCES = [
  MS_SPRING, MS_SPRING, MS_FLIP, MS_SLIDE_BOUNCE, MS_PUNCH, MS_ELASTIC_DROP,
] as const;

export function getRandomMilestoneEntrance(): MilestoneEntrance {
  const factory = pickRandom(MILESTONE_ENTRANCES);
  return factory();
}

// ─── Decorative Accent Particles (CSS-based, for DOM layer) ──────────

export interface AccentParticle {
  /** Offset from center as percentage */
  x: number;
  y: number;
  /** Size in px */
  size: number;
  /** Color hex */
  color: string;
  /** Delay in seconds */
  delay: number;
  /** Angle in degrees for directional movement */
  angle: number;
  /** Distance to travel */
  distance: number;
}

const ACCENT_COLORS = ['#00FFFF', '#BFFF00', '#FF1493', '#FFD700', '#A855F7', '#FF6B35'];

/** Generate N decorative particles around a center point */
export function generateAccentParticles(count: number): AccentParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (360 / count) * i + rand(-20, 20);
    return {
      x: 0,
      y: 0,
      size: rand(3, 8),
      color: pickRandom(ACCENT_COLORS),
      delay: rand(0, 0.15),
      angle,
      distance: rand(40, 120),
    };
  });
}
