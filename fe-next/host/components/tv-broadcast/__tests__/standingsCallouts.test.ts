import { dropBrokenPhotoFinish, dropWaitedTooLong, photoFinishPair, rankByScore, STALE_CALLOUT_MS } from '../standingsCallouts';

describe('rankByScore', () => {
  it('orders by score without touching the payload array', () => {
    const board = [{ username: 'A', score: 20 }, { username: 'B', score: 8 }, { username: 'C', score: 45 }];
    expect(rankByScore(board).map((e) => e.username)).toEqual(['C', 'A', 'B']);
    expect(board.map((e) => e.username)).toEqual(['A', 'B', 'C']);
  });
});

describe('photoFinishPair', () => {
  it('pairs the two highest scores, not the first two rows of the payload', () => {
    expect(photoFinishPair([{ username: 'A', score: 20 }, { username: 'B', score: 8 }, { username: 'C', score: 45 }])).toBeNull();
    expect(photoFinishPair([{ username: 'A', score: 40 }, { username: 'B', score: 8 }, { username: 'C', score: 45 }])).toEqual({ first: 'C', second: 'A', gap: 5 });
  });

  it('does not call 51 vs 17 close', () => {
    expect(photoFinishPair([{ username: 'QA R2 1', score: 51 }, { username: 'QA R2 2', score: 17 }])).toBeNull();
  });

  it('needs both players on the board: one scorer against a zero is not a race', () => {
    expect(photoFinishPair([{ username: 'A', score: 3 }, { username: 'B', score: 0 }])).toBeNull();
  });

  it('allows 5 points early and about 10% of the leader later, capped at 15', () => {
    expect(photoFinishPair([{ username: 'A', score: 12 }, { username: 'B', score: 7 }])?.gap).toBe(5);
    expect(photoFinishPair([{ username: 'A', score: 12 }, { username: 'B', score: 6 }])).toBeNull();
    expect(photoFinishPair([{ username: 'A', score: 90 }, { username: 'B', score: 81 }])?.gap).toBe(9);
    expect(photoFinishPair([{ username: 'A', score: 90 }, { username: 'B', score: 80 }])).toBeNull();
    expect(photoFinishPair([{ username: 'A', score: 400 }, { username: 'B', score: 384 }])).toBeNull();
    expect(photoFinishPair([{ username: 'A', score: 400 }, { username: 'B', score: 385 }])?.gap).toBe(15);
  });

  it('needs two players', () => {
    expect(photoFinishPair([{ username: 'A', score: 10 }])).toBeNull();
  });
});

describe('stale callouts', () => {
  const at = (id: string, timestamp: number, extra: Record<string, unknown> = {}) => ({ id, type: 'overtake', timestamp, ...extra });

  it('drops callouts that waited in the queue past the stale window', () => {
    const now = 100_000;
    const out = dropWaitedTooLong([at('old', now - STALE_CALLOUT_MS - 1), at('new', now - 1000)], now);
    expect(out.map((n) => n.id)).toEqual(['new']);
  });

  it('drops a neck-and-neck pill once its pair is no longer the close top two', () => {
    const pill = { id: 'pf', type: 'photo_finish', timestamp: 0, pair: ['A', 'B'] as [string, string] };
    expect(dropBrokenPhotoFinish([pill], [{ username: 'A', score: 51 }, { username: 'B', score: 17 }])).toEqual([]);
    expect(dropBrokenPhotoFinish([pill], [{ username: 'B', score: 50 }, { username: 'A', score: 47 }])).toEqual([pill]);
    expect(dropBrokenPhotoFinish([pill], [{ username: 'A', score: 50 }, { username: 'C', score: 49 }, { username: 'B', score: 47 }])).toEqual([]);
  });

  it('keeps the list identity when nothing is dropped', () => {
    const list = [at('a', 1000)];
    expect(dropWaitedTooLong(list, 2000)).toBe(list);
    expect(dropBrokenPhotoFinish(list, [{ username: 'A', score: 1 }])).toBe(list);
  });
});
