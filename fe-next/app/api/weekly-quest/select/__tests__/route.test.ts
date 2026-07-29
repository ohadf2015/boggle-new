import { vi, type Mock } from 'vitest';
// @ts-nocheck

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

const mockCheckApiRateLimit = vi.fn().mockReturnValue({ success: true });
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: (...args: unknown[]) => mockCheckApiRateLimit(...args),
}));

const mockGetUser = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockAdminFrom = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: (...args: unknown[]) => mockAdminFrom(...args),
  }),
}));

vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

// Freeze week so getWeekStart() is deterministic (week of 2026-04-13)
vi.setSystemTime(new Date('2026-04-19T12:00:00Z'));

import { POST } from '../route';
import { getAvailableQuests } from '@/shared/weeklyQuestTemplates';

// Resolve actual quest IDs for this frozen week
const EASY_QUEST_ID = getAvailableQuests().find(q => q.difficulty === 'easy')!.id;

const mockHeaders = { get: vi.fn().mockReturnValue('127.0.0.1') };

function makeRequest(body: unknown) {
  return {
    json: () => Promise.resolve(body),
    headers: mockHeaders,
  } as unknown as import('next/server').NextRequest;
}

function setupInsertMock(result: { data: unknown; error: unknown }) {
  mockAdminFrom.mockReturnValue({
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
    }),
  });
}

describe('POST /api/weekly-quest/select', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    mockCheckApiRateLimit.mockReturnValue({ success: true });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  describe('Authentication', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
      const res = await POST(makeRequest({ questId: EASY_QUEST_ID }));
      expect(res.status).toBe(401);
    });
  });

  describe('Validation', () => {
    it('returns 400 for missing questId', async () => {
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Missing questId');
    });

    it('returns 400 for unknown questId', async () => {
      const res = await POST(makeRequest({ questId: 'fake_quest_type' }));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Invalid questId');
    });
  });

  describe('Happy path', () => {
    it('inserts quest row using admin client and returns 200', async () => {
      const fakeRow = {
        id: 'row-1',
        quest_type: 'daily_challenges',
        title: 'test',
        description: 'test',
        requirements: JSON.stringify({ target: 3, type: 'daily_challenges' }),
        current_progress: JSON.stringify({ current: 0 }),
        xp_reward: 150,
        completed: false,
        week_start: '2026-04-13',
      };
      setupInsertMock({ data: fakeRow, error: null });

      const res = await POST(makeRequest({ questId: EASY_QUEST_ID }));
      expect(res.status).toBe(200);
      expect(res.data.quest).toBeDefined();
      expect(res.data.quest.questType).toBe('daily_challenges');
      // Confirm admin client was used (not user-JWT client)
      expect(mockAdminFrom).toHaveBeenCalledWith('weekly_quests');
    });
  });

  describe('Duplicate prevention', () => {
    it('returns 409 when a quest already exists for the week', async () => {
      setupInsertMock({
        data: null,
        error: { code: '23505', message: 'duplicate key' },
      });

      const res = await POST(makeRequest({ questId: EASY_QUEST_ID }));
      expect(res.status).toBe(409);
      expect(res.data.error).toBe('Quest already selected for this week');
    });
  });

  describe('Rate limiting', () => {
    it('returns 429 when rate limited', async () => {
      mockCheckApiRateLimit.mockReturnValue({ success: false });
      const res = await POST(makeRequest({ questId: EASY_QUEST_ID }));
      expect(res.status).toBe(429);
    });
  });
});
