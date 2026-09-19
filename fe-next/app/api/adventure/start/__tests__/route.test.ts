/**
 * POST /api/adventure/start route tests.
 */
// @ts-nocheck
import { vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200, json: async () => data })),
  },
}));

const mockCheckApiRateLimit = vi.fn().mockReturnValue({ success: true });
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: (...args: unknown[]) => mockCheckApiRateLimit(...args),
}));

const mockGetAuthedUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: (...args: unknown[]) => mockGetAuthedUser(...args),
}));

const mockCreateAdminClient = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => mockCreateAdminClient(...args),
}));

vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

import { POST } from '../route';
import { getPlayLevel } from '@/lib/adventure/play/levels';

function makeRequest(body?: unknown) {
  return {
    headers: { get: vi.fn().mockReturnValue('127.0.0.1') },
    json: async () => body,
  };
}

/** Small in-memory fake for the service-role client, per the repo's supabase mocking idiom. */
function makeFakeDb(seed: Record<string, any[]> = {}) {
  const tables: Record<string, any[]> = {
    level_completions: seed.level_completions ?? [],
    player_inventory: seed.player_inventory ?? [],
    player_progression: seed.player_progression ?? [],
  };
  const upserts: { table: string; row: any; options: any }[] = [];

  function matchRow(row: any, filters: [string, unknown][]) {
    return filters.every(([col, val]) => row[col] === val);
  }

  function from(table: string) {
    return {
      select: () => {
        const filters: [string, unknown][] = [];
        const builder: any = {
          eq(col: string, val: unknown) {
            filters.push([col, val]);
            return builder;
          },
          maybeSingle() {
            const rows = (tables[table] || []).filter((r) => matchRow(r, filters));
            return Promise.resolve({ data: rows[0] ?? null, error: null });
          },
          then(resolve: any, reject: any) {
            const rows = (tables[table] || []).filter((r) => matchRow(r, filters));
            return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
          },
        };
        return builder;
      },
      upsert: (row: any, options: any) => {
        upserts.push({ table, row, options });
        tables[table] = tables[table] || [];
        tables[table].push(row);
        return Promise.resolve({ error: null });
      },
    };
  }

  return { db: { from } as any, upserts, tables };
}

describe('POST /api/adventure/start', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiRateLimit.mockReturnValue({ success: true });
    process.env = { ...ORIGINAL_ENV, SUPABASE_SERVICE_ROLE_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('given no authenticated user, when POST is called, then returns 401', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    const res = await POST(makeRequest({ world: 1, level: 1, language: 'en' }));

    expect(res.status).toBe(401);
  });

  it('given world 0, when POST is called, then returns 400 Invalid level', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'user-1' });

    const res = await POST(makeRequest({ world: 0, level: 1, language: 'en' }));

    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Invalid level');
  });

  it('given level 8, when POST is called, then returns 400 Invalid level', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'user-1' });

    const res = await POST(makeRequest({ world: 1, level: 8, language: 'en' }));

    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Invalid level');
  });

  it('given createAdminClient returns null, when POST is called, then returns 503', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'user-1' });
    mockCreateAdminClient.mockReturnValue(null);

    const res = await POST(makeRequest({ world: 1, level: 1, language: 'en' }));

    expect(res.status).toBe(503);
  });

  it('given level 2 requested with no level-1 completion, when POST is called, then returns 403 Locked', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'user-1' });
    const { db } = makeFakeDb({ level_completions: [] });
    mockCreateAdminClient.mockReturnValue(db);

    const res = await POST(makeRequest({ world: 1, level: 2, language: 'en' }));

    expect(res.status).toBe(403);
    expect(res.data.error).toBe('Locked');
  });

  it('given world1/level1, when POST is called, then returns 200 with token, grid and level', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'user-1' });
    const { db } = makeFakeDb({ level_completions: [] });
    mockCreateAdminClient.mockReturnValue(db);

    const res = await POST(makeRequest({ world: 1, level: 1, language: 'en' }));

    const expectedLevel = getPlayLevel(1, 1);
    expect(res.status).toBe(200);
    expect(typeof res.data.token).toBe('string');
    expect(res.data.token.split('.').length).toBe(2);
    expect(res.data.grid).toHaveLength(expectedLevel.size);
    expect(res.data.grid[0]).toHaveLength(expectedLevel.size);
    expect(res.data.level).toEqual(expectedLevel);
    expect(res.data.language).toBe('en');
  });

  it('given an unsupported language (ru), when POST is called, then falls back to en in the response', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'user-1' });
    const { db } = makeFakeDb({ level_completions: [] });
    mockCreateAdminClient.mockReturnValue(db);

    const res = await POST(makeRequest({ world: 1, level: 1, language: 'ru' }));

    expect(res.status).toBe(200);
    expect(res.data.language).toBe('en');
  });
});
