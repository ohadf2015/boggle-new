import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../utils/socketHelpers.js', () => ({ broadcastToRoom: vi.fn(), volatileBroadcastToRoom: vi.fn(), getGameRoom: (c: string) => c }));

import { bossWordInput } from '../roomBoss';
import { buildLessonVocabulary } from '../../../utils/lessonVocabulary';

describe('bossWordInput', () => {
  it('Given a Hebrew lesson word placed with a final letter, When a student hits with the regular spelling, Then the hit is a lesson word', () => {
    const game = { language: 'he', lessonVocabulary: buildLessonVocabulary(['שלום'], 'he') } as never;
    expect(bossWordInput(game, { username: 'noa', word: 'שלומ', score: 10 }, 5).fromLesson).toBe(true);
  });

  it('Given a word outside the lesson, When it hits, Then it is not a lesson word', () => {
    const game = { language: 'en', lessonVocabulary: buildLessonVocabulary(['cell'], 'en') } as never;
    expect(bossWordInput(game, { username: 'noa', word: 'tram', score: 10 }, 5)).toEqual({ username: 'noa', word: 'tram', score: 10, now: 5, fromLesson: false });
  });

  it('Given a room with no lesson deck, When a word hits, Then it is not a lesson word', () => {
    expect(bossWordInput({} as never, { username: 'noa', word: 'cell', score: 10 }, 5).fromLesson).toBe(false);
  });
});
