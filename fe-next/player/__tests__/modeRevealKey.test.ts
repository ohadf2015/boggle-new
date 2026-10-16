import { describe, it, expect } from 'vitest';
import { modeRevealKey, roundRevealKey } from '../modeRevealKey';
import { BOSS_ROUND_META } from '@/components/multiplayer/round/roundModes';

describe('modeRevealKey', () => {
  it.each([
    ['blast', 'countdown.modeReveal.blast'],
    ['word-hunt', 'countdown.modeReveal.wordHunt'],
    ['wheel-rush', 'countdown.modeReveal.wheelRush'],
    ['crossword', 'countdown.modeReveal.crossword'],
    ['word-tower', 'countdown.modeReveal.wordTower'],
    ['classic', 'countdown.modeReveal.classic'],
  ] as const)('%s → %s', (mode, key) => {
    expect(modeRevealKey(mode)).toBe(key);
  });

  it('falls back to classic for an unknown or missing mode', () => {
    expect(modeRevealKey(undefined)).toBe('countdown.modeReveal.classic');
  });
});

describe('roundRevealKey', () => {
  it('GIVEN a boss round in a classroom set to Classic WHEN the splash shows THEN it names Boss Battle', () => {
    expect(roundRevealKey({ bossRound: true, classroomGameMode: 'classic', gameMode: 'classic' })).toBe(BOSS_ROUND_META.nameKey);
  });

  it('GIVEN a classroom quiz round WHEN the splash shows THEN it names the teacher mode', () => {
    expect(roundRevealKey({ bossRound: false, classroomGameMode: 'vocab-quiz', gameMode: 'classic' })).toBe('teacher.classroom.gameModes.vocabQuiz');
  });

  it('GIVEN an arcade Blast round WHEN the splash shows THEN it names Blast', () => {
    expect(roundRevealKey({ bossRound: false, classroomGameMode: null, gameMode: 'blast' })).toBe('countdown.modeReveal.blast');
  });
});
