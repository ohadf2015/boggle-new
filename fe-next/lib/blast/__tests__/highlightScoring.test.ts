import { describe, it, expect } from 'vitest';
import { rankMoments } from '../highlightScoring';
import type { HighlightEvent, WordSubmitEvent } from '../highlightTypes';

function wordEvent(over: Partial<WordSubmitEvent>): WordSubmitEvent {
  return {
    kind: 'word',
    t: 0,
    word: 'CAT',
    path: [],
    score: 30,
    combo: 0,
    specialTilesHit: [],
    preGrid: [],
    postGrid: [],
    effectsFired: [],
    ...over,
  };
}

describe('rankMoments', () => {
  it('returns empty array for empty events', () => {
    expect(rankMoments([])).toEqual([]);
  });

  it('ranks by epicness desc', () => {
    const events: HighlightEvent[] = [
      wordEvent({ word: 'A', score: 10 }),
      wordEvent({ word: 'B', score: 100 }),
      wordEvent({ word: 'C', score: 50 }),
    ];
    const ranked = rankMoments(events);
    expect(ranked.map((r) => r.event.word)).toEqual(['B', 'C', 'A']);
  });

  it('flags top word with caption=biggestWord', () => {
    const events: HighlightEvent[] = [
      wordEvent({ word: 'BIG', score: 200 }),
      wordEvent({ word: 'SM', score: 20 }),
    ];
    expect(rankMoments(events)[0].caption).toBe('biggestWord');
  });

  it('flags combo>=3 with caption=tripleCombo', () => {
    const events: HighlightEvent[] = [
      wordEvent({ word: 'COMBO', score: 50, combo: 3 }),
      wordEvent({ word: 'BIG', score: 200 }),
    ];
    const combo = rankMoments(events).find((r) => r.event.word === 'COMBO');
    expect(combo?.caption).toBe('tripleCombo');
  });

  it('always promotes final-clear word above others', () => {
    const events: HighlightEvent[] = [
      wordEvent({ word: 'BIG', score: 500, t: 100 }),
      wordEvent({ word: 'CLEAR', score: 30, t: 200 }),
      { kind: 'end', t: 250, reason: 'cleared', finalScore: 530 },
    ];
    const ranked = rankMoments(events);
    expect(ranked[0].event.word).toBe('CLEAR');
    expect(ranked[0].caption).toBe('finalClear');
    expect(ranked[0].isFinalClear).toBe(true);
  });

  it('does not promote final word on dead-end', () => {
    const events: HighlightEvent[] = [
      wordEvent({ word: 'BIG', score: 500, t: 100 }),
      wordEvent({ word: 'LAST', score: 30, t: 200 }),
      { kind: 'end', t: 250, reason: 'deadEnd', finalScore: 530 },
    ];
    expect(rankMoments(events)[0].event.word).toBe('BIG');
  });

  it('flags >=2 unique special tiles as specialChain', () => {
    const events: HighlightEvent[] = [
      wordEvent({
        word: 'X',
        score: 50,
        specialTilesHit: ['bomb', 'lightning'],
      }),
    ];
    expect(rankMoments(events)[0].caption).toBe('specialChain');
  });
});
