import { describe, it, expect } from 'vitest';
import { deriveBragCardData, type BragCardInput } from './bragCard';

const base: BragCardInput = {
  gameMode: 'classic',
  isWinner: true,
  rank: 1,
  playerCount: 2,
  score: 312,
  wordsFound: 14,
  opponentName: 'Alice',
  opponentScore: 187,
  locale: 'en',
};

describe('deriveBragCardData — outcome / copy matrix', () => {
  it('winner head-to-head (2 players) → winner_2p names the rival (no score — the scoreline carries it)', () => {
    const d = deriveBragCardData(base);
    expect(d.outcome).toBe('winner_2p');
    expect(d.headlineKey).toBe('brag.headline.crushed');
    expect(d.headlineParams).toEqual({ name: 'Alice' });
  });

  it('winner in a big match (>2 players) WITH a runner-up → names the rival + "and N others"', () => {
    // sortedScores is desc, so the first non-you player when you won is the runner-up.
    const d = deriveBragCardData({ ...base, playerCount: 4, rank: 1 });
    expect(d.outcome).toBe('winner_np');
    expect(d.headlineKey).toBe('brag.headline.topped'); // named-rival variant
    expect(d.headlineParams).toEqual({ name: 'Alice', count: 2 }); // count = playerCount-2
  });

  it('winner in a big match with NO named rival → anonymous "won" fallback', () => {
    const d = deriveBragCardData({ ...base, playerCount: 4, rank: 1, opponentName: undefined });
    expect(d.outcome).toBe('winner_np');
    expect(d.headlineKey).toBe('brag.headline.won');
    expect(d.headlineParams).toEqual({ count: 3 }); // everyone = playerCount-1
  });

  it('non-winner WITH a rival (the winner) → revenge framing naming the winner', () => {
    // when you lose, the first non-you player is the winner (index 0).
    const d = deriveBragCardData({ ...base, isWinner: false, rank: 3, playerCount: 4 });
    expect(d.outcome).toBe('non_winner');
    expect(d.headlineKey).toBe('brag.headline.revenge'); // named-rival variant
    expect(d.headlineParams).toEqual({ name: 'Alice' });
  });

  it('non-winner with NO named rival → anonymous "challenge" taunt (no numbers)', () => {
    const d = deriveBragCardData({ ...base, isWinner: false, rank: 3, playerCount: 4, opponentName: undefined });
    expect(d.outcome).toBe('non_winner');
    expect(d.headlineKey).toBe('brag.headline.challenge');
    expect(d.headlineParams).toEqual({});
  });

  it('no headline embeds the score/opponent — the face-off scoreline owns the numbers', () => {
    // Guards the dup the brief attacks: headlines boast, the scoreline counts.
    const cases: BragCardInput[] = [
      base,
      { ...base, playerCount: 4 },
      { ...base, playerCount: 4, opponentName: undefined },
      { ...base, isWinner: false, rank: 3, playerCount: 4 },
      { ...base, isWinner: false, rank: 3, playerCount: 4, opponentName: undefined },
    ];
    for (const c of cases) {
      const p = deriveBragCardData(c).headlineParams;
      expect(p).not.toHaveProperty('score');
      expect(p).not.toHaveProperty('opponent');
    }
  });

  it('winner 2P but missing opponent name → falls back to anonymous winner_np framing', () => {
    const d = deriveBragCardData({ ...base, opponentName: undefined });
    expect(d.outcome).toBe('winner_np');
    expect(d.headlineKey).toBe('brag.headline.won');
  });
});

describe('deriveBragCardData — rival face-off (every game has a named rival)', () => {
  it('exposes the named rival + score for a head-to-head win', () => {
    const d = deriveBragCardData(base);
    expect(d.rival).toEqual({ name: 'Alice', score: 187 });
    expect(d.othersCount).toBe(0);
  });

  it('exposes the runner-up rival + "others" count for an N-player win', () => {
    const d = deriveBragCardData({ ...base, playerCount: 5, rank: 1 });
    expect(d.rival).toEqual({ name: 'Alice', score: 187 });
    expect(d.othersCount).toBe(3); // playerCount-2 (you + the named rival)
  });

  it('exposes the winner as the rival when you lost', () => {
    const d = deriveBragCardData({ ...base, isWinner: false, rank: 4, playerCount: 4 });
    expect(d.rival).toEqual({ name: 'Alice', score: 187 });
    expect(d.othersCount).toBe(2);
  });

  it('no named rival → rival undefined, othersCount counts everyone beaten', () => {
    const d = deriveBragCardData({ ...base, playerCount: 4, rank: 1, opponentName: undefined });
    expect(d.rival).toBeUndefined();
    expect(d.othersCount).toBe(3); // playerCount-1
  });
});

