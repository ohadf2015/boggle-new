import { describe, it, expect } from 'vitest';
import { launchPressure, pressureDialsUnlocked } from '../pressureAccess';
import type { ClassroomPressure } from '@/shared/types/classroom';

const NOW = Date.parse('2026-10-30T12:00:00Z');
const calm: ClassroomPressure = { leaderboard: 'hidden', timer: 'off', speedScoring: false };
const day = 86_400_000;

const cases = [
  { name: 'a paid Pro teacher', state: { hasPro: true, loading: false, accessTrialExpires: null }, open: true },
  { name: 'a free teacher on a live access trial', state: { hasPro: false, loading: false, accessTrialExpires: new Date(NOW + 5 * day).toISOString() }, open: true },
  { name: 'a free teacher whose trial ended', state: { hasPro: false, loading: false, accessTrialExpires: new Date(NOW - day).toISOString() }, open: false },
  { name: 'a free teacher', state: { hasPro: false, loading: false, accessTrialExpires: null }, open: false },
  { name: 'a teacher whose plan is still loading', state: { hasPro: true, loading: true, accessTrialExpires: null }, open: false },
];

describe('pressure dials: one rule for the unlock and the launch', () => {
  it.each(cases)('given $name, when the lobby launches, then the dials the teacher could set are the dials the room gets', ({ state, open }) => {
    expect(pressureDialsUnlocked(state, NOW)).toBe(open);
    expect(launchPressure(state, calm, NOW)).toEqual(open ? calm : undefined);
  });
});
