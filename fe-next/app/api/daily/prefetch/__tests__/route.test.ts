// @ts-nocheck
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

const mockGetUser = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

vi.mock('@/utils/dailyChallenge', () => ({
  generateDailyPuzzle: vi.fn((date, language) => ({
    grid: [['A', 'B'], ['C', 'D']],
    targetWord: `WORD-${date}-${language}`,
  })),
  getDailyChallengeDate: vi.fn(() => '2026-05-12'),
}));

import { GET } from '../route';
import { generateDailyPuzzle } from '@/utils/dailyChallenge';

function makeRequest(params = {}) {
  const url = new URL('http://localhost/api/daily/prefetch');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  return new Request(url.toString());
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
  vi.mocked(generateDailyPuzzle).mockImplementation((date, language) => ({
    grid: [['A', 'B'], ['C', 'D']],
    targetWord: `WORD-${date}-${language}`,
  }));
});

describe('GET /api/daily/prefetch', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(makeRequest({ language: 'en', dates: '2026-05-12' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when language is missing', async () => {
    const res = await GET(makeRequest({ dates: '2026-05-12' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid language code', async () => {
    const res = await GET(makeRequest({ language: 'xx', dates: '2026-05-12' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when dates param is missing', async () => {
    const res = await GET(makeRequest({ language: 'en' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for malformed date string', async () => {
    const res = await GET(makeRequest({ language: 'en', dates: 'not-a-date' }));
    expect(res.status).toBe(400);
  });

  it('returns puzzles array for a single date', async () => {
    const res = await GET(makeRequest({ language: 'en', dates: '2026-05-12' }));
    expect(res.status).toBe(200);
    expect(res.data.puzzles).toHaveLength(1);
    expect(res.data.puzzles[0]).toMatchObject({
      date: '2026-05-12',
      language: 'en',
      mode: 'wordhunt',
    });
    expect(generateDailyPuzzle).toHaveBeenCalledWith('2026-05-12', 'en');
  });

  it('returns two puzzles for cross-midnight two-date request', async () => {
    const res = await GET(makeRequest({ language: 'en', dates: '2026-05-12,2026-05-13' }));
    expect(res.status).toBe(200);
    expect(res.data.puzzles).toHaveLength(2);
    expect(res.data.puzzles[0].date).toBe('2026-05-12');
    expect(res.data.puzzles[1].date).toBe('2026-05-13');
  });

  it('puzzle payload contains grid and targetWord', async () => {
    const res = await GET(makeRequest({ language: 'he', dates: '2026-05-12' }));
    expect(res.status).toBe(200);
    const { payload } = res.data.puzzles[0];
    expect(payload).toMatchObject({ grid: expect.any(Array), targetWord: expect.any(String) });
  });

  it('validUntil falls within the puzzle date bounds', async () => {
    const res = await GET(makeRequest({ language: 'en', dates: '2026-05-12' }));
    const { validUntil } = res.data.puzzles[0];
    const afterDate = new Date('2026-05-12T00:00:00Z').getTime();
    const beforeDate = new Date('2026-05-14T00:00:00Z').getTime();
    expect(validUntil).toBeGreaterThan(afterDate);
    expect(validUntil).toBeLessThan(beforeDate);
  });

  it('caps to 3 dates to prevent abuse', async () => {
    const res = await GET(
      makeRequest({ language: 'en', dates: '2026-05-12,2026-05-13,2026-05-14,2026-05-15' }),
    );
    expect(res.status).toBe(200);
    expect(res.data.puzzles).toHaveLength(3);
    expect(vi.mocked(generateDailyPuzzle)).toHaveBeenCalledTimes(3);
  });

  it('accepts all 5 supported language codes', async () => {
    for (const lang of ['en', 'he', 'sv', 'ja', 'es']) {
      vi.clearAllMocks();
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
      vi.mocked(generateDailyPuzzle).mockReturnValue({ grid: [], targetWord: 'X' });
      const res = await GET(makeRequest({ language: lang, dates: '2026-05-12' }));
      expect(res.status).toBe(200);
    }
  });
});
