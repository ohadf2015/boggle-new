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

vi.mock('@/backend/utils/gameUtils', () => ({
  generateRandomTable: vi.fn(() => [
    ['Q', 'U'],
    ['I', 'Z'],
  ]),
}));

import { POST } from '../route';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createClient } from '@/utils/supabase/server';
import { generateRandomTable } from '@/backend/utils/gameUtils';

const mockGetAuthedUser = vi.mocked(getAuthedUser);
const mockCreateClient = vi.mocked(createClient);
const mockGenerate = vi.mocked(generateRandomTable);

const USER_ID = '11111111-2222-3333-4444-555555555555';

function req(body: unknown = { language: 'en' }) {
  return {
    url: 'https://www.lexiclash.live/api/word-mastery/practice',
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_WORD_MASTERY = '1';
  mockGetAuthedUser.mockResolvedValue({ id: USER_ID, email: 'a@b.c', role: 'authenticated' });
});

describe('POST /api/word-mastery/practice', () => {
  it('shouldReturn401WhenUnauthenticated', async () => {
    // GIVEN
    mockGetAuthedUser.mockResolvedValueOnce(null);

    // WHEN
    const res = await POST(req());

    // THEN
    expect(res.status).toBe(401);
  });

  it('shouldReturn400WhenNoLearningWords', async () => {
    // GIVEN
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    } as never);

    // WHEN
    const res = await POST(req());

    // THEN
    expect(res.status).toBe(400);
  });

  it('shouldSeedGridFromWeakestLearningWords', async () => {
    // GIVEN
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [
              { word: 'quiz', score: 10, status: 'learning' },
              { word: 'axiom', score: 20, status: 'learning' },
            ],
            error: null,
          }),
        })),
      })),
    } as never);

    // WHEN
    const res = await POST(req({ language: 'en' }));
    const body = await res.json();

    // THEN
    expect(res.status).toBe(200);
    expect(body.seedWords).toEqual(['quiz', 'axiom']);
    expect(mockGenerate).toHaveBeenCalledWith(4, 4, 'en', ['quiz', 'axiom']);
    expect(body.grid).toEqual([
      ['Q', 'U'],
      ['I', 'Z'],
    ]);
  });
});
