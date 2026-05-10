/**
 * Rival lookup for daily-challenge push: pick a leaderboard neighbour who
 * already completed today's daily, then the cron sends a rival-themed push.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { findDailyChallengeRivals } from '../dailyChallengeRivals';

function makeBuilder(result: { data: unknown; error: unknown }) {
  const b: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'neq', 'is', 'in', 'gt', 'gte', 'lt', 'lte', 'not'];
  methods.forEach((m) => {
    b[m] = vi.fn().mockReturnValue(b);
  });
  b.then = (resolve: (v: unknown) => void) => resolve(result);
  return b;
}

const { mockFrom, leaderboardResult, puzzleAttemptsResult, wordHuntAttemptsResult } =
  vi.hoisted(() => ({
    mockFrom: vi.fn(),
    leaderboardResult: { data: [] as unknown[], error: null },
    puzzleAttemptsResult: { data: [] as unknown[], error: null },
    wordHuntAttemptsResult: { data: [] as unknown[], error: null },
  }));

vi.mock('../email', async () => {
  const actual = await vi.importActual<typeof import('../email')>('../email');
  return {
    ...actual,
    getSupabaseAdmin: () => ({ from: mockFrom }),
    getTodayDate: () => '2026-05-10',
  };
});

beforeEach(() => {
  leaderboardResult.data = [];
  puzzleAttemptsResult.data = [];
  wordHuntAttemptsResult.data = [];
  mockFrom.mockImplementation((table: string) => {
    if (table === 'leaderboard') return makeBuilder(leaderboardResult);
    if (table === 'daily_puzzle_attempts') return makeBuilder(puzzleAttemptsResult);
    if (table === 'daily_word_hunt_attempts') return makeBuilder(wordHuntAttemptsResult);
    return makeBuilder({ data: [], error: null });
  });
});

describe('findDailyChallengeRivals', () => {
  it('returns empty map when no recipients', async () => {
    const result = await findDailyChallengeRivals([]);
    expect(result.size).toBe(0);
  });

  it('returns null for recipient with no leaderboard row', async () => {
    leaderboardResult.data = [];
    wordHuntAttemptsResult.data = [{ player_id: 'rival-1', solved: true }];

    const result = await findDailyChallengeRivals(['user-1']);
    expect(result.get('user-1')).toBeNull();
  });

  it('returns null when no rival completed today', async () => {
    leaderboardResult.data = [
      { player_id: 'user-1', username: 'Me', avatar_image: 'https://x/me.png', total_score: 1000 },
      { player_id: 'rival-1', username: 'Rival', avatar_image: 'https://x/r.png', total_score: 1100 },
    ];
    wordHuntAttemptsResult.data = []; // nobody played
    puzzleAttemptsResult.data = [];

    const result = await findDailyChallengeRivals(['user-1']);
    expect(result.get('user-1')).toBeNull();
  });

  it('picks closest-by-score rival above the user', async () => {
    leaderboardResult.data = [
      { player_id: 'user-1', username: 'Me', avatar_image: 'https://x/me.png', total_score: 1000 },
      { player_id: 'rival-far', username: 'Far', avatar_image: 'https://x/f.png', total_score: 5000 },
      { player_id: 'rival-near', username: 'Near', avatar_image: 'https://x/n.png', total_score: 1050 },
    ];
    wordHuntAttemptsResult.data = [
      { player_id: 'rival-far', solved: true },
      { player_id: 'rival-near', solved: true },
    ];

    const result = await findDailyChallengeRivals(['user-1']);
    const rival = result.get('user-1');
    expect(rival).not.toBeNull();
    expect(rival!.username).toBe('Near');
    expect(rival!.direction).toBe('above');
    expect(rival!.scoreGap).toBe(50);
    expect(rival!.avatarImage).toBe('https://x/n.png');
  });

  it('picks closest-by-score rival below the user when only below ones played', async () => {
    leaderboardResult.data = [
      { player_id: 'user-1', username: 'Me', avatar_image: null, total_score: 1000 },
      { player_id: 'rival-below', username: 'Below', avatar_image: 'https://x/b.png', total_score: 950 },
    ];
    wordHuntAttemptsResult.data = [{ player_id: 'rival-below', solved: true }];

    const result = await findDailyChallengeRivals(['user-1']);
    const rival = result.get('user-1');
    expect(rival).not.toBeNull();
    expect(rival!.direction).toBe('below');
    expect(rival!.scoreGap).toBe(50);
  });

  it('excludes self from rivals even if user completed today', async () => {
    leaderboardResult.data = [
      { player_id: 'user-1', username: 'Me', avatar_image: null, total_score: 1000 },
    ];
    wordHuntAttemptsResult.data = [{ player_id: 'user-1', solved: true }];

    const result = await findDailyChallengeRivals(['user-1']);
    expect(result.get('user-1')).toBeNull();
  });

  it('counts wordhunt OR puzzle attempts as completion', async () => {
    leaderboardResult.data = [
      { player_id: 'user-1', username: 'Me', avatar_image: null, total_score: 1000 },
      { player_id: 'rival-1', username: 'R1', avatar_image: 'https://x/r.png', total_score: 1100 },
    ];
    puzzleAttemptsResult.data = [{ player_id: 'rival-1', solved: true }];
    wordHuntAttemptsResult.data = [];

    const result = await findDailyChallengeRivals(['user-1']);
    expect(result.get('user-1')!.username).toBe('R1');
  });

  it('skips rivals with no avatar_image (FCM imageUrl needs HTTPS)', async () => {
    leaderboardResult.data = [
      { player_id: 'user-1', username: 'Me', avatar_image: null, total_score: 1000 },
      { player_id: 'rival-noavatar', username: 'NoAvatar', avatar_image: null, total_score: 1050 },
      { player_id: 'rival-good', username: 'Good', avatar_image: 'https://x/g.png', total_score: 1200 },
    ];
    wordHuntAttemptsResult.data = [
      { player_id: 'rival-noavatar', solved: true },
      { player_id: 'rival-good', solved: true },
    ];

    const result = await findDailyChallengeRivals(['user-1']);
    expect(result.get('user-1')!.username).toBe('Good');
  });

  it('skips rivals whose avatar_image is non-https (FCM drops it silently)', async () => {
    leaderboardResult.data = [
      { player_id: 'user-1', username: 'Me', avatar_image: null, total_score: 1000 },
      { player_id: 'rival-http', username: 'Http', avatar_image: 'http://x/h.png', total_score: 1050 },
      { player_id: 'rival-good', username: 'Good', avatar_image: 'https://x/g.png', total_score: 1200 },
    ];
    wordHuntAttemptsResult.data = [
      { player_id: 'rival-http', solved: true },
      { player_id: 'rival-good', solved: true },
    ];
    const result = await findDailyChallengeRivals(['user-1']);
    expect(result.get('user-1')!.username).toBe('Good');
  });

  it('caps "above" rivals so far-ahead veterans never demoralize newcomers', async () => {
    // user score 200 (low). veteran 50k ahead (way past cap). near 200 ahead (within ABOVE_GAP_FLOOR=500).
    leaderboardResult.data = [
      { player_id: 'user-1', username: 'Me', avatar_image: null, total_score: 200 },
      { player_id: 'veteran', username: 'Vet', avatar_image: 'https://x/v.png', total_score: 50200 },
      { player_id: 'near', username: 'Near', avatar_image: 'https://x/n.png', total_score: 400 },
    ];
    wordHuntAttemptsResult.data = [
      { player_id: 'veteran', solved: true },
      { player_id: 'near', solved: true },
    ];
    const result = await findDailyChallengeRivals(['user-1']);
    expect(result.get('user-1')!.username).toBe('Near');
  });

  it('returns null when only out-of-range rivals exist', async () => {
    leaderboardResult.data = [
      { player_id: 'user-1', username: 'Me', avatar_image: null, total_score: 100 },
      { player_id: 'veteran', username: 'Vet', avatar_image: 'https://x/v.png', total_score: 99999 },
    ];
    wordHuntAttemptsResult.data = [{ player_id: 'veteran', solved: true }];
    const result = await findDailyChallengeRivals(['user-1']);
    expect(result.get('user-1')).toBeNull();
  });

  it('handles many recipients in one batch', async () => {
    leaderboardResult.data = [
      { player_id: 'u1', username: 'U1', avatar_image: null, total_score: 1000 },
      { player_id: 'u2', username: 'U2', avatar_image: null, total_score: 2000 },
      { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r1.png', total_score: 1050 },
      { player_id: 'r2', username: 'R2', avatar_image: 'https://x/r2.png', total_score: 2050 },
    ];
    wordHuntAttemptsResult.data = [
      { player_id: 'r1', solved: true },
      { player_id: 'r2', solved: true },
    ];

    const result = await findDailyChallengeRivals(['u1', 'u2']);
    expect(result.get('u1')!.username).toBe('R1');
    expect(result.get('u2')!.username).toBe('R2');
  });

  it('returns null map entries for query errors (fail-soft)', async () => {
    leaderboardResult.data = null;
    leaderboardResult.error = { message: 'boom' } as unknown as null;

    const result = await findDailyChallengeRivals(['user-1']);
    expect(result.get('user-1')).toBeNull();
    leaderboardResult.error = null;
  });
});
