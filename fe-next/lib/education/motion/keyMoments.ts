import { settlePreset, type EduPreset } from './presets';
import { EDU_EASE } from './tokens';

/** A key moment acknowledges the student and gets out of the way before the next tap. */
export const KEY_MOMENT_MAX_MS = 450;

export const KEY_MOMENTS = {
  join: {
    initial: { scale: 0.6, y: 12 },
    animate: { scale: [0.6, 1.08, 1], y: [12, -2, 0] },
    transition: { duration: 0.32, ease: EDU_EASE.outQuint, times: [0, 0.6, 1] },
  },
  correct: {
    initial: { scale: 1, y: 0 },
    animate: { scale: [1, 1.14, 1], y: [0, -6, 0] },
    transition: { duration: 0.26, times: [0, 0.4, 1] },
  },
  levelUp: {
    initial: { scale: 0.85, rotate: -4 },
    animate: { scale: [0.85, 1.06, 1], rotate: [-4, 2, 0] },
    transition: { duration: 0.38, ease: EDU_EASE.outQuint, times: [0, 0.6, 1] },
  },
  roundEnd: {
    initial: { y: '35%', scale: 0.96 },
    animate: { y: 0, scale: 1 },
    transition: { duration: 0.3, ease: EDU_EASE.outQuint },
  },
  chest: {
    initial: { rotate: 0, scale: 1 },
    animate: { rotate: [0, -8, 8, -6, 6, 0], scale: [1, 1.06, 1.06, 1.1, 1.1, 1] },
    transition: { duration: 0.45, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
  },
} as const satisfies Record<string, EduPreset>;

export type KeyMoment = keyof typeof KEY_MOMENTS;

export function resolveKeyMoment(name: KeyMoment, reduced: boolean): EduPreset {
  return settlePreset(KEY_MOMENTS[name], reduced);
}
