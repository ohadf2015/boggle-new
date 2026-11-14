import { describe, expect, it } from 'vitest';
import { mpCoinAwardId } from '@/hooks/useResultsSideEffects';

describe('mpCoinAwardId', () => {
  const player = { score: 18, allWords: [{ word: 'casa', score: 2, validated: true }] };

  it('gives the same id when the same results screen mounts again', () => {
    const scores = [{ score: 18 }, { score: 9 }];
    expect(mpCoinAwardId('ABC123', scores, player)).toBe(mpCoinAwardId('ABC123', [{ score: 18 }, { score: 9 }], { ...player }));
  });

  it('gives a new id for a rematch in the same room with different results', () => {
    expect(mpCoinAwardId('ABC123', [{ score: 18 }, { score: 9 }], player)).not.toBe(
      mpCoinAwardId('ABC123', [{ score: 22 }, { score: 9 }], { ...player, score: 22 }),
    );
  });

  it('gives a different id per room', () => {
    expect(mpCoinAwardId('ABC123', [{ score: 18 }], player)).not.toBe(mpCoinAwardId('XYZ789', [{ score: 18 }], player));
  });
});
