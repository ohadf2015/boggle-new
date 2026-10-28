import { describe, it, expect } from 'vitest';
import {
  fromMpResults,
  fromSpResults,
  toBlastResultsView,
  type BlastResultsInput,
} from '../blastResultsViewModel';
import { rankBlastMpPlayers } from '../../legacy/blastMpRanking';
import { blastCollectionScore, type BlastCollectionScore } from '@/shared/utils/blastCollectionScore';
import type { BlastPlayerStats } from '@/shared/types/game';
import type { BlastResultsData } from '../../legacy/types';

const base: BlastResultsInput = { score: 500 };

const spResults = (over: Partial<BlastResultsData> = {}): BlastResultsData => ({
  finalScore: 820,
  tilesCleared: 60,
  totalTiles: 64,
  clearPercentage: 94,
  wordsFound: ['cat', 'quartz', 'jumbles', 'ox'],
  bestWord: 'QUARTZ',
  maxCombo: 4,
  stars: 3,
  wavesCompleted: 3,
  waveResults: [],
  sessionCoins: 12,
  ...over,
});

describe('toBlastResultsView — tiers', () => {
  it('Given a score above the previous best, Then tier is newBest with the delta', () => {
    const v = toBlastResultsView({ ...base, score: 900, personalBest: 700 });
    expect(v.tier).toBe('newBest');
    expect(v.isNewBest).toBe(true);
    expect(v.pbDelta).toBe(200);
  });

  it('Given no previous best, Then it is not a new best', () => {
    const v = toBlastResultsView({ ...base, personalBest: null, stars: 2 });
    expect(v.isNewBest).toBe(false);
    expect(v.pbDelta).toBeNull();
  });

  it('Given a run at 80% of the best, Then tier is high; 40% mid; below low', () => {
    expect(toBlastResultsView({ score: 800, personalBest: 1000 }).tier).toBe('high');
    expect(toBlastResultsView({ score: 400, personalBest: 1000 }).tier).toBe('mid');
    expect(toBlastResultsView({ score: 399, personalBest: 1000 }).tier).toBe('low');
  });

  it('Given a failed run, Then tier is low even with a high score', () => {
    expect(toBlastResultsView({ score: 5000, personalBest: 100, failed: true }).tier).toBe('low');
  });

  it('Given no best, Then MP rank decides: 1st high, top half mid, rest low', () => {
    expect(toBlastResultsView({ score: 10, rank: 1, totalPlayers: 4 }).tier).toBe('high');
    expect(toBlastResultsView({ score: 10, rank: 2, totalPlayers: 4 }).tier).toBe('mid');
    expect(toBlastResultsView({ score: 10, rank: 4, totalPlayers: 4 }).tier).toBe('low');
  });

  it('Given only stars, Then 3 stars high, 2 mid, 1 low', () => {
    expect(toBlastResultsView({ score: 1, stars: 3 }).tier).toBe('high');
    expect(toBlastResultsView({ score: 1, stars: 2 }).tier).toBe('mid');
    expect(toBlastResultsView({ score: 1, stars: 1 }).tier).toBe('low');
  });
});

