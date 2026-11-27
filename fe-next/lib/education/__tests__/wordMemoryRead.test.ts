import { describe, expect, it } from 'vitest';
import { shapeWordMemory } from '../wordMemoryRead';
import type { WordReviewRow } from '../recordWordReviews';

const TODAY = '2026-11-10';
const row = (o: Partial<WordReviewRow> & Pick<WordReviewRow, 'word' | 'lesson_id' | 'strength' | 'next_review_date'>): WordReviewRow => ({
  ease_factor: 2.5, interval: 1, repetitions: 1, last_review_date: '2026-11-01', correct_days: 0, last_correct_date: null, best_gap_days: 0, ...o,
});

describe('shapeWordMemory', () => {
  const rows = [
    row({ word: 'gold', lesson_id: 'A', strength: 'gold', next_review_date: '2026-12-01' }),
    row({ word: 'wilted', lesson_id: 'A', strength: 'flower', next_review_date: '2026-11-08' }),
    row({ word: 'today', lesson_id: 'B', strength: 'plant', next_review_date: TODAY }),
    row({ word: 'seen', lesson_id: 'B', strength: 'sprout', next_review_date: '2026-11-20' }),
  ];

  it('GIVEN rows WHEN shaped THEN each word reads its wilted strength and whether it is due', () => {
    const out = shapeWordMemory(rows, TODAY);
    const byWord = Object.fromEntries(out.words.map((w) => [w.word, w]));
    expect(byWord.wilted).toMatchObject({ lessonId: 'A', strength: 'plant', storedStrength: 'flower', due: true });
    expect(byWord.today).toMatchObject({ strength: 'plant', due: true });
    expect(byWord.gold).toMatchObject({ strength: 'gold', due: false });
  });

  it('GIVEN due and later words THEN due ones come first, soonest first, and the due count covers all lessons', () => {
    const out = shapeWordMemory(rows, TODAY);
    expect(out.words.map((w) => w.word)).toEqual(['wilted', 'today', 'seen', 'gold']);
    expect(out.dueCount).toBe(2);
    expect(out.today).toBe(TODAY);
  });

  it('GIVEN two lessons THEN a summary per lesson: seen, due, stored mastery (as words_mastered holds it), strengths read today', () => {
    const out = shapeWordMemory(rows, TODAY);
    expect(out.lessons).toEqual([
      { lessonId: 'A', seen: 2, due: 1, mastered: 2, byStrength: { sprout: 0, plant: 1, flower: 0, gold: 1 } },
      { lessonId: 'B', seen: 2, due: 1, mastered: 0, byStrength: { sprout: 1, plant: 1, flower: 0, gold: 0 } },
    ]);
  });

  it('GIVEN no rows THEN an empty memory, nothing due (unseen words are seeds, never due)', () => {
    expect(shapeWordMemory([], TODAY)).toEqual({ today: TODAY, dueCount: 0, words: [], lessons: [] });
  });
});
