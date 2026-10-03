import { describe, it, expect } from 'vitest';
import { createQuizSession } from '../vocabQuizEngine';
import { buildQuizShellStart, QUIZ_SHELL_GAME_MODE } from '../vocabQuizShell';
import { VOCAB_QUIZ_MODE } from '@/shared/types/vocabQuiz';

const session = createQuizSession({
  gameCode: 'SHELL2',
  classroomId: 'cls-1',
  words: [
    { word: 'shirt', definition: 'a top you wear' },
    { word: 'pants', definition: 'legs clothing' },
    { word: 'shoes', definition: 'feet clothing' },
    { word: 'hat', definition: 'head clothing' },
  ],
  focus: 'any',
  questionCount: 2,
  secondsPerQuestion: 20,
  seed: 7,
  now: 1_000_000,
});

describe('buildQuizShellStart - names the classroom mode its board shell hides', () => {
  it('marks the start as a vocab quiz so a student countdown never reads the shell mode', () => {
    const payload = buildQuizShellStart(session);
    expect(payload.gameMode).toBe(QUIZ_SHELL_GAME_MODE);
    expect(payload.classroomMode).toBe(VOCAB_QUIZ_MODE);
  });
});
