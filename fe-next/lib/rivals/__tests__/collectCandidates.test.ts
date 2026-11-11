import { describe, it, expect } from 'vitest';
import { collectCandidates } from '../collectCandidates';

const NOW = Date.parse('2026-11-12T12:00:00Z');
const row = (identity: string, total: number, publicName = true) => ({ identity, name: identity.toUpperCase(), total, publicName, customAvatar: null });

describe('collectCandidates', () => {
  it('Given today\'s board, Then neighbours inside the window, the nearest below and friends anywhere on it are candidates', () => {
    const { candidates, myScore } = collectCandidates({
      mode: 'daily', myUserId: 'me', myIdentity: 'u:me', now: NOW,
      board: [row('u:top', 2000), row('u:fr', 1500), row('u:near', 520), row('u:me', 500), row('u:hidden', 495, false), row('g:low', 300)],
      friendIds: ['fr'],
    });
    expect(myScore).toBe(500);
    const byKey = Object.fromEntries(candidates.map((c) => [c.key, c]));
    expect(Object.keys(byKey).sort()).toEqual(['fr', 'g:low', 'near']);
    expect(byKey.fr).toMatchObject({ userId: 'fr', friend: true, onTodayBoard: true, skill: { theirs: 1500, source: 'daily' } });
    expect(byKey['g:low']).toMatchObject({ userId: undefined, boardName: 'G:LOW' });
  });

  it('Given relation sources, Then one candidate per person merges friend, record and shared games', () => {
    const { candidates } = collectCandidates({
      mode: 'blast', myUserId: 'me', now: NOW,
      friendIds: ['a'],
      h2h: [{ player1_id: 'a', player2_id: 'me', player1_wins: 1, player2_wins: 2, draws: 0, last_game_at: '2026-11-10T00:00:00Z' }],
      coPlays: [
        { userId: 'a', gameCode: 'G1', at: '2026-11-10T00:00:00Z' },
        { userId: 'a', gameCode: 'G2', at: '2026-11-11T00:00:00Z' },
        { userId: 'a', gameCode: 'G2', at: '2026-11-11T00:00:01Z' },
        { userId: 'b', gameCode: 'G1', at: '2026-11-10T00:00:00Z' },
        { userId: 'me', gameCode: 'G1', at: '2026-11-10T00:00:00Z' },
      ],
    });
    const a = candidates.find((c) => c.key === 'a')!;
    expect(a).toMatchObject({ friend: true, record: { wins: 2, losses: 1, draws: 0 }, recordAt: '2026-11-10T00:00:00Z', coPlay: { count: 2, lastAt: '2026-11-11T00:00:01Z' } });
    expect(candidates.find((c) => c.key === 'b')?.coPlay?.count).toBe(1);
    expect(candidates.some((c) => c.key === 'me')).toBe(false);
  });

  it('Given this game\'s opponents, Then they count as a shared game just now', () => {
    const { candidates } = collectCandidates({ mode: 'multiplayer', myUserId: 'me', now: NOW, opponentUserIds: ['x'] });
    expect(candidates[0]).toMatchObject({ key: 'x', coPlay: { count: 1, lastAt: new Date(NOW).toISOString() } });
  });

  it('Given this game is already in the shared-games rows, Then it is not counted twice', () => {
    const { candidates } = collectCandidates({
      mode: 'multiplayer', myUserId: 'me', now: NOW, opponentUserIds: ['x'],
      coPlays: [{ userId: 'x', gameCode: 'ROOM', at: new Date(NOW - 60_000).toISOString() }],
    });
    expect(candidates[0].coPlay?.count).toBe(1);
  });

  it('Given league and weekly ghost, Then each carries its own scale', () => {
    const { candidates } = collectCandidates({
      mode: 'tower', myUserId: 'me', now: NOW,
      league: { above: { userId: 'l', username: 'L', avatar: '', score: 120, position: 1 }, below: null, player: { position: 2, score: 100 } },
      weekly: { rivalId: 'w', rivalScore: 900, playerScore: 800 },
    });
    expect(candidates.find((c) => c.key === 'l')?.skill).toEqual({ theirs: 120, mine: 100, source: 'league' });
    expect(candidates.find((c) => c.key === 'w')?.skill).toEqual({ theirs: 900, mine: 800, source: 'ghost' });
  });

  it('Given quick play ghosts, Then synthetic ones are skipped', () => {
    const { candidates } = collectCandidates({ mode: 'quickPlay', myUserId: null, myScore: 60, now: NOW, ghosts: [{ userId: 'synthetic:1', scorePct: 61 }, { userId: 'q', scorePct: 70 }] });
    expect(candidates.map((c) => c.key)).toEqual(['q']);
  });

  it('Given friends of friends, Then only existing candidates are marked', () => {
    const { candidates } = collectCandidates({
      mode: 'blast', myUserId: 'me', now: NOW, friendIds: ['f'], opponentUserIds: ['x'], fofIds: ['x', 'stranger'],
    });
    expect(candidates.find((c) => c.key === 'x')?.fof).toBe(true);
    expect(candidates.some((c) => c.key === 'stranger')).toBe(false);
  });
});