describe('toBlastResultsView — stats', () => {
  it('Given no diamonds field, Then the diamonds chip shows 0', () => {
    const v = toBlastResultsView({ score: 1, coins: 3 });
    expect(v.stats.find((s) => s.id === 'diamonds')?.value).toBe(0);
    expect(v.stats.find((s) => s.id === 'coins')?.value).toBe(3);
  });

  it('Given no coins or bombs source field, Then those chips are omitted rather than reading 0', () => {
    const ids = toBlastResultsView({ score: 1 }).stats.map((s) => s.id);
    expect(ids).toEqual(['diamonds']);
  });

  it('Given a combo of 1 or no words, Then those chips are omitted', () => {
    const ids = toBlastResultsView({ score: 1, maxCombo: 1, wordsFound: [] }).stats.map((s) => s.id);
    expect(ids).not.toContain('combo');
    expect(ids).not.toContain('words');
  });

  it('Given the best word is also the longest, Then the longest cell is not repeated', () => {
    const v = toBlastResultsView({ score: 1, bestWord: 'jumbles', wordsFound: ['cat', 'jumbles'] });
    expect(v.bestWord).toBe('JUMBLES');
    expect(v.longestWord).toBeNull();
  });

  it('Given words, Then the longest word is derived when not provided', () => {
    const v = toBlastResultsView({ score: 1, wordsFound: ['cat', 'jumbles', 'quartz'] });
    expect(v.longestWord).toBe('JUMBLES');
  });

  it('Given coins and diamonds, Then both celebrations fire; confetti only on high tiers', () => {
    const low = toBlastResultsView({ score: 1, coins: 2, diamonds: 1, stars: 1 });
    expect(low.celebrate).toEqual({ coins: true, diamonds: true, confetti: false });
    const high = toBlastResultsView({ score: 1, stars: 3 });
    expect(high.celebrate).toEqual({ coins: false, diamonds: false, confetti: true });
  });
});

describe('toBlastResultsView — competitive', () => {
  it('Given a rival above, Then the next goal is the points needed to pass them', () => {
    const v = toBlastResultsView({ score: 500, rival: { name: 'Maya', score: 620 } });
    expect(v.nextGoal).toEqual({ kind: 'rival', name: 'Maya', gap: 121 });
    expect(v.nearMiss).toBe(false);
  });

  it('Given a rival within 10%, Then it is a near miss', () => {
    expect(toBlastResultsView({ score: 500, rival: { name: 'Maya', score: 540 } }).nearMiss).toBe(true);
  });

  it('Given no rival and a best not beaten, Then the goal is the personal best', () => {
    const v = toBlastResultsView({ score: 500, personalBest: 520 });
    expect(v.nextGoal).toEqual({ kind: 'personalBest', gap: 21 });
    expect(v.nearMiss).toBe(true);
  });

  it('Given first place with a runner-up, Then the goal reports the winning margin', () => {
    const v = toBlastResultsView({ score: 700, rank: 1, totalPlayers: 2, runnerUp: { name: 'Leo', score: 580 } });
    expect(v.nextGoal).toEqual({ kind: 'lead', name: 'Leo', gap: 120 });
  });

  it('Given a previous rank, Then rank delta is positive when climbing', () => {
    const v = toBlastResultsView({ score: 1, rank: 3, previousRank: 7, totalPlayers: 40 });
    expect(v.rank).toEqual({ current: 3, total: 40, delta: 4 });
  });
});

describe('fromSpResults', () => {
  it('maps SP payload fields including optional engine extras', () => {
    const input = fromSpResults({ ...spResults({ previousBest: 700, diamondsCollected: 2 }), bombsPopped: 5 });
    expect(input).toMatchObject({
      score: 820, coins: 12, diamonds: 2, bombsPopped: 5, maxCombo: 4,
      bestWord: 'QUARTZ', wavesReached: 3, personalBest: 700, failed: false, stars: 3,
    });
  });

  it('flags a run under 90% clear as failed', () => {
    expect(fromSpResults(spResults({ clearPercentage: 89 })).failed).toBe(true);
  });
});

describe('SP / MP parity', () => {
  it('Given the same run through SP and MP shapes, Then the shared view fields match', () => {
    const words = ['cat', 'quartz', 'jumbles', 'ox'];
    const sp = toBlastResultsView(fromSpResults({
      ...spResults({ finalScore: 820, wordsFound: words, bestWord: 'QUARTZ', maxCombo: 4, sessionCoins: 12, stars: 3, diamondsCollected: 2 }),
      bombsPopped: 5,
    }));
    const ranking = rankBlastMpPlayers([
      { username: 'me', score: 820, wordsFoundCount: 4, isCurrentPlayer: true },
    ]);
    const mp = toBlastResultsView(fromMpResults(ranking, {
      me: {
        maxCombo: 4, gemsCollected: 0, wordsFound: words, bestWord: 'QUARTZ', tilesCleared: 60,
        totalTileBonus: 0, boardClears: 0, diamondsCollected: 2, bombsPopped: 5, coinsCollected: 12,
      },
    }));
    const shared = (v: typeof sp) => ({
      score: v.score,
      stats: v.stats.filter((s) => s.id !== 'waves'),
      coinShower: v.celebrate.coins,
      bestWord: v.bestWord,
      longestWord: v.longestWord,
      diamondBurst: v.celebrate.diamonds,
    });
    expect(shared(mp)).toEqual(shared(sp));
  });
});

