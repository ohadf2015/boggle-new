import { describe, it, expect } from 'vitest';
import { heroBubble } from '../heroBubble';

const base = { ready: true, roundsPlayed: 0, streak: 0, atRisk: false };

describe('heroBubble', () => {
  it('given inputs still resolving, then there is no line yet', () => {
    expect(heroBubble({ ...base, ready: false, streak: 5 })).toBeNull();
  });

  it('given a first-time guest, then the mascot asks for a word battle', () => {
    expect(heroBubble(base)).toEqual({ key: 'homePlay.bubbleFirst' });
  });

  it('given a returning guest, then the mascot welcomes them back', () => {
    expect(heroBubble({ ...base, roundsPlayed: 3 })).toEqual({ key: 'homePlay.bubbleBack' });
  });

  it('given a signed-in player with a name, then the welcome uses the name', () => {
    expect(heroBubble({ ...base, name: 'Noa' })).toEqual({ key: 'homePlay.bubbleBackName', params: { name: 'Noa' } });
  });

  it('given a running streak of 2+, then the mascot cheers the streak', () => {
    expect(heroBubble({ ...base, roundsPlayed: 9, name: 'Noa', streak: 4 })).toEqual({ key: 'homePlay.bubbleStreak', params: { n: 4 } });
  });

  it('given a 1-day streak, then it reads as a plain welcome back (no "1-day streak!")', () => {
    expect(heroBubble({ ...base, roundsPlayed: 1, streak: 1 })).toEqual({ key: 'homePlay.bubbleBack' });
  });

  it('given a streak at risk, then the mascot warns to play today', () => {
    expect(heroBubble({ ...base, streak: 4, atRisk: true })).toEqual({ key: 'dailyStreak.flame.atRisk', params: { n: 4 } });
  });
});
