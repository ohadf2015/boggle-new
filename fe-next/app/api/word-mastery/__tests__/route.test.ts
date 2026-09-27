import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockJson = vi.fn((data: unknown, init?: { status?: number }) => ({
  json: async () => data,
  status: init?.status ?? 200,
  data,
}));

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: (...args: unknown[]) => (mockJson as (...a: unknown[]) => unknown)(...args),
  },
}));

vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/backend/utils/featureFlags', () => ({
  canAccessFeature: vi.fn(),
}));

vi.mock('@/lib/experimentsServer', () => ({
  getServerExperimentVariant: vi.fn(),
}));

import { GET } from '../route';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createClient } from '@/utils/supabase/server';
import { canAccessFeature } from '@/backend/utils/featureFlags';
import { getServerExperimentVariant } from '@/lib/experimentsServer';

const mockGetAuthedUser = vi.mocked(getAuthedUser);
const mockCreateClient = vi.mocked(createClient);
const mockCanAccess = vi.mocked(canAccessFeature);
const mockExperiment = vi.mocked(getServerExperimentVariant);

const USER_ID = '11111111-2222-3333-4444-555555555555';

function req(url = 'https://www.lexiclash.live/api/word-mastery') {
  return { url } as unknown as Request;
}

function chainFrom(result: { data: unknown; error: unknown }) {
  const thenable = {
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    in: vi.fn().mockReturnThis(),
  };
  return {
    select: vi.fn().mockReturnValue(thenable),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.NEXT_PUBLIC_WORD_MASTERY;
  mockCanAccess.mockResolvedValue(false);
  mockExperiment.mockResolvedValue('control');
});

describe('GET /api/word-mastery', () => {
  it('shouldReturn401WhenUnauthenticated', async () => {
    // GIVEN
    mockGetAuthedUser.mockResolvedValueOnce(null);

    // WHEN
    const res = await GET(req());

    // THEN
    expect(res.status).toBe(401);
  });

  it('shouldReturn404WhenFeatureIsGatedOff', async () => {
    // GIVEN
    mockGetAuthedUser.mockResolvedValueOnce({ id: USER_ID, email: 'a@b.c', role: 'authenticated' });

    // WHEN
    const res = await GET(req());

    // THEN
    expect(res.status).toBe(404);
  });

  it('shouldReturnMasteredAndLearningListsFromCache', async () => {
    // GIVEN
    process.env.NEXT_PUBLIC_WORD_MASTERY = '1';
    mockGetAuthedUser.mockResolvedValueOnce({ id: USER_ID, email: 'a@b.c', role: 'authenticated' });
    const cache = chainFrom({
      data: [
        { word: 'dog', status: 'mastered', score: 90, language: 'en' },
        { word: 'quiz', status: 'learning', score: 20, language: 'en' },
      ],
      error: null,
    });
    mockCreateClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'player_word_mastery') return cache;
        return chainFrom({ data: [], error: null });
      }),
    } as never);

    // WHEN
    const res = await GET(req());
    const body = await res.json();

    // THEN
    expect(res.status).toBe(200);
    expect(body.mastered.map((r: { word: string }) => r.word)).toEqual(['dog']);
    expect(body.learning.map((r: { word: string }) => r.word)).toEqual(['quiz']);
  });
});