describe('fromMpResults', () => {
  it('uses the player ranked just above as the rival', () => {
    const ranking = rankBlastMpPlayers([
      { username: 'Maya', score: 620, wordsFoundCount: 0 },
      { username: 'me', score: 500, wordsFoundCount: 0, isCurrentPlayer: true },
      { username: 'Leo', score: 100, wordsFoundCount: 0 },
    ]);
    const input = fromMpResults(ranking, {});
    expect(input).toMatchObject({ score: 500, rank: 2, totalPlayers: 3, rival: { name: 'Maya', score: 620 } });
  });

  it('uses the runner-up when the current player won', () => {
    const ranking = rankBlastMpPlayers([
      { username: 'me', score: 700, wordsFoundCount: 0, isCurrentPlayer: true },
      { username: 'Leo', score: 580, wordsFoundCount: 0 },
    ]);
    expect(fromMpResults(ranking, {})).toMatchObject({ rival: null, runnerUp: { name: 'Leo', score: 580 } });
  });

  it('falls back to gemsCollected for MP stats saved before diamondsCollected', () => {
    const ranking = rankBlastMpPlayers([{ username: 'me', score: 1, wordsFoundCount: 0, isCurrentPlayer: true }]);
    const stats = { maxCombo: 0, gemsCollected: 3, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0, boardClears: 0 };
    expect(fromMpResults(ranking, { me: stats })?.diamonds).toBe(3);
  });

  it('builds the view from a payload shaped like the engine types', () => {
    const playerStats: Record<string, BlastPlayerStats> = {
      me: {
        maxCombo: 3, gemsCollected: 2, diamondsCollected: 2, coinsCollected: 8, bombsPopped: 4,
        wordsFound: ['quartz'], bestWord: 'QUARTZ', tilesCleared: 30, totalTileBonus: 0, boardClears: 0,
      },
    };
    const collection: Record<string, BlastCollectionScore> = { me: blastCollectionScore({ coins: 8, diamonds: 2 }) };
    const ranking = rankBlastMpPlayers([
      { username: 'rival', score: 900, wordsFoundCount: 0 },
      { username: 'me', score: 760, wordsFoundCount: 0, isCurrentPlayer: true },
    ]);
    const view = toBlastResultsView(fromMpResults(ranking, playerStats, collection)!);
    expect(view.stats).toEqual([
      { id: 'coins', value: 8 },
      { id: 'diamonds', value: 2 },
      { id: 'bombs', value: 4 },
      { id: 'combo', value: 3 },
      { id: 'words', value: 1 },
    ]);
    expect(view.collectionBonus).toEqual({ coinPoints: 160, diamondPoints: 300, total: 460 });
    expect(view.score).toBe(760);
  });

  it('has no collection bonus when the breakdown is absent or empty', () => {
    expect(toBlastResultsView({ score: 1 }).collectionBonus).toBeNull();
    expect(toBlastResultsView({ score: 1, scoreBreakdown: { coinPoints: 0, diamondPoints: 0, total: 1 } }).collectionBonus).toBeNull();
  });

  it('returns null when no current player is flagged', () => {
    const ranking = rankBlastMpPlayers([{ username: 'a', score: 1, wordsFoundCount: 0 }]);
    expect(fromMpResults(ranking, {})).toBeNull();
  });
});
