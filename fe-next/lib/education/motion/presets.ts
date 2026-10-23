import { EDU_DUR, EDU_EASE, type CubicBezier } from './tokens';

type TransformKey = 'x' | 'y' | 'scale' | 'rotate';
type Frame = Partial<Record<TransformKey, number | string>>;
type Target = Partial<Record<TransformKey, number | string | number[]>>;

export interface EduTransition {
  duration: number;
  ease?: CubicBezier;
  times?: number[];
}

export interface EduPreset {
  initial: Frame | false;
  animate: Target;
  transition: EduTransition;
}

export const EDU_PRESETS = {
  sheetUp: { initial: { y: '100%' }, animate: { y: 0 }, transition: { duration: EDU_DUR.sheet, ease: EDU_EASE.overshoot } },
  popIn: { initial: { scale: 0 }, animate: { scale: 1 }, transition: { duration: EDU_DUR.pop, ease: EDU_EASE.overshoot } },
  pulse: {
    initial: { scale: 1 },
    animate: { scale: [1, 1.2, 1.2, 1] },
    transition: { duration: EDU_DUR.pulse, times: [0, 0.45, 0.75, 1] },
  },
  heroIn: {
    initial: { x: '-70%', y: '45%', rotate: -10, scale: 1.6 },
    animate: { x: 0, y: 0, rotate: 0, scale: 1.6 },
    transition: { duration: EDU_DUR.hero, ease: EDU_EASE.outQuint },
  },
  pullBack: { initial: { scale: 1.6 }, animate: { x: 0, y: 0, rotate: 0, scale: 1 }, transition: { duration: EDU_DUR.pullBack, ease: EDU_EASE.outQuint } },
  chipIn: { initial: { scale: 0.4, y: 16 }, animate: { scale: 1, y: 0 }, transition: { duration: EDU_DUR.chipIn, ease: EDU_EASE.overshoot } },
  ignite: {
    initial: { scale: 1 },
    animate: { scale: [1, 1.25, 1] },
    transition: { duration: EDU_DUR.pulse, times: [0, 0.4, 1] },
  },
} as const satisfies Record<string, EduPreset>;

export type EduPresetName = keyof typeof EDU_PRESETS;

const lastFrame = (target: Target): Frame =>
  Object.fromEntries(Object.entries(target).map(([k, v]) => [k, Array.isArray(v) ? v[v.length - 1] : v]));

/** Reduced motion renders the end state with no tween, so nothing moves and nothing is hidden. */
export function resolvePreset(name: EduPresetName, reduced: boolean): EduPreset {
  const preset: EduPreset = EDU_PRESETS[name];
  if (!reduced) return preset;
  return { initial: false, animate: lastFrame(preset.animate), transition: { duration: 0 } };
}
