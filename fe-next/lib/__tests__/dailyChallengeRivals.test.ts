/**
 * Rival lookup for daily-challenge push: pick a leaderboard neighbour who
 * already completed today's daily, then the cron sends a rival-themed push.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { findDailyChallengeRivals, resolveRivalAvatarUrl, resolveRivalName } from '../dailyChallengeRivals';

/**
 * Builder mock. `lazyResult` lets the result reflect data the test sets AFTER
 * beforeEach (e.g. season-puzzle aggregate derived from leaderboardResult).
 */
function makeBuilder(
  resultOrFn:
    | { data: unknown; error: unknown }
    | (() => { data: unknown; error: unknown })
) {
  const resolve = () =>
    typeof resultOrFn === 'function' ? resultOrFn() : resultOrFn;
  const b: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'neq', 'is', 'in', 'gt', 'gte', 'lt', 'lte', 'not', 'limit', 'order'];
  methods.forEach((m) => {
    b[m] = vi.fn().mockReturnValue(b);
  });
  b.maybeSingle = vi.fn(() => Promise.resolve(resolve()));
  b.single = vi.fn(() => Promise.resolve(resolve()));
  b.then = (r: (v: unknown) => void) => r(resolve());
  return b;
}

const {
  mockFrom,
  mockRpc,
  leaderboardResult,
  puzzleAttemptsResult,
  wordHuntAttemptsResult,
  seasonResult,
  seasonPuzzleResult,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  leaderboardResult: { data: [] as unknown[], error: null },
  puzzleAttemptsResult: { data: [] as unknown[], error: null },
  wordHuntAttemptsResult: { data: [] as unknown[], error: null },
  seasonResult: {
    data: { id: 2, start_date: '2026-05-01', end_date: '2026-05-31' } as unknown,
    error: null,
  },
  // null = auto-derive from leaderboardResult so existing tests keep their
  // total_score values as the "season-puzzle aggregate" the new code reads.
  // Tests that need an asymmetry (today rival ≠ season total) set explicit rows.
  seasonPuzzleResult: { data: null as unknown[] | null, error: null },
}));

vi.mock('../email', async () => {
  const actual = await vi.importActual<typeof import('../email')>('../email');
  return {
    ...actual,
    getSupabaseAdmin: () => ({ from: mockFrom, rpc: mockRpc }),
    getTodayDate: () => '2026-05-10',
  };
});

