/**
 * Phase 1b award-dispatch tests for POST /api/scores/sync.
 *
 * Verifies sync routes adventure + brain submissions through their
 * processCompletion handlers, writes to offline_award_log for persistent
 * idempotency, and fires PostHog `offline_sync_award_granted` events.
 *
 * processCompletion modules are mocked so this file stays scoped to
 * sync-route dispatch logic; the handlers themselves are covered by
 * their own processCompletion.test.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: Object.assign(
    function NR(this: unknown, body: BodyInit | null, init?: ResponseInit) {
      return new Response(body, init);
    },
    {
      json: (data: unknown, init?: ResponseInit) =>
        new Response(JSON.stringify(data), {
          status: init?.status ?? 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    },
  ),
}));

vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

vi.mock('@/lib/wordValidation/serverDicts', () => ({
  validateWordOnServer: vi.fn(async (word: string) => word.toLowerCase() === 'hello'),
}));

// Mock processCompletion modules so this test scopes to dispatch logic.
const mockProcessAdventure = vi.fn();
vi.mock('@/app/api/adventure/complete/processCompletion', () => ({
  processAdventureCompletion: (...args: unknown[]) => mockProcessAdventure(...args),
}));
vi.mock('@/app/api/adventure/complete/validation', () => ({
  validateRequestBody: vi.fn((body: Record<string, unknown>) => ({
    valid: true,
    data: body as unknown,
  })),
}));

const mockProcessBrain = vi.fn();
vi.mock('@/app/api/drills/submit/processCompletion', () => ({
  processBrainDrillCompletion: (...args: unknown[]) => mockProcessBrain(...args),
}));

const mockProcessBlast = vi.fn();
vi.mock('@/app/api/blast/result/processCompletion', () => ({
  processBlastCompletion: (...args: unknown[]) => mockProcessBlast(...args),
}));
vi.mock('@/app/api/blast/utils', () => ({
  validateBlastResult: (body: Record<string, unknown>) => ({ valid: true, data: body }),
}));

const mockProcessConnections = vi.fn();
vi.mock('@/app/api/connections/daily/score/processCompletion', () => ({
  processConnectionsCompletion: (...args: unknown[]) => mockProcessConnections(...args),
}));
vi.mock('@/lib/connections/dailyScore', () => ({
  validateDailySubmission: (body: Record<string, unknown>) => ({
    ok: true,
    value: {
      puzzleDate: body.puzzleDate as string,
      language: body.language as string,
      displayName: body.displayName as string,
      score: body.score as number,
      timeTakenSeconds: body.timeTakenSeconds as number,
      puzzlesSolved: body.puzzlesSolved as number,
    },
  }),
}));
vi.mock('@/lib/connections/daily', () => ({
  maxDailyScore: () => 10000,
}));

// Blast and connections need a service-role client; the dispatch creates one.
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { avatar_emoji: '🎯', avatar_color: '#6366f1', avatar_image: null } }),
            }),
          }),
        };
      }
      return { from: vi.fn(), rpc: vi.fn() };
    }),
    rpc: vi.fn(),
  }),
}));

const mockPosthogCapture = vi.fn();
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: mockPosthogCapture }),
}));

// Mock supabase client — only the bits the sync route's offline_award_log
// logic touches.
const mockAwardLogSelect = vi.fn();
const mockAwardLogInsert = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (table: string) => {
      if (table === 'offline_award_log') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => mockAwardLogSelect(),
            }),
          }),
          insert: (row: unknown) => mockAwardLogInsert(row),
        };
      }
      return {};
    },
  }),
}));

import { POST } from '../route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/scores/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as Request;
}

function adventureSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    mode: 'adventure' as const,
    payload: {
      score: 500, world: 1, level: 1, stars: 3, words: 10, timePlayed: 60,
      language: 'en',
    },
    clientCompletedAt: Date.now(),
    ...overrides,
  };
}

function brainSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    mode: 'brain' as const,
    payload: {
      score: 800,
      drillType: 'lightning-round',
      level: 2,
      durationSeconds: 30,
      wordsFound: 15,
      language: 'en',
    },
    clientCompletedAt: Date.now(),
    ...overrides,
  };
}

function blastSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    mode: 'blast' as const,
    payload: {
      score: 500, tilesCleared: 20, totalTiles: 25, clearPercentage: 80,
      wordsFound: ['hello', 'world'], bestWord: 'hello', maxCombo: 3, stars: 2,
      difficulty: 'medium', language: 'en',
    },
    clientCompletedAt: Date.now(),
    ...overrides,
  };
}

function connectionsSubmission(overrides: Record<string, unknown> = {}) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: crypto.randomUUID(),
    mode: 'connections' as const,
    payload: {
      puzzleDate: today, language: 'en', displayName: 'Player', score: 500,
      timeTakenSeconds: 42, puzzlesSolved: 3,
    },
    clientCompletedAt: Date.now(),
    ...overrides,
  };
}

describe('POST /api/scores/sync — Phase 1b award dispatch', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockAwardLogSelect.mockResolvedValue({ data: null, error: null });
    mockAwardLogInsert.mockResolvedValue({ data: null, error: null });
    mockProcessBlast.mockResolvedValue({
      ok: true,
      body: { isNewBestScore: true, xpAwarded: 40, percentile: 50 },
    });
    mockProcessAdventure.mockResolvedValue({
      ok: true,
      body: { xpEarned: 50, goldEarned: 25, starsGained: 3, isReplay: false, leveledUp: false },
    });
    mockProcessBrain.mockResolvedValue({
      ok: true,
      body: { xpAwarded: 30, brainScore: { overallScore: 72 }, levelPromoted: false, idempotent: false },
    });
    mockProcessConnections.mockResolvedValue({
      ok: true,
      body: { action: 'insert', streak: 1, score: 500, currentRank: 1, totalPlayers: 1 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches adventure submission to processAdventureCompletion and returns awards', async () => {
    const sub = adventureSubmission();
    const res = await POST(makeRequest({ submissions: [sub] }) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { results: Array<{ accepted: boolean; awards: Record<string, unknown> | null }> };
    expect(mockProcessAdventure).toHaveBeenCalledTimes(1);
    expect(json.results[0].accepted).toBe(true);
    expect(json.results[0].awards).toEqual({
      xpEarned: 50, goldEarned: 25, starsGained: 3, isReplay: false, leveledUp: false,
    });
  });

  it('dispatches brain submission to processBrainDrillCompletion and returns awards', async () => {
    const sub = brainSubmission();
    const res = await POST(makeRequest({ submissions: [sub] }) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { results: Array<{ accepted: boolean; awards: Record<string, unknown> | null }> };
    expect(mockProcessBrain).toHaveBeenCalledTimes(1);
    expect(json.results[0].awards).toMatchObject({ xpAwarded: 30, brainScore: 72 });
  });

  it('writes to offline_award_log with submission_id + user_id + mode + awards', async () => {
    const sub = adventureSubmission();
    await POST(makeRequest({ submissions: [sub] }) as never);
    expect(mockAwardLogInsert).toHaveBeenCalledTimes(1);
    const row = mockAwardLogInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(row.submission_id).toBe(sub.id);
    expect(row.user_id).toBe('u1');
    expect(row.mode).toBe('adventure');
    expect(row.awards).toBeDefined();
  });

  it('persistent idempotency: replay with prior offline_award_log row returns cached awards, no handler call', async () => {
    const sub = brainSubmission();
    mockAwardLogSelect.mockResolvedValue({
      data: { awards: { xpAwarded: 99, fromCache: true } },
      error: null,
    });
    const res = await POST(makeRequest({ submissions: [sub] }) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { results: Array<{ awards: Record<string, unknown> }> };
    expect(json.results[0].awards).toEqual({ xpAwarded: 99, fromCache: true });
    expect(mockProcessBrain).not.toHaveBeenCalled();
    expect(mockAwardLogInsert).not.toHaveBeenCalled();
  });

  it('fires PostHog offline_sync_award_granted on success', async () => {
    const sub = adventureSubmission();
    await POST(makeRequest({ submissions: [sub] }) as never);
    expect(mockPosthogCapture).toHaveBeenCalledTimes(1);
    const evt = mockPosthogCapture.mock.calls[0][0] as Record<string, unknown>;
    expect(evt.event).toBe('offline_sync_award_granted');
    expect(evt.distinctId).toBe('u1');
    expect((evt.properties as Record<string, unknown>).mode).toBe('adventure');
  });

  it('PERMANENT failure (4xx) flags awardError but keeps accepted=true (drop, do not retry)', async () => {
    // "Level not unlocked" will never succeed on retry — dropping the row is
    // correct, not a silent loss.
    mockProcessAdventure.mockResolvedValue({
      ok: false, status: 403, error: 'Level not unlocked — cannot skip ahead',
    });
    const sub = adventureSubmission();
    const res = await POST(makeRequest({ submissions: [sub] }) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { results: Array<{ accepted: boolean; awards: unknown; awardError?: string }> };
    expect(json.results[0].accepted).toBe(true);
    expect(json.results[0].awardError).toMatch(/Level not unlocked/);
    expect(mockAwardLogInsert).not.toHaveBeenCalled();
    expect(mockPosthogCapture).not.toHaveBeenCalled();
  });

  it('TRANSIENT failure (5xx) sets accepted=false so the client RETRIES (no silent loss)', async () => {
    mockProcessAdventure.mockResolvedValue({
      ok: false, status: 503, error: 'database temporarily unavailable',
    });
    const sub = adventureSubmission();
    const res = await POST(makeRequest({ submissions: [sub] }) as never);
    const json = (await res.json()) as { results: Array<{ accepted: boolean; awardError?: string }> };
    expect(json.results[0].accepted).toBe(false);
    expect(json.results[0].awardError).toMatch(/database temporarily unavailable/);
    expect(mockAwardLogInsert).not.toHaveBeenCalled();
  });

  it('UNEXPECTED throw (e.g. DB exception) is treated as transient → accepted=false (retry)', async () => {
    mockProcessAdventure.mockRejectedValue(new Error('connection reset'));
    const sub = adventureSubmission();
    const res = await POST(makeRequest({ submissions: [sub] }) as never);
    const json = (await res.json()) as { results: Array<{ accepted: boolean; awardError?: string }> };
    expect(json.results[0].accepted).toBe(false);
    expect(json.results[0].awardError).toMatch(/connection reset/);
  });

  it('dispatches blast submission to processBlastCompletion and logs awards', async () => {
    const sub = blastSubmission();
    const res = await POST(makeRequest({ submissions: [sub] }) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { results: Array<{ accepted: boolean; awards: Record<string, unknown> | null }> };
    expect(mockProcessBlast).toHaveBeenCalledTimes(1);
    expect(json.results[0].accepted).toBe(true);
    expect(json.results[0].awards).toMatchObject({ isNewBestScore: true, xpAwarded: 40 });
    expect(mockAwardLogInsert).toHaveBeenCalledTimes(1);
    expect((mockAwardLogInsert.mock.calls[0][0] as Record<string, unknown>).mode).toBe('blast');
  });

  it('blast transient failure (status 500) sets accepted=false so it retries', async () => {
    mockProcessBlast.mockResolvedValue({ ok: false, status: 500, error: 'Failed to save result: INTERNAL' });
    const sub = blastSubmission();
    const res = await POST(makeRequest({ submissions: [sub] }) as never);
    const json = (await res.json()) as { results: Array<{ accepted: boolean; awardError?: string }> };
    expect(json.results[0].accepted).toBe(false);
    expect(json.results[0].awardError).toMatch(/Failed to save result/);
    expect(mockAwardLogInsert).not.toHaveBeenCalled();
  });

  it('dispatches connections submission to processConnectionsCompletion and logs awards', async () => {
    const sub = connectionsSubmission();
    const res = await POST(makeRequest({ submissions: [sub] }) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { results: Array<{ accepted: boolean; awards: Record<string, unknown> | null }> };
    expect(mockProcessConnections).toHaveBeenCalledTimes(1);
    expect(json.results[0].accepted).toBe(true);
    expect(json.results[0].awards).toMatchObject({ action: 'insert', streak: 1, score: 500 });
    expect(mockAwardLogInsert).toHaveBeenCalledTimes(1);
    expect((mockAwardLogInsert.mock.calls[0][0] as Record<string, unknown>).mode).toBe('connections');
  });

  it('connections transient failure (status 500) sets accepted=false so it retries', async () => {
    mockProcessConnections.mockResolvedValue({ ok: false, status: 500, error: 'Failed to save submission: DB error' });
    const sub = connectionsSubmission();
    const res = await POST(makeRequest({ submissions: [sub] }) as never);
    const json = (await res.json()) as { results: Array<{ accepted: boolean; awardError?: string }> };
    expect(json.results[0].accepted).toBe(false);
    expect(json.results[0].awardError).toMatch(/Failed to save submission/);
    expect(mockAwardLogInsert).not.toHaveBeenCalled();
  });

  it('unhandled mode (sp) returns awards: null', async () => {
    const sub = {
      id: crypto.randomUUID(),
      mode: 'sp' as const,
      payload: { score: 100, words: ['hello'], language: 'en' },
      clientCompletedAt: Date.now(),
    };
    const res = await POST(makeRequest({ submissions: [sub] }) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { results: Array<{ awards: unknown }> };
    expect(json.results[0].awards).toBeNull();
    expect(mockAwardLogInsert).not.toHaveBeenCalled();
  });
});
