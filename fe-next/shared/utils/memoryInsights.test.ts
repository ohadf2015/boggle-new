import { describe, it, expect } from 'vitest';
import { computeMemoryInsights } from './memoryInsights';

describe('computeMemoryInsights', () => {
  it('reports an honest +1 word/session gain over last week', () => {
    const r = computeMemoryInsights({
      thisWeek: { sessions: 5, avgWordsFound: 6 },
      lastWeek: { sessions: 4, avgWordsFound: 5 },
      memoryScore: { thisWeek: 54, lastWeek: 50 },
    });
    expect(r.hasBaseline).toBe(true);
    expect(r.words?.deltaAbs).toBe(1);
    expect(r.memory?.deltaPct).toBe(8); // (54-50)/50 = 8%
  });

  it('rounds fractional words to one decimal', () => {
    const r = computeMemoryInsights({
      thisWeek: { sessions: 3, avgWordsFound: 6.33 },
      lastWeek: { sessions: 3, avgWordsFound: 5.0 },
      memoryScore: { thisWeek: 0, lastWeek: 0 },
    });
    expect(r.words?.deltaAbs).toBe(1.3);
    expect(r.memory).toBeNull(); // no memory score recorded
  });

  it('has no baseline when last week had no sessions (first week)', () => {
    const r = computeMemoryInsights({
      thisWeek: { sessions: 2, avgWordsFound: 4 },
      lastWeek: { sessions: 0, avgWordsFound: 0 },
      memoryScore: { thisWeek: 40, lastWeek: 0 },
    });
    expect(r.hasBaseline).toBe(false);
    // deltaAbs falls back to the raw average, not a fake gain vs zero
    expect(r.words?.deltaAbs).toBe(4);
    expect(r.memory?.deltaPct).toBeNull(); // can't compute % without a baseline
  });

  it('returns null words when the player has not played this week', () => {
    const r = computeMemoryInsights({
      thisWeek: { sessions: 0, avgWordsFound: 0 },
      lastWeek: { sessions: 3, avgWordsFound: 5 },
      memoryScore: { thisWeek: 50, lastWeek: 50 },
    });
    expect(r.words).toBeNull();
    expect(r.memory?.deltaPct).toBe(0);
  });

  it('reports a decline honestly (negative delta)', () => {
    const r = computeMemoryInsights({
      thisWeek: { sessions: 3, avgWordsFound: 4 },
      lastWeek: { sessions: 3, avgWordsFound: 6 },
      memoryScore: { thisWeek: 45, lastWeek: 50 },
    });
    expect(r.words?.deltaAbs).toBe(-2);
    expect(r.memory?.deltaPct).toBe(-10);
  });
});