beforeEach(() => {
  leaderboardResult.data = [];
  puzzleAttemptsResult.data = [];
  wordHuntAttemptsResult.data = [];
  seasonResult.data = { id: 2, start_date: '2026-05-01', end_date: '2026-05-31' };
  seasonResult.error = null;
  seasonPuzzleResult.data = null;
  seasonPuzzleResult.error = null;

  mockRpc.mockImplementation((name: string) => {
    if (name === 'get_current_season_id') {
      return Promise.resolve({ data: 2, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  let puzzleCallCount = 0;
  mockFrom.mockImplementation((table: string) => {
    if (table === 'leaderboard') return makeBuilder(leaderboardResult);
    if (table === 'daily_puzzle_attempts') {
      // 1st call = today's-completers filter (.gt score 0). 2nd = season-window aggregate.
      const which = puzzleCallCount++;
      if (which === 0) return makeBuilder(puzzleAttemptsResult);
      return makeBuilder(() => {
        if (seasonPuzzleResult.data !== null) return seasonPuzzleResult;
        // Auto-derive from leaderboardResult.total_score so existing test data
        // (which only sets leaderboard rows) still drives scoring expectations
        // — total_score in tests stands in for the season puzzle aggregate.
        const rows = (leaderboardResult.data as Array<{ player_id: string; total_score: number | null }>)
          .filter((r) => r && typeof r.total_score === 'number')
          .map((r) => ({ player_id: r.player_id, score: r.total_score }));
        return { data: rows, error: null };
      });
    }
    if (table === 'daily_word_hunt_attempts') return makeBuilder(wordHuntAttemptsResult);
    if (table === 'seasons') return makeBuilder(seasonResult);
    return makeBuilder({ data: [], error: null });
  });
});

describe('resolveRivalAvatarUrl', () => {
  it('returns /api/avatar/png/:id when avatar_config is present (modern users)', () => {
    const url = resolveRivalAvatarUrl(null, { base: 'round' }, 'abc-123', 'https://lex.test');
    expect(url).toBe('https://lex.test/api/avatar/png/abc-123');
  });

  it('strips trailing slash from baseUrl', () => {
    const url = resolveRivalAvatarUrl(null, { base: 'round' }, 'abc-123', 'https://lex.test/');
    expect(url).toBe('https://lex.test/api/avatar/png/abc-123');
  });

  it('falls back to https avatar_image when avatar_config is null', () => {
    const url = resolveRivalAvatarUrl('https://cdn/x.png', null, 'abc-123', 'https://lex.test');
    expect(url).toBe('https://cdn/x.png');
  });

  it('returns null when neither avatar_config nor https avatar_image exist', () => {
    expect(resolveRivalAvatarUrl(null, null, 'abc-123', 'https://lex.test')).toBeNull();
    expect(resolveRivalAvatarUrl('broccoli-bob', null, 'abc-123', 'https://lex.test')).toBeNull();
    expect(resolveRivalAvatarUrl('http://insecure', null, 'abc-123', 'https://lex.test')).toBeNull();
  });

  it('avatar_config wins over legacy https avatar_image (modern path preferred)', () => {
    const url = resolveRivalAvatarUrl('https://cdn/x.png', { base: 'round' }, 'abc-123', 'https://lex.test');
    expect(url).toBe('https://lex.test/api/avatar/png/abc-123');
  });
});

describe('resolveRivalName', () => {
  it('prefers display_name over username', () => {
    expect(resolveRivalName('Maya Cohen', 'Player_9662314e')).toBe('Maya Cohen');
  });

  it('falls back to username when display_name is null/blank', () => {
    expect(resolveRivalName(null, 'WordWizard')).toBe('WordWizard');
    expect(resolveRivalName('   ', 'WordWizard')).toBe('WordWizard');
  });

  it('returns null for an auto-generated Player_<hex> username with no display_name', () => {
    expect(resolveRivalName(null, 'Player_9662314e')).toBeNull();
    expect(resolveRivalName(undefined, 'Player_0a1b2c3d')).toBeNull();
  });

  it('does NOT treat a user-chosen name that merely begins with "Player" as a placeholder', () => {
    expect(resolveRivalName(null, 'PlayerOne')).toBe('PlayerOne');
    expect(resolveRivalName(null, 'Player_Awesome')).toBe('Player_Awesome');
  });

  it('trims surrounding whitespace from the resolved name', () => {
    expect(resolveRivalName('  Maya  ', null)).toBe('Maya');
    expect(resolveRivalName(null, '  WordWizard  ')).toBe('WordWizard');
  });

  it('returns null when nothing usable is available', () => {
    expect(resolveRivalName(null, null)).toBeNull();
    expect(resolveRivalName('', '')).toBeNull();
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

  it('legacy character-ID avatar_image (e.g. "broccoli-bob") resolves to null — modern path is avatar_config + mascot fallback', async () => {
    // Character avatars are deprecated; the live system uses JSONB avatar_config
    // which we cannot render to a hosted PNG yet. Rival still picked, image null,
    // notifyDailyChallengeReminder falls back to mascot. Rival COPY still fires.
    leaderboardResult.data = [
      { player_id: 'user-1', username: 'Me', avatar_image: null, total_score: 1000 },
      { player_id: 'rival-id', username: 'IdRival', avatar_image: 'broccoli-bob', total_score: 1050 },
    ];
    wordHuntAttemptsResult.data = [{ player_id: 'rival-id', solved: true }];

    const result = await findDailyChallengeRivals(['user-1']);
    const rival = result.get('user-1')!;
    expect(rival.username).toBe('IdRival');
    expect(rival.avatarImage).toBeNull();
  });

  it('picks rival with null avatar_image — sets avatarImage=null so push falls back to mascot', async () => {
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
    const rival = result.get('user-1')!;
    expect(rival.username).toBe('NoAvatar');
    expect(rival.avatarImage).toBeNull();
  });

  it('picks rival whose avatar_image is non-https — sets avatarImage=null (FCM drops non-https silently)', async () => {
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
    const rival = result.get('user-1')!;
    expect(rival.username).toBe('Http');
    expect(rival.avatarImage).toBeNull();
  });

  it('low-score newcomers still get rivals within daily-puzzle floor (ABOVE_GAP_FLOOR=500)', async () => {
    // User season-puzzle aggregate=10 (brand-new). Rival 300 ahead must qualify —
    // floors are now sized for daily-puzzle scale (typical day-score ~50-300),
    // not lifetime leaderboard scale.
    leaderboardResult.data = [
      { player_id: 'newcomer', username: 'Me', avatar_image: null, total_score: 10 },
      { player_id: 'rival', username: 'R', avatar_image: 'https://x/r.png', total_score: 300 },
    ];
    wordHuntAttemptsResult.data = [{ player_id: 'rival', solved: true }];
    const result = await findDailyChallengeRivals(['newcomer']);
    expect(result.get('newcomer')).not.toBeNull();
    expect(result.get('newcomer')!.username).toBe('R');
  });

  it('caps "above" rivals so far-ahead season-puzzle veterans never demoralize newcomers', async () => {
    // user season-puzzle aggregate 50 (low). veteran 5000 ahead (way past cap).
    // near 200 ahead (within ABOVE_GAP_FLOOR=500).
    leaderboardResult.data = [
      { player_id: 'user-1', username: 'Me', avatar_image: null, total_score: 50 },
      { player_id: 'veteran', username: 'Vet', avatar_image: 'https://x/v.png', total_score: 5050 },
      { player_id: 'near', username: 'Near', avatar_image: 'https://x/n.png', total_score: 250 },
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
      { player_id: 'user-1', username: 'Me', avatar_image: null, total_score: 10 },
      { player_id: 'veteran', username: 'Vet', avatar_image: 'https://x/v.png', total_score: 9999 },
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

  describe('extended context (mode/score/rank/additionalCount)', () => {
    it('exposes rival.rivalScore from leaderboard total_score', async () => {
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, total_score: 1000, rank_position: 50 },
        { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r.png', total_score: 1080, rank_position: 40 },
      ];
      wordHuntAttemptsResult.data = [{ player_id: 'r1', solved: true }];

      const r = await findDailyChallengeRivals(['u1']);
      expect(r.get('u1')!.rivalScore).toBe(1080);
    });

    it('exposes rankDelta = my.rank - rival.rank (positive when rival ahead)', async () => {
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, total_score: 1000, rank_position: 50 },
        { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r.png', total_score: 1080, rank_position: 40 },
      ];
      wordHuntAttemptsResult.data = [{ player_id: 'r1', solved: true }];

      const r = await findDailyChallengeRivals(['u1']);
      expect(r.get('u1')!.rankDelta).toBe(10);
    });

    it("rankDelta is negative when rival is below me in rank", async () => {
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, total_score: 1000, rank_position: 50 },
        { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r.png', total_score: 950, rank_position: 60 },
      ];
      wordHuntAttemptsResult.data = [{ player_id: 'r1', solved: true }];

      const r = await findDailyChallengeRivals(['u1']);
      expect(r.get('u1')!.rankDelta).toBe(-10);
    });

    it('mode = "wordHunt" when rival only cleared word-hunt', async () => {
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, total_score: 1000, rank_position: 50 },
        { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r.png', total_score: 1080, rank_position: 40 },
      ];
      wordHuntAttemptsResult.data = [{ player_id: 'r1', solved: true }];
      puzzleAttemptsResult.data = [];

      const r = await findDailyChallengeRivals(['u1']);
      expect(r.get('u1')!.mode).toBe('wordHunt');
    });

    it('mode = "puzzle" when rival only cleared puzzle', async () => {
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, total_score: 1000, rank_position: 50 },
        { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r.png', total_score: 1080, rank_position: 40 },
      ];
      puzzleAttemptsResult.data = [{ player_id: 'r1', score: 500 }];
      wordHuntAttemptsResult.data = [];

      const r = await findDailyChallengeRivals(['u1']);
      expect(r.get('u1')!.mode).toBe('puzzle');
    });

    it('mode = "both" when rival cleared puzzle AND word-hunt', async () => {
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, total_score: 1000, rank_position: 50 },
        { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r.png', total_score: 1080, rank_position: 40 },
      ];
      puzzleAttemptsResult.data = [{ player_id: 'r1', score: 500 }];
      wordHuntAttemptsResult.data = [{ player_id: 'r1', solved: true }];

      const r = await findDailyChallengeRivals(['u1']);
      expect(r.get('u1')!.mode).toBe('both');
    });

    it('additionalCount counts other in-cap rivals beyond the primary', async () => {
      // 3 rivals all within score cap, pick closest + 2 others.
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, total_score: 1000, rank_position: 50 },
        { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r.png', total_score: 1050, rank_position: 45 },
        { player_id: 'r2', username: 'R2', avatar_image: 'https://x/r2.png', total_score: 1100, rank_position: 40 },
        { player_id: 'r3', username: 'R3', avatar_image: 'https://x/r3.png', total_score: 1200, rank_position: 35 },
      ];
      wordHuntAttemptsResult.data = [
        { player_id: 'r1', solved: true },
        { player_id: 'r2', solved: true },
        { player_id: 'r3', solved: true },
      ];

      const c = (await findDailyChallengeRivals(['u1'])).get('u1')!;
      expect(c.username).toBe('R1');
      expect(c.additionalCount).toBe(2);
    });

    it('additionalCount is 0 when only the primary rival exists', async () => {
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, total_score: 1000, rank_position: 50 },
        { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r.png', total_score: 1050, rank_position: 45 },
      ];
      wordHuntAttemptsResult.data = [{ player_id: 'r1', solved: true }];

      const c = (await findDailyChallengeRivals(['u1'])).get('u1')!;
      expect(c.additionalCount).toBe(0);
    });

    it('rival with avatar_config gets /api/avatar/png/:id URL (modern path)', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://lex.test';
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, avatar_config: null, total_score: 1000, rank_position: 50 },
        {
          player_id: 'rival-modern',
          username: 'Modern',
          avatar_image: null,
          avatar_config: { base: 'round', skinColor: '#FFDBB4' },
          total_score: 1050,
          rank_position: 45,
        },
      ];
      wordHuntAttemptsResult.data = [{ player_id: 'rival-modern', solved: true }];

      const r = await findDailyChallengeRivals(['u1']);
      expect(r.get('u1')!.avatarImage).toBe('https://lex.test/api/avatar/png/rival-modern');
    });

    it('uses season-window daily_puzzle_attempts aggregate (not leaderboard.total_score) for gap', async () => {
      // Leaderboard total_score says rival is 5000 ahead — old code would have
      // used that. New code reads aggregated daily-puzzle scores per season,
      // which we explicitly set to a tiny gap of 100. Push should reflect 100.
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, total_score: 999999, rank_position: 50 },
        { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r.png', total_score: 999999, rank_position: 40 },
      ];
      wordHuntAttemptsResult.data = [{ player_id: 'r1', solved: true }];
      seasonPuzzleResult.data = [
        { player_id: 'u1', score: 200 },
        { player_id: 'u1', score: 100 },   // u1 total = 300
        { player_id: 'r1', score: 400 },   // r1 total = 400, gap = 100
      ];

      const c = (await findDailyChallengeRivals(['u1'])).get('u1')!;
      expect(c.scoreGap).toBe(100);
      expect(c.rivalScore).toBe(400);
    });

    it('returns null when current season cannot be resolved (RPC returns null)', async () => {
      mockRpc.mockImplementationOnce(() => Promise.resolve({ data: null, error: null }));
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, total_score: 1000, rank_position: 50 },
        { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r.png', total_score: 1050, rank_position: 45 },
      ];
      wordHuntAttemptsResult.data = [{ player_id: 'r1', solved: true }];

      const r = await findDailyChallengeRivals(['u1']);
      expect(r.get('u1')).toBeNull();
    });

    it('returns null when seasons row is missing (no start/end window)', async () => {
      seasonResult.data = null;
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, total_score: 1000, rank_position: 50 },
        { player_id: 'r1', username: 'R1', avatar_image: 'https://x/r.png', total_score: 1050, rank_position: 45 },
      ];
      wordHuntAttemptsResult.data = [{ player_id: 'r1', solved: true }];

      const r = await findDailyChallengeRivals(['u1']);
      expect(r.get('u1')).toBeNull();
    });

    it('additionalCount ignores out-of-cap rivals (far veterans not counted)', async () => {
      leaderboardResult.data = [
        { player_id: 'u1', username: 'Me', avatar_image: null, total_score: 200, rank_position: 9000 },
        { player_id: 'near', username: 'Near', avatar_image: 'https://x/n.png', total_score: 400, rank_position: 8000 },
        { player_id: 'vet', username: 'Vet', avatar_image: 'https://x/v.png', total_score: 50000, rank_position: 10 },
      ];
      wordHuntAttemptsResult.data = [
        { player_id: 'near', solved: true },
        { player_id: 'vet', solved: true },
      ];
      const c = (await findDailyChallengeRivals(['u1'])).get('u1')!;
      expect(c.username).toBe('Near');
      expect(c.additionalCount).toBe(0);
    });
  });

  describe('rival name resolution (display name, not Player_<id>)', () => {
    it('surfaces the rival display_name in preference to the username handle', async () => {
      leaderboardResult.data = [
        { player_id: 'user-1', username: 'Me', display_name: null, avatar_image: null, total_score: 1000 },
        {
          player_id: 'rival-1',
          username: 'Player_9662314e',
          display_name: 'Maya',
          avatar_image: 'https://x/r.png',
          total_score: 1050,
        },
      ];
      wordHuntAttemptsResult.data = [{ player_id: 'rival-1', solved: true }];

      const rival = (await findDailyChallengeRivals(['user-1'])).get('user-1')!;
      expect(rival.username).toBe('Maya');
    });

    it('skips a closer anonymous Player_<hex> rival in favour of a named one', async () => {
      leaderboardResult.data = [
        { player_id: 'user-1', username: 'Me', display_name: null, avatar_image: null, total_score: 1000 },
        // Closer (gap 10) but anonymous → must be skipped.
        { player_id: 'rival-anon', username: 'Player_9662314e', display_name: null, avatar_image: 'https://x/a.png', total_score: 1010 },
        // Further (gap 80) but has a real handle → chosen.
        { player_id: 'rival-named', username: 'WordSmith', display_name: null, avatar_image: 'https://x/n.png', total_score: 1080 },
      ];
      wordHuntAttemptsResult.data = [
        { player_id: 'rival-anon', solved: true },
        { player_id: 'rival-named', solved: true },
      ];

      const rival = (await findDailyChallengeRivals(['user-1'])).get('user-1')!;
      expect(rival.username).toBe('WordSmith');
      // Anonymous rival is not even counted toward the "and N more" framing.
      expect(rival.additionalCount).toBe(0);
    });

    it('returns null (→ neutral reminder) when the only nearby rival is anonymous', async () => {
      leaderboardResult.data = [
        { player_id: 'user-1', username: 'Me', display_name: null, avatar_image: null, total_score: 1000 },
        { player_id: 'rival-anon', username: 'Player_deadbeef', display_name: null, avatar_image: 'https://x/a.png', total_score: 1010 },
      ];
      wordHuntAttemptsResult.data = [{ player_id: 'rival-anon', solved: true }];

      expect((await findDailyChallengeRivals(['user-1'])).get('user-1')).toBeNull();
    });
  });
});
