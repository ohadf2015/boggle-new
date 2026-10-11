import { describe, it, expect } from 'vitest';
import { withBlastCredit } from '../withBlastCredit';
import type { WordFeedback } from '@/components/game/WordFormingArea';

const accepted = (word: string, score: number) => ({ id: `a-${word}`, type: 'accepted', word, score, timestamp: 1 }) as WordFeedback;

describe('withBlastCredit', () => {
  it('given Blast credited more than the base word score, then the shown points are what the score gains', () => {
    expect(withBlastCredit(accepted('WANTY', 50), { word: 'wanty', score: 61 }, false)?.score).toBe(61);
  });

  it('given the credit belongs to another word, then the feedback is shown as is', () => {
    expect(withBlastCredit(accepted('DOG', 5), { word: 'cat', score: 9 }, false)?.score).toBe(5);
  });

  it('given the server owns the points (multiplayer), then no number is shown', () => {
    const shown = withBlastCredit(accepted('DOG', 5), { word: 'dog', score: 9 }, true);
    expect(shown?.type).toBe('accepted');
    expect(shown?.score).toBeUndefined();
  });

  it('given no feedback, then nothing is shown', () => {
    expect(withBlastCredit(null, null, false)).toBeNull();
  });
});
