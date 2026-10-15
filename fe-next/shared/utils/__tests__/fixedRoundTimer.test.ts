import { describe, it, expect } from 'vitest';
import { fixedRoundSeconds } from '../fixedRoundTimer';
import { getGameModeRules } from '@/backend/modes/rules';
import { configuredRoundMinutes, teacherGameMode } from '@/lib/education/gameModes';

describe('Wheel Rush round length — one source for tile, lobby and timer', () => {
  it('GIVEN Wheel Rush WHEN asked for its length THEN it is the fixed one-minute round', () => {
    expect(fixedRoundSeconds('wheel-rush')).toBe(60);
    expect(fixedRoundSeconds('classic')).toBeUndefined();
  });

  it('GIVEN the server rules WHEN a Wheel Rush start carries no timer THEN the clock defaults to that length', () => {
    expect(getGameModeRules('wheel-rush').defaultTimerSec).toBe(fixedRoundSeconds('wheel-rush'));
  });

  it('GIVEN a teacher timer of 3 minutes WHEN the Wheel Rush tile quotes its length THEN it says 1 min, like the clock', () => {
    expect(configuredRoundMinutes('wheel-rush', { timerMinutes: 3 })).toBe(1);
    expect(teacherGameMode('wheel-rush')?.minutes).toBe(1);
  });

  it('GIVEN a timed mode WHEN the teacher sets 3 minutes THEN the tile still follows the teacher', () => {
    expect(configuredRoundMinutes('classic', { timerMinutes: 3 })).toBe(3);
  });
});
