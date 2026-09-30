import { describe, it, expect } from 'vitest';
import { createQuizSession } from '../vocabQuizEngine';
import { buildQuizShellStart } from '../vocabQuizShell';
import type { ResolvedClassroomPressure } from '@/shared/types/classroom';

const WORDS = [
  { word: 'shirt', definition: 'a top you wear' },
  { word: 'pants', definition: 'legs clothing' },
  { word: 'shoes', definition: 'feet clothing' },
  { word: 'hat', definition: 'head clothing' },
];

const CALM: ResolvedClassroomPressure = { leaderboard: 'hidden', timer: 'gentle', speedScoring: false };

function makeSession(pressure?: ResolvedClassroomPressure) {
  return createQuizSession({
    gameCode: 'SHELL1',
    classroomId: 'cls-1',
    words: WORDS,
    focus: 'any',
    questionCount: 2,
    secondsPerQuestion: 20,
    seed: 7,
    now: 1_000_000,
    ...(pressure ? { pressure } : {}),
  });
}

describe('buildQuizShellStart - pressure echo (pitfall 3: one room, three start paths)', () => {
  it('carries the teacher dials so the quiz surface can honor them', () => {
    const payload = buildQuizShellStart(makeSession(CALM));
    expect(payload.pressure).toEqual(CALM);
  });

  it('omits the key when the session has no dials', () => {
    const payload = buildQuizShellStart(makeSession());
    expect('pressure' in payload).toBe(false);
  });
});
