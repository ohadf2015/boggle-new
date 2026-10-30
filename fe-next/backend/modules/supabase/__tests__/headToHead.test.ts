import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const { logger } = vi.hoisted(() => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../../utils/logger', () => ({ default: logger }));

import { buildHeadToHeadPairs, recordHeadToHead, H2H_WRITE_TIMEOUT_MS } from '../headToHead';

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const C = '00000000-0000-0000-0000-00000000000c';

describe('buildHeadToHeadPairs', () => {
  it('Given two players, Then one pair ordered by id with the winner credited on the right side', () => {
    expect(buildHeadToHeadPairs([{ authUserId: B, score: 50 }, { authUserId: A, score: 30 }])).toEqual([
      { player1_id: A, player2_id: B, player1_wins: 0, player2_wins: 1, draws: 0, player1_score: 30, player2_score: 50 },
    ]);
  });

  it('Given equal scores, Then the pair is a draw', () => {
    expect(buildHeadToHeadPairs([{ authUserId: A, score: 40 }, { authUserId: B, score: 40 }])).toEqual([
      { player1_id: A, player2_id: B, player1_wins: 0, player2_wins: 0, draws: 1, player1_score: 40, player2_score: 40 },
    ]);
  });

  it('Given three players, Then every pair once', () => {
    const pairs = buildHeadToHeadPairs([
      { authUserId: C, score: 10 },
      { authUserId: A, score: 30 },
      { authUserId: B, score: 20 },
    ]);
    expect(pairs.map((p) => `${p.player1_id.slice(-1)}${p.player2_id.slice(-1)}:${p.player1_wins}${p.player2_wins}${p.draws}`).sort()).toEqual([
      'ab:100',
      'ac:100',
      'bc:100',
    ]);
  });

  it('Given one account under two names, Then it never pairs with itself and keeps its best score', () => {
    const pairs = buildHeadToHeadPairs([
      { authUserId: A, score: 10 },
      { authUserId: A, score: 60 },
      { authUserId: B, score: 50 },
    ]);
    expect(pairs).toEqual([
      { player1_id: A, player2_id: B, player1_wins: 1, player2_wins: 0, draws: 0, player1_score: 60, player2_score: 50 },
    ]);
  });

  it('Given more than 8 players, Then only the top 8 by score are paired (28 pairs)', () => {
    const players = Array.from({ length: 10 }, (_, i) => ({ authUserId: `id-${String(i).padStart(2, '0')}`, score: i }));
    const pairs = buildHeadToHeadPairs(players);
    expect(pairs).toHaveLength(28);
    const ids = new Set(pairs.flatMap((p) => [p.player1_id, p.player2_id]));
    expect(ids.has('id-00')).toBe(false);
    expect(ids.has('id-01')).toBe(false);
  });
});

function client(rpc: ReturnType<typeof vi.fn>) {
  return { rpc } as never;
}

const auth = {
  Alice: { authUserId: A },
  Bob: { authUserId: B },
  Guest: { guestTokenHash: 'hash' },
};
const scores = [
  { username: 'Alice', score: 80 },
  { username: 'Bob', score: 60 },
  { username: 'Guest', score: 99 },
  { username: 'Bot', score: 120 },
];

describe('recordHeadToHead', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('Given a non-classroom room with two signed-in humans, Then one batched RPC with only their pair', async () => {
    const rpc = vi.fn(async () => ({ data: 1, error: null }));
    const outcome = await recordHeadToHead('ROOM', scores as never, auth as never, {
      client: client(rpc),
      isClassroomRoom: async () => false,
    });
    expect(outcome).toBe('written');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('record_head_to_head_results', {
      p_pairs: [{ player1_id: A, player2_id: B, player1_wins: 1, player2_wins: 0, draws: 0, player1_score: 80, player2_score: 60 }],
    });
    expect(logger.info).toHaveBeenCalledWith('H2H', expect.stringContaining('outcome=written'));
  });

  it('Given a classroom room, Then nothing is written and the skip is logged', async () => {
    const rpc = vi.fn();
    const outcome = await recordHeadToHead('ROOM', scores as never, auth as never, {
      client: client(rpc),
      isClassroomRoom: async () => true,
    });
    expect(outcome).toBe('skipped');
    expect(rpc).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('H2H', expect.stringContaining('reason=classroom'));
  });

  it('Given the room kind cannot be resolved, Then it fails closed', async () => {
    const rpc = vi.fn();
    const outcome = await recordHeadToHead('ROOM', scores as never, auth as never, {
      client: client(rpc),
      isClassroomRoom: async () => null,
    });
    expect(outcome).toBe('skipped');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('Given only one signed-in human (rest guests/bots), Then nothing is written', async () => {
    const rpc = vi.fn();
    const outcome = await recordHeadToHead('ROOM', scores as never, { Alice: { authUserId: A }, Guest: { guestTokenHash: 'h' } } as never, {
      client: client(rpc),
      isClassroomRoom: async () => false,
    });
    expect(outcome).toBe('skipped');
    expect(rpc).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('H2H', expect.stringContaining('reason=fewer_than_2_humans'));
  });

  it('Given the RPC errors, Then it logs an error and resolves without throwing', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: 'boom' } }));
    const outcome = await recordHeadToHead('ROOM', scores as never, auth as never, {
      client: client(rpc),
      isClassroomRoom: async () => false,
    });
    expect(outcome).toBe('error');
    expect(logger.error).toHaveBeenCalledWith('H2H', expect.stringContaining('boom'));
  });

  it('Given the RPC rejects, Then it logs an error and resolves without throwing', async () => {
    const rpc = vi.fn(async () => {
      throw new Error('socket hang up');
    });
    const outcome = await recordHeadToHead('ROOM', scores as never, auth as never, {
      client: client(rpc),
      isClassroomRoom: async () => false,
    });
    expect(outcome).toBe('error');
    expect(logger.error).toHaveBeenCalledWith('H2H', expect.stringContaining('socket hang up'));
  });

  it('Given the RPC hangs past the cap, Then it stops waiting and logs an unknown outcome', async () => {
    vi.useFakeTimers();
    const rpc = vi.fn(() => new Promise(() => {}));
    const pending = recordHeadToHead('ROOM', scores as never, auth as never, {
      client: client(rpc),
      isClassroomRoom: async () => false,
    });
    await vi.advanceTimersByTimeAsync(H2H_WRITE_TIMEOUT_MS + 1);
    await expect(pending).resolves.toBe('timeout');
    expect(logger.warn).toHaveBeenCalledWith('H2H', expect.stringContaining('outcome unknown'));
  });

  it('Given Supabase is not configured, Then it skips and logs', async () => {
    const outcome = await recordHeadToHead('ROOM', scores as never, auth as never, {
      client: null,
      isClassroomRoom: async () => false,
    });
    expect(outcome).toBe('skipped');
    expect(logger.info).toHaveBeenCalledWith('H2H', expect.stringContaining('reason=no_client'));
  });
});
