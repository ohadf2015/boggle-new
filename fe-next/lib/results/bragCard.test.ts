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
  it('winner head-to-head (2 players) → winner_2p with rival name + scores', () => {
    const d = deriveBragCardData(base);
    expect(d.outcome).toBe('winner_2p');
    expect(d.headlineKey).toBe('brag.headline.crushed');
    expect(d.headlineParams).toMatchObject({ name: 'Alice', score: 312, opponent: 187 });
  });

  it('winner in a big match (>2 players) → winner_np with beaten count', () => {
    const d = deriveBragCardData({ ...base, playerCount: 4, rank: 1 });
    expect(d.outcome).toBe('winner_np');
    expect(d.headlineKey).toBe('brag.headline.won');
    expect(d.headlineParams).toMatchObject({ count: 3 }); // beat playerCount-1
  });

  it('non-winner still shares — challenge framing with rank', () => {
    const d = deriveBragCardData({ ...base, isWinner: false, rank: 3, playerCount: 4 });
    expect(d.outcome).toBe('non_winner');
    expect(d.headlineKey).toBe('brag.headline.challenge');
    expect(d.headlineParams).toMatchObject({ score: 312, rank: 3 });
  });

  it('winner 2P but missing opponent name → falls back to winner_np framing', () => {
    const d = deriveBragCardData({ ...base, opponentName: undefined });
    expect(d.outcome).toBe('winner_np');
    expect(d.headlineKey).toBe('brag.headline.won');
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
