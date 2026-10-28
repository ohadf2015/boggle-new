import { getLeaderboard, type ScoreGameBase } from '../scoreManager';

function blastGame(): ScoreGameBase {
  return {
    users: {
      ana: { username: 'ana', isHost: true, isBot: false } as never,
      ben: { username: 'ben', isHost: false, isBot: false } as never,
      cy: { username: 'cy', isHost: false, isBot: false } as never,
    },
    playerScores: { ana: 300, ben: 300, cy: 120 },
    playerWords: { ana: ['cat'], ben: ['dog'], cy: ['bin'] },
    blastModeState: {
      playerStats: {
        ana: { coinsCollected: 4, diamondsCollected: 0 },
        ben: { coinsCollected: 1, diamondsCollected: 2 },
      },
    },
  } as unknown as ScoreGameBase;
}

describe('getLeaderboard — blast collection', () => {
  it('exposes coins and diamonds on each row so the HUD can show them', () => {
    const board = getLeaderboard(blastGame());
    expect(board.find((p) => p.username === 'ana')).toMatchObject({ coinsCollected: 4, diamondsCollected: 0 });
    expect(board.find((p) => p.username === 'cy')).toMatchObject({ coinsCollected: 0, diamondsCollected: 0 });
  });

  it('breaks a score tie by diamonds collected', () => {
    expect(getLeaderboard(blastGame()).map((p) => p.username)).toEqual(['ben', 'ana', 'cy']);
  });

  it('leaves non-blast rows without collection fields', () => {
    const game = { ...blastGame(), blastModeState: undefined } as unknown as ScoreGameBase;
    expect(getLeaderboard(game)[0]).not.toHaveProperty('coinsCollected');
  });
});

describe('calculateGameScores — blast final ranking', () => {
  it('keeps collection points in the final total and breaks ties by diamonds', async () => {
    const { calculateGameScores } = await import('../scoringEngine');
    const game = {
      users: { ana: { username: 'ana' }, ben: { username: 'ben' } },
      playerWords: { ana: [], ben: [] },
      playerWordDetails: {},
      playerScores: { ana: 170, ben: 170 },
      playerEventBonuses: { ana: 170, ben: 170 },
      blastModeState: { playerStats: { ana: { diamondsCollected: 0 }, ben: { diamondsCollected: 1 } } },
    } as never;
    const results = calculateGameScores(game, {}, new Set(), new Set(), new Map(), { gameMode: 'blast' });
    expect(results.map((r) => [r.username, r.totalScore])).toEqual([['ben', 170], ['ana', 170]]);
  });
});
