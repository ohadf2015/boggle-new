import { vi } from 'vitest';

export const motionPref = { reduced: false };

vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({
  useEduReducedMotion: () => motionPref.reduced,
}));
