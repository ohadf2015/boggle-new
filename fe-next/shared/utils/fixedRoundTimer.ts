import { WHEEL_RUSH_DURATION_SEC } from '@/shared/constants/wheelRushConstants';

/** Modes whose round length is part of the design: the teacher's timer does not apply. */
const FIXED_ROUND_SECONDS: Readonly<Record<string, number>> = {
  'wheel-rush': WHEEL_RUSH_DURATION_SEC,
};

export function fixedRoundSeconds(mode: string | null | undefined): number | undefined {
  return mode ? FIXED_ROUND_SECONDS[mode] : undefined;
}