describe('deriveBragCardData — hero stat per mode', () => {
  it('blast → combo hero', () => {
    const d = deriveBragCardData({ ...base, gameMode: 'blast', maxCombo: 7 });
    expect(d.hero.kind).toBe('combo');
    expect(d.hero.primary).toBe('7×');
  });

  it('word-hunt → longest-word hero (uppercased)', () => {
    const d = deriveBragCardData({ ...base, gameMode: 'word-hunt', longestWord: 'quantum' });
    expect(d.hero.kind).toBe('longest');
    expect(d.hero.primary).toBe('QUANTUM');
  });

  it('word-hunt with no longest word → falls back to points hero', () => {
    const d = deriveBragCardData({ ...base, gameMode: 'word-hunt', longestWord: undefined });
    expect(d.hero.kind).toBe('points');
    expect(d.hero.primary).toBe('312');
  });

  it('blast with no combo → falls back to points hero', () => {
    const d = deriveBragCardData({ ...base, gameMode: 'blast', maxCombo: 0 });
    expect(d.hero.kind).toBe('points');
  });

  it('classic → points hero', () => {
    const d = deriveBragCardData(base);
    expect(d.hero.kind).toBe('points');
    expect(d.hero.primary).toBe('312');
  });
});

describe('deriveBragCardData — accent + RTL', () => {
  it('accent keyed to mode', () => {
    expect(deriveBragCardData({ ...base, gameMode: 'classic' }).accent).toBe('lime');
    expect(deriveBragCardData({ ...base, gameMode: 'blast' }).accent).toBe('pink');
    expect(deriveBragCardData({ ...base, gameMode: 'word-hunt' }).accent).toBe('purple');
    expect(deriveBragCardData({ ...base, gameMode: 'wheel-rush' }).accent).toBe('cyan');
  });

  it('Hebrew locale → isRTL true', () => {
    expect(deriveBragCardData({ ...base, locale: 'he' }).isRTL).toBe(true);
    expect(deriveBragCardData({ ...base, locale: 'en' }).isRTL).toBe(false);
  });
});

describe('deriveBragShareText', () => {
  const base = {
    gameMode: 'classic',
    isWinner: true,
    rank: 1,
    playerCount: 2,
    score: 312,
    wordsFound: 14,
    opponentName: 'Alice',
    opponentScore: 187,
    locale: 'en',
  } as BragCardInput;

  it('boasts the win over the named rival with the scoreline', async () => {
    const { deriveBragShareText, deriveBragCardData } = await import('./bragCard');
    const out = deriveBragShareText(deriveBragCardData(base), 312);
    expect(out.key).toBe('brag.shareTextWin');
    expect(out.params).toEqual({ name: 'Alice', score: 312, rivalScore: 187 });
  });

  it('frames a loss as a call for backup against the winner', async () => {
    const { deriveBragShareText, deriveBragCardData } = await import('./bragCard');
    const out = deriveBragShareText(
      deriveBragCardData({ ...base, isWinner: false, rank: 3, playerCount: 4 }),
      120
    );
    expect(out.key).toBe('brag.shareTextLoss');
    expect(out.params).toEqual({ name: 'Alice', score: 120, rivalScore: 187 });
  });

  it('falls back to a score-only boast when no rival is known', async () => {
    const { deriveBragShareText, deriveBragCardData } = await import('./bragCard');
    const out = deriveBragShareText(
      deriveBragCardData({ ...base, opponentName: undefined, opponentScore: undefined }),
      312
    );
    expect(out.key).toBe('brag.shareTextSolo');
    expect(out.params).toEqual({ score: 312 });
  });
});
