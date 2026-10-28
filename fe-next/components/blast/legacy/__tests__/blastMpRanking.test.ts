/**
 * blastMpRanking — pure logic tests (RED first).
 *
 * Covers the two things the redesign must guarantee:
 *  - first place is unambiguous (winner = highest score)
 *  - the current player's position is always derivable, even when not top-3
 */

import { describe, it, expect } from 'vitest';
import { blastCollectionScore } from '@/shared/utils/blastCollectionScore';
import { buildBlastMpResults, pickBlastCategoryWinners, rankBlastMpPlayers } from '../blastMpRanking';

describe('rankBlastMpPlayers', () => {
  const make = (username: string, score: number, isCurrentPlayer = false) => ({
    username,
    score,
    wordsFoundCount: 0,
    isCurrentPlayer,
  });

  it('sorts players by score descending and assigns 1-based rank', () => {
    const { ranked } = rankBlastMpPlayers([make('a', 100), make('b', 300), make('c', 200)]);
    expect(ranked.map((r) => r.username)).toEqual(['b', 'c', 'a']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('exposes the winner (rank 1) and the runners-up separately', () => {
    const { winner, runnersUp } = rankBlastMpPlayers([make('a', 100), make('b', 300)]);
    expect(winner?.username).toBe('b');
    expect(winner?.rank).toBe(1);
    expect(runnersUp.map((r) => r.username)).toEqual(['a']);
  });

  it('reports the current player position even when NOT in the top 3', () => {
    const { currentPosition, totalPlayers } = rankBlastMpPlayers([
      make('p1', 500),
      make('p2', 400),
      make('p3', 300),
      make('me', 100, true),
      make('p5', 50),
    ]);
    expect(currentPosition).toBe(4);
    expect(totalPlayers).toBe(5);
  });

  it('returns currentPosition null when no current player is flagged', () => {
    const { currentPosition } = rankBlastMpPlayers([make('a', 100), make('b', 200)]);
    expect(currentPosition).toBeNull();
  });

  it('handles an empty list without throwing', () => {
    const { ranked, winner, currentPosition, totalPlayers } = rankBlastMpPlayers([]);
    expect(ranked).toEqual([]);
    expect(winner).toBeNull();
    expect(currentPosition).toBeNull();
    expect(totalPlayers).toBe(0);
  });
});

describe('buildBlastMpResults', () => {
  const scores = [
    { username: 'me', score: 300, wordsFoundCount: 9, avatar: { customAvatar: { base: 'x' } as never } },
    { username: 'rival', score: 500, wordsFoundCount: 12 },
  ];

  it('flags the local player as current and threads the avatar through', () => {
    const out = buildBlastMpResults(scores, { boardClearedByLocal: false, localUsername: 'me' });
    const me = out.find((p) => p.username === 'me')!;
    const rival = out.find((p) => p.username === 'rival')!;
    expect(me.isCurrentPlayer).toBe(true);
    expect(rival.isCurrentPlayer).toBe(false);
    expect(me.avatar).toEqual({ customAvatar: { base: 'x' } });
  });

  it('marks board cleared only for the local player when they cleared it', () => {
    const out = buildBlastMpResults(scores, { boardClearedByLocal: true, localUsername: 'me' });
    expect(out.find((p) => p.username === 'me')!.boardCleared).toBe(true);
    expect(out.find((p) => p.username === 'rival')!.boardCleared).toBe(false);
  });

  it('pulls bestWord and maxCombo from optional playerStats when present', () => {
    const out = buildBlastMpResults(scores, {
      boardClearedByLocal: false,
      localUsername: 'me',
      playerStats: { rival: { maxCombo: 7, bestWord: 'BLASTER' } as never },
    });
    const rival = out.find((p) => p.username === 'rival')!;
    expect(rival.maxCombo).toBe(7);
    expect(rival.bestWord).toBe('BLASTER');
  });
});

describe('buildBlastMpResults — collection stats', () => {
  const scores = [{ username: 'me', score: 300 }, { username: 'old', score: 200 }];

  it('threads counts from playerStats and the server collection score from blastSummary.collection', () => {
    const out = buildBlastMpResults(scores, {
      boardClearedByLocal: false,
      localUsername: 'me',
      playerStats: { me: { coinsCollected: 6, diamondsCollected: 2 } },
      collection: { me: blastCollectionScore({ coins: 6, diamonds: 2 }) },
    });
    expect(out[0]).toMatchObject({
      coinsCollected: 6,
      diamondsCollected: 2,
      scoreBreakdown: { coinPoints: 120, diamondPoints: 300, total: 420 },
    });
  });

  it('falls back to the collection counts when playerStats predate the count fields', () => {
    const out = buildBlastMpResults(scores, {
      boardClearedByLocal: false,
      collection: { old: blastCollectionScore({ coins: 3, diamonds: 1 }) },
    });
    expect(out.find((p) => p.username === 'old')).toMatchObject({ coinsCollected: 3, diamondsCollected: 1 });
  });

  it('falls back to gemsCollected for diamonds and leaves absent fields undefined', () => {
    const out = buildBlastMpResults(scores, {
      boardClearedByLocal: false,
      playerStats: { old: { gemsCollected: 4 } },
    });
    const old = out.find((p) => p.username === 'old')!;
    expect(old.diamondsCollected).toBe(4);
    expect(old.coinsCollected).toBeUndefined();
    expect(old.scoreBreakdown).toBeUndefined();
  });
});

describe('pickBlastCategoryWinners', () => {
  const p = (username: string, score: number, coinsCollected?: number, diamondsCollected?: number) =>
    ({ username, score, wordsFoundCount: 0, coinsCollected, diamondsCollected });

  it('names the top collector of each kind', () => {
    const { ranked } = rankBlastMpPlayers([p('a', 500, 3, 1), p('b', 300, 9, 0), p('c', 100, 2, 4)]);
    expect(pickBlastCategoryWinners(ranked)).toEqual({ coinKing: 'b', mostDiamonds: 'c' });
  });

  it('breaks ties by placement and skips categories nobody scored in', () => {
    const { ranked } = rankBlastMpPlayers([p('low', 100, 5, 0), p('high', 400, 5, 0)]);
    expect(pickBlastCategoryWinners(ranked)).toEqual({ coinKing: 'high', mostDiamonds: null });
  });

  it('breaks a score tie in the standings by diamonds collected, matching the server', () => {
    const { ranked } = rankBlastMpPlayers([p('fewer', 500, 0, 1), p('more', 500, 0, 3)]);
    expect(ranked.map((r) => r.username)).toEqual(['more', 'fewer']);
  });

  it('returns nulls when no player carries collection stats', () => {
    const { ranked } = rankBlastMpPlayers([p('a', 1), p('b', 2)]);
    expect(pickBlastCategoryWinners(ranked)).toEqual({ coinKing: null, mostDiamonds: null });
  });
});
