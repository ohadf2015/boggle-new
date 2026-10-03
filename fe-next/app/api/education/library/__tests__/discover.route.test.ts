import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({ json: async () => data, status: init?.status ?? 200 }),
  },
}));
const log = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: log }));

const TEST_A = '11111111-1111-1111-1111-111111111111';
const TEST_B = '22222222-2222-2222-2222-222222222222';

const viewerUrls: URL[] = [];
const adminUrls: URL[] = [];
let testIdsResponse: { status: number; body: unknown } = { status: 200, body: [] };
let adminAvailable = true;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function fakeClient(urls: URL[], handler: (url: URL) => Response) {
  return createClient('https://example.supabase.co', 'anon-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (async (input: RequestInfo | URL) => {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
        urls.push(url);
        return handler(url);
      }) as typeof fetch,
    },
  });
}

const viewer = fakeClient(viewerUrls, (url) => {
  if (url.pathname.endsWith('/rpc/flagged_vocabulary_lesson_ids')) return jsonResponse([]);
  return jsonResponse([]);
});
const admin = fakeClient(adminUrls, () => jsonResponse(testIdsResponse.body, testIdsResponse.status));

vi.mock('@/utils/supabase/server', () => ({
  createRequestClient: async () => ({ supabase: viewer, token: null }),
}));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => (adminAvailable ? admin : null),
}));

import { GET } from '../discover/route';

const lessonsCalls = () => viewerUrls.filter((u) => u.pathname.endsWith('/vocabulary_lessons'));

describe('GET /api/education/library/discover — QA accounts never reach Discover', () => {
  beforeEach(() => {
    viewerUrls.length = 0;
    adminUrls.length = 0;
    adminAvailable = true;
    testIdsResponse = { status: 200, body: [] };
    log.error.mockClear();
  });

  it('given test-account authors, when Discover loads, then the public query excludes their teacher ids', async () => {
    testIdsResponse = { status: 200, body: [{ id: TEST_A }, { id: TEST_B }] };

    const res = await GET(new Request('http://localhost/api/education/library/discover'));

    expect(res.status).toBe(200);
    const profilesCall = adminUrls.find((u) => u.pathname.endsWith('/profiles'));
    expect(profilesCall?.searchParams.get('is_test_account')).toBe('eq.true');
    const calls = lessonsCalls();
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call.searchParams.get('is_public')).toBe('eq.true');
      expect(call.searchParams.get('teacher_id')).toBe(`not.in.(${TEST_A},${TEST_B})`);
    }
  });

  it('given no test accounts, when Discover loads, then no teacher_id filter is sent', async () => {
    await GET(new Request('http://localhost/api/education/library/discover?language=en'));

    const call = lessonsCalls()[0];
    expect(call.searchParams.get('language')).toBe('eq.en');
    expect(call.searchParams.has('teacher_id')).toBe(false);
  });

  it('given the test-account lookup fails, when Discover loads, then teacher lists are withheld and the failure is logged', async () => {
    testIdsResponse = { status: 500, body: { message: 'boom', code: 'XX000' } };

    const res = await GET(new Request('http://localhost/api/education/library/discover'));
    const body = (await res.json()) as { items: unknown[] };

    expect(lessonsCalls()).toHaveLength(0);
    expect(Array.isArray(body.items)).toBe(true);
    expect(log.error).toHaveBeenCalled();
  });

  it('given no service-role client, when Discover loads, then teacher lists are withheld and the failure is logged', async () => {
    adminAvailable = false;

    await GET(new Request('http://localhost/api/education/library/discover'));

    expect(lessonsCalls()).toHaveLength(0);
    expect(log.error).toHaveBeenCalled();
  });
});
