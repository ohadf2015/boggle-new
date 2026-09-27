/**
 * Rival lookup for the daily-challenge push: pick a same-language leaderboard
 * neighbour who ALREADY cleared today's daily. EVENT-BASED — no score gap /
 * direction / tie (those had no valid data source and produced the "you're
 * tied with X" bug). See dailyChallengeRivals.ts header.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { findDailyChallengeRivals, resolveRivalAvatarUrl } from '../dailyChallengeRivals';

function makeBuilder(
  resultOrFn: { data: unknown; error: unknown } | (() => { data: unknown; error: unknown })
) {
  const resolve = () => (typeof resultOrFn === 'function' ? resultOrFn() : resultOrFn);
  const b: Record<string, unknown> = {};
  ['select', 'eq', 'neq', 'is', 'in', 'gt', 'gte', 'lt', 'lte', 'not', 'limit', 'order'].forEach((m) => {
    b[m] = vi.fn().mockReturnValue(b);
  });
  b.maybeSingle = vi.fn(() => Promise.resolve(resolve()));
  b.single = vi.fn(() => Promise.resolve(resolve()));
  b.then = (r: (v: unknown) => void) => r(resolve());
  return b;
}

const { mockFrom, mockRpc, leaderboardResult, puzzleAttemptsResult, wordHuntAttemptsResult } =
  vi.hoisted(() => ({
    mockFrom: vi.fn(),
    mockRpc: vi.fn(),
    leaderboardResult: { data: [] as unknown[], error: null as unknown },
    puzzleAttemptsResult: { data: [] as unknown[], error: null as unknown },
    wordHuntAttemptsResult: { data: [] as unknown[], error: null as unknown },
  }));

vi.mock('../email', async () => {
  const actual = await vi.importActual<typeof import('../email')>('../email');
  return {
    ...actual,
    getSupabaseAdmin: () => ({ from: mockFrom, rpc: mockRpc }),
    getTodayDate: () => '2026-07-03',
  };
});

beforeEach(() => {
  leaderboardResult.data = [];
  leaderboardResult.error = null;
  puzzleAttemptsResult.data = [];
  puzzleAttemptsResult.error = null;
  wordHuntAttemptsResult.data = [];
  wordHuntAttemptsResult.error = null;

  mockFrom.mockImplementation((table: string) => {
    if (table === 'leaderboard') return makeBuilder(leaderboardResult);
    if (table === 'daily_puzzle_attempts') return makeBuilder(puzzleAttemptsResult);
    if (table === 'daily_word_hunt_attempts') return makeBuilder(wordHuntAttemptsResult);
    return makeBuilder({ data: [], error: null });
  });
});

describe('resolveRivalAvatarUrl', () => {
  it('returns /api/avatar/png/:id when avatar_config is present', () => {
    expect(resolveRivalAvatarUrl(null, { base: 'round' }, 'abc-123', 'https://lex.test'))
      .toBe('https://lex.test/api/avatar/png/abc-123');
  });
  it('strips trailing slash from baseUrl', () => {
    expect(resolveRivalAvatarUrl(null, { base: 'round' }, 'abc-123', 'https://lex.test/'))
      .toBe('https://lex.test/api/avatar/png/abc-123');
  });
  it('falls back to https avatar_image when avatar_config is null', () => {
    expect(resolveRivalAvatarUrl('https://cdn/x.png', null, 'abc-123', 'https://lex.test'))
      .toBe('https://cdn/x.png');
  });
  it('returns null when neither avatar_config nor https avatar_image exist', () => {
    expect(resolveRivalAvatarUrl(null, null, 'abc-123', 'https://lex.test')).toBeNull();
    expect(resolveRivalAvatarUrl('broccoli-bob', null, 'abc-123', 'https://lex.test')).toBeNull();
    expect(resolveRivalAvatarUrl('http://insecure', null, 'abc-123', 'https://lex.test')).toBeNull();
  });
  it('avatar_config wins over legacy https avatar_image', () => {
    expect(resolveRivalAvatarUrl('https://cdn/x.png', { base: 'round' }, 'abc-123', 'https://lex.test'))
      .toBe('https://lex.test/api/avatar/png/abc-123');
  });
});

describe('findDailyChallengeRivals — event-based selection', () => {
  it('returns empty map when no recipients', async () => {
    expect((await findDailyChallengeRivals([])).size).toBe(0);
  });

  it('returns null for recipient with no leaderboard row', async () => {
    wordHuntAttemptsResult.data = [{ player_id: 'rival-1', solved: true }];
    const r = await findDailyChallengeRivals(['user-1']);
    expect(r.get('user-1')).toBeNull();
  });

  it('returns null when nobody completed today', async () => {
    leaderboardResult.data = [
      { player_id: 'user-1', username: 'Me', avatar_image: null, rank_position: 5 },
      { player_id: 'rival-1', username: 'Rival', avatar_image: 'https://x/r.png', rank_position: 6 },
    ];
    const r = await findDailyChallengeRivals(['user-1']);
    expect(r.get('user-1')).toBeNull();
  });

  it('picks a rival who cleared today (word hunt)', async () => {
    leaderboardResult.data = [
      { player_id: 'user-1', username: 'Me', avatar_image: null, rank_position: 5 },
      { player_id: 'rival-1', username: 'Near', avatar_image: 'https://x/n.png', rank_position: 6 },
    ];
    wordHuntAttemptsResult.data = [{ player_id: 'rival-1', solved: true }];
    const rival = (await findDailyChallengeRivals(['user-1'])).get('user-1');
    expect(rival).not.toBeNull();
    expect(rival!.username).toBe('Near');
    expect(rival!.avatarImage).toBe('https://x/n.png');
    expect(rival!.mode).toBe('wordHunt');
  });

  it('counts a puzzle completer too', async () => {
    leaderboardResult.data = [
      { player_id: 'user-1', username: 'Me', avatar_image: null, rank_position: 5 },
      { player_id: 'rival-1', username: 'R1', avatar_image: 'https://x/r.png', rank_position: 6 },
    ];
    puzzleAttemptsResult.data = [{ player_id: 'rival-1', score: 500 }];
    const rival = (await findDailyChallengeRivals(['user-1'])).get('user-1');
    expect(rival!.username).toBe('R1');
    expect(rival!.mode).toBe('puzzle');
  });

  it('excludes self even if the recipient completed today', async () => {
    leaderboardResult.data = [{ player_id: 'user-1', username: 'Me', avatar_image: null, rank_position: 5 }];
    wordHuntAttemptsResult.data = [{ player_id: 'user-1', solved: true }];
    expect((await findDailyChallengeRivals(['user-1'])).get('user-1')).toBeNull();
  });

  it('mode = "both" when rival cleared puzzle AND word-hunt', async () => {
    leaderboardResult.data = [
      { player_id: 'u1', username: 'Me', avatar_image: null, rank_position: 5 },
      { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r.png', rank_position: 6 },
    ];
    puzzleAttemptsResult.data = [{ player_id: 'r1', score: 500 }];
    wordHuntAttemptsResult.data = [{ player_id: 'r1', solved: true }];
    expect((await findDailyChallengeRivals(['u1'])).get('u1')!.mode).toBe('both');
  });

  it('prefers leaderboard.display_name over a placeholder username', async () => {
    leaderboardResult.data = [
      { player_id: 'u1', username: 'Me', avatar_image: null, rank_position: 5 },
      { player_id: 'r-ziv', username: 'Player_00952ce3', display_name: 'Ziv Benista', avatar_image: null, rank_position: 6 },
    ];
    wordHuntAttemptsResult.data = [{ player_id: 'r-ziv', solved: true }];
    expect((await findDailyChallengeRivals(['u1'])).get('u1')!.username).toBe('Ziv Benista');
  });

  it('passes empty username when display_name AND username are both placeholders', async () => {
    leaderboardResult.data = [
      { player_id: 'u1', username: 'Me', avatar_image: null, rank_position: 5 },
      { player_id: 'r-anon', username: 'Player_deadbeef', display_name: 'Player_deadbeef', avatar_image: null, rank_position: 6 },
    ];
    wordHuntAttemptsResult.data = [{ player_id: 'r-anon', solved: true }];
    expect((await findDailyChallengeRivals(['u1'])).get('u1')!.username).toBe('');
  });

  it('non-https / legacy avatar_image resolves to null (mascot fallback)', async () => {
    leaderboardResult.data = [
      { player_id: 'u1', username: 'Me', avatar_image: null, rank_position: 5 },
      { player_id: 'r-id', username: 'IdRival', avatar_image: 'broccoli-bob', rank_position: 6 },
    ];
    wordHuntAttemptsResult.data = [{ player_id: 'r-id', solved: true }];
    const rival = (await findDailyChallengeRivals(['u1'])).get('u1')!;
    expect(rival.username).toBe('IdRival');
    expect(rival.avatarImage).toBeNull();
  });

  it('rival with avatar_config gets /api/avatar/png/:id URL', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://lex.test';
    leaderboardResult.data = [
      { player_id: 'u1', username: 'Me', avatar_image: null, avatar_config: null, rank_position: 5 },
      { player_id: 'r-modern', username: 'Modern', avatar_image: null, avatar_config: { base: 'round' }, rank_position: 6 },
    ];
    wordHuntAttemptsResult.data = [{ player_id: 'r-modern', solved: true }];
    expect((await findDailyChallengeRivals(['u1'])).get('u1')!.avatarImage)
      .toBe('https://lex.test/api/avatar/png/r-modern');
  });

  it('additionalCount counts other same-language completers beyond the primary', async () => {
    leaderboardResult.data = [
      { player_id: 'u1', username: 'Me', avatar_image: null, rank_position: 50 },
      { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r.png', rank_position: 51 },
      { player_id: 'r2', username: 'R2', avatar_image: 'https://x/r2.png', rank_position: 40 },
      { player_id: 'r3', username: 'R3', avatar_image: 'https://x/r3.png', rank_position: 35 },
    ];
    wordHuntAttemptsResult.data = [
      { player_id: 'r1', solved: true },
      { player_id: 'r2', solved: true },
      { player_id: 'r3', solved: true },
    ];
    const c = (await findDailyChallengeRivals(['u1'])).get('u1')!;
    expect(c.additionalCount).toBe(2);
  });

  it('additionalCount is 0 when only the primary rival exists', async () => {
    leaderboardResult.data = [
      { player_id: 'u1', username: 'Me', avatar_image: null, rank_position: 50 },
      { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r.png', rank_position: 51 },
    ];
    wordHuntAttemptsResult.data = [{ player_id: 'r1', solved: true }];
    expect((await findDailyChallengeRivals(['u1'])).get('u1')!.additionalCount).toBe(0);
  });

  it('picks the rival nearest in rank to me', async () => {
    leaderboardResult.data = [
      { player_id: 'u1', username: 'Me', avatar_image: null, rank_position: 50 },
      { player_id: 'far', username: 'Far', avatar_image: 'https://x/f.png', rank_position: 5 },
      { player_id: 'near', username: 'Near', avatar_image: 'https://x/n.png', rank_position: 48 },
    ];
    wordHuntAttemptsResult.data = [
      { player_id: 'far', solved: true },
      { player_id: 'near', solved: true },
    ];
    expect((await findDailyChallengeRivals(['u1'])).get('u1')!.username).toBe('Near');
  });

  it('handles many recipients in one batch', async () => {
    leaderboardResult.data = [
      { player_id: 'u1', username: 'U1', avatar_image: null, rank_position: 50 },
      { player_id: 'u2', username: 'U2', avatar_image: null, rank_position: 20 },
      { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r1.png', rank_position: 51 },
      { player_id: 'r2', username: 'R2', avatar_image: 'https://x/r2.png', rank_position: 21 },
    ];
    wordHuntAttemptsResult.data = [
      { player_id: 'r1', solved: true },
      { player_id: 'r2', solved: true },
    ];
    const r = await findDailyChallengeRivals(['u1', 'u2']);
    // both r1 and r2 are same-language (NO_LANG) → each recipient's nearest-rank wins
    expect(r.get('u1')!.username).toBe('R1');
    expect(r.get('u2')!.username).toBe('R2');
  });

  it('fail-soft: null map entries on leaderboard query error', async () => {
    leaderboardResult.data = null;
    leaderboardResult.error = { message: 'boom' };
    expect((await findDailyChallengeRivals(['user-1'])).get('user-1')).toBeNull();
  });

  describe('same-language matching', () => {
    it('excludes a rival who cleared a DIFFERENT-language daily', async () => {
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, rank_position: 5 },
        { player_id: 'r-en', username: 'EnRival', avatar_image: 'https://x/e.png', rank_position: 6 },
      ];
      wordHuntAttemptsResult.data = [{ player_id: 'r-en', solved: true, language: 'en' }];
      // recipient plays Hebrew → the English completer is not their daily.
      expect((await findDailyChallengeRivals([{ userId: 'u1', locale: 'he' }])).get('u1')).toBeNull();
    });

    it('prefers the same-language rival over a different-language one', async () => {
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, rank_position: 5 },
        { player_id: 'r-en', username: 'EnRival', avatar_image: 'https://x/e.png', rank_position: 4 },
        { player_id: 'r-he', username: 'HeRival', avatar_image: 'https://x/h.png', rank_position: 9 },
      ];
      wordHuntAttemptsResult.data = [
        { player_id: 'r-en', solved: true, language: 'en' },
        { player_id: 'r-he', solved: true, language: 'he' },
      ];
      const c = (await findDailyChallengeRivals([{ userId: 'u1', locale: 'he' }])).get('u1')!;
      expect(c.username).toBe('HeRival');
      expect(c.additionalCount).toBe(0); // the en rival isn't counted
    });

    it('back-compat: legacy no-language completer still matches any recipient', async () => {
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, rank_position: 5 },
        { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r.png', rank_position: 6 },
      ];
      wordHuntAttemptsResult.data = [{ player_id: 'r1', solved: true }]; // no language
      expect((await findDailyChallengeRivals(['u1'])).get('u1')!.username).toBe('R1');
    });
  });
});
