export type CubicBezier = readonly [number, number, number, number];

export const EDU_EASE = {
  overshoot: [0.35, 1.8, 0.35, 0.83],
  outQuint: [0.22, 1, 0.36, 1],
} as const satisfies Record<string, CubicBezier>;

/** Seconds, in framer-motion's unit. */
export const EDU_DUR = {
  // Web CSS says 200ms, but the native sheet lands within 130ms; 100ms leaves room for commit + frame quantisation.
  sheet: 0.1,
  pop: 0.3,
  pulse: 0.3,
  hero: 0.13,
  pullBack: 0.2,
  chipIn: 0.3,
  countUp: 0.4,
} as const;

/** Milliseconds, for timers. */
export const EDU_MS = {
  hold: 400,
  heroHold: 950,
  chipGap: 150,
  chipStagger: 600,
  streakHold: 2000,
} as const;
