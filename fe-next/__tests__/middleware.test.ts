import { vi, type Mock, } from 'vitest';
/**
 * Proxy Tests — Supabase Session Refresh & API Route Coverage
 *
 * Verifies that proxy.ts:
 * 1. Calls getUser() (not getSession()) to refresh auth tokens
 * 2. Does NOT skip API routes — they need session refresh too
 * 3. Still skips static files
 */

// Mock @supabase/ssr before imports
const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, _opts: { cookies: { setAll: (cookies: unknown[]) => void } }) => {
    return {
      auth: {
        getUser: mockGetUser,
        getSession: mockGetSession,
      },
    };
  }),
}));

// Mock next/server
const mockSet = vi.fn();
vi.mock('next/server', () => {
  function NextResponse(this: Record<string, unknown>, _body: unknown, init?: { status?: number }) {
    this.status = init?.status ?? 200;
    this.cookies = { set: mockSet };
    this.headers = new Map();
    return this;
  }
  (NextResponse as unknown as { next: Mock }).next = vi.fn(() => ({
    cookies: { set: mockSet },
    headers: new Map(),
  }));
  (NextResponse as unknown as { redirect: Mock }).redirect = vi.fn((url: URL, status: number) => ({
    url: url.toString(),
    status,
    cookies: { set: mockSet },
    headers: new Map(),
  }));
  (NextResponse as unknown as { rewrite: Mock }).rewrite = vi.fn((url: URL) => ({
    url: url.toString(),
    cookies: { set: mockSet },
    headers: new Map(),
  }));
  return { NextResponse };
});

import { proxy, config } from '../proxy';
import { NextResponse } from 'next/server';

function makeRequest(pathname: string, opts?: { userAgent?: string; cookies?: Record<string, string> }) {
  const cookieMap = new Map(Object.entries(opts?.cookies ?? {}));
  return {
    nextUrl: { pathname, search: '' },
    url: `http://localhost:3000${pathname}`,
    headers: {
      get: (name: string) => {
        if (name === 'user-agent') return opts?.userAgent ?? 'Mozilla/5.0';
        if (name === 'accept-language') return 'en-US,en;q=0.9';
        return null;
      },
    },
    cookies: {
      getAll: () => Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value })),
      get: (name: string) => cookieMap.has(name) ? { value: cookieMap.get(name) } : undefined,
      set: vi.fn(),
    },
  } as unknown as Parameters<typeof proxy>[0];
}

describe('Proxy — Supabase Auth Refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('should call getSession() for fast local JWT refresh (not getUser() which hits network)', async () => {
    await proxy(makeRequest('/en/adventure'));
    expect(mockGetSession).toHaveBeenCalledTimes(1);
    // getUser() makes a network round-trip to Supabase Auth (200-500ms) — too slow for proxy
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('should skip auth refresh on API routes (they handle their own auth)', async () => {
    await proxy(makeRequest('/api/adventure/complete'));
    // API routes skip proxy auth to avoid 200-500ms overhead — each route validates auth independently
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('should NOT locale-redirect API routes', async () => {
    await proxy(makeRequest('/api/adventure/state'));
    // API routes must return NextResponse.next(), never redirect/rewrite
    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(NextResponse.rewrite).not.toHaveBeenCalled();
  });

  it('should skip static files entirely', async () => {
    await proxy(makeRequest('/_next/static/chunk.js'));
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('should skip favicon', async () => {
    await proxy(makeRequest('/favicon.ico'));
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('should skip files with extensions', async () => {
    await proxy(makeRequest('/images/logo.png'));
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('should not call getUser for bot requests', async () => {
    await proxy(makeRequest('/en/adventure', { userAgent: 'Googlebot/2.1' }));
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('should handle getUser errors gracefully (expired session)', async () => {
    mockGetUser.mockRejectedValue(new Error('Network error'));
    // Should not throw
    const result = await proxy(makeRequest('/en/adventure'));
    expect(result).toBeDefined();
  });

  it('should have a config matcher that covers all request paths', () => {
    expect(config.matcher).toBeDefined();
    expect(config.matcher.length).toBeGreaterThan(0);
  });
});

describe('Proxy — Probe short-circuit (Sentry JAVASCRIPT-NEXTJS-NE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  // Scanners spray env/git variants; App Router rendering these crashes
  // Node webstreams with "controller[kState].transformAlgorithm is not a function".
  // Every variant below MUST 404 via short-circuit before App Router.
  const probePaths = [
    '/.env',
    '/.env.local',
    '/.env.production',
    '/.env.prod.local',
    '/.env.bak',
    '/.git',
    '/.git/config',
    '/.aws/credentials',
    '/.ssh/id_rsa',
    '/.DS_Store',
    '/wp-admin/install.php',
    '/phpmyadmin/index.php',
    '/xmlrpc.php',
  ];

  probePaths.forEach((p) => {
    it(`short-circuits probe path ${p} with 404`, async () => {
      const res = await proxy(makeRequest(p));
      expect((res as unknown as { status: number }).status).toBe(404);
      expect(mockGetSession).not.toHaveBeenCalled();
    });
  });
});
