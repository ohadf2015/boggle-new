import { vi, type Mock, } from 'vitest';

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

import { proxy } from '../proxy';
import { NextResponse } from 'next/server';

function makeRequest(pathname: string, opts?: { userAgent?: string; cookies?: Record<string, string>; search?: string }) {
  const cookieMap = new Map(Object.entries(opts?.cookies ?? {}));
  return {
    nextUrl: { pathname, search: opts?.search ?? '' },
    url: `http://localhost:3000${pathname}${opts?.search ?? ''}`,
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

describe('Proxy — legacy classroom multiplayer links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('given an old teacher link, when requested, then it redirects temporarily to the live route with room and host', async () => {
    const res = (await proxy(makeRequest('/en/multiplayer', { search: '?room=AB12CD&classroom=true&host=true' }))) as unknown as { url: string; status: number };
    expect(res.url).toBe('http://localhost:3000/en/education/live?room=AB12CD&host=1');
    expect(res.status).toBe(307);
  });

  it('given an old student QR, when requested, then the room survives the redirect', async () => {
    const res = (await proxy(makeRequest('/he/multiplayer', { search: '?classroom=true&room=AB12CD' }))) as unknown as { url: string };
    expect(res.url).toBe('http://localhost:3000/he/education/live?room=AB12CD');
  });

  it('given an arcade room link, when requested, then nothing redirects to education', async () => {
    await proxy(makeRequest('/en/multiplayer', { search: '?room=AB12CD' }));
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });
});
