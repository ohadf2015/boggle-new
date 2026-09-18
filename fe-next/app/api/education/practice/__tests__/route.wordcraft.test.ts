import { vi } from 'vitest';
/**
 * Practice API — Word Craft rounds (solo_board + mode=wordcraft).
 * POST stores the practice type plus the chosen focus (mode + results JSON);
 * PATCH completion scores it with the flashcard XP formula.
 */

vi.mock('next/server', () => {
  class MockNextRequest {
    private _body: any;
    url: string;
    method: string;
    headers = new Map<string, string>();
    constructor(url: string, init?: { method?: string; body?: string }) {
      this.url = url;
      this.method = init?.method || 'GET';
      this._body = init?.body ? JSON.parse(init.body) : null;
    }
    async json() {
      return this._body;
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: vi.fn((data: any, init?: { status?: number }) => ({ json: async () => data, status: init?.status || 200 })),
    },
  };
});

vi.mock('@/utils/supabase/server');
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
const mockCalculatePracticeXp = vi.fn(() => ({ totalXp: 50, breakdown: {}, masteryMessage: 'ok' }));
vi.mock('@/backend/modules/educationXpManager', () => ({
  calculatePracticeXp: (...args: unknown[]) => mockCalculatePracticeXp(...(args as [])),
}));
vi.mock('@/lib/supabase/education/challengeProgress', () => ({
  updateEducationChallengeProgress: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({ success: true }),
}));

// Lesson access is read with the service-role client (classroom membership,
// not lesson_assignments) — see lib/education/lessonAccess.ts.
const mockAdmin = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => mockAdmin(),
}));

const mockFind = vi.fn();
const mockStamp = vi.fn();
vi.mock('@/lib/education/assignmentCompletion', () => ({
  findSatisfiedAssignment: (...args: unknown[]) => mockFind(...(args as [])),
  stampAssignmentCompletion: (...args: unknown[]) => mockStamp(...(args as [])),
}));

import { NextRequest } from 'next/server';
import { PATCH, POST } from '../route';
import { createClient } from '@/utils/supabase/server';

const USER = '550e8400-e29b-41d4-a716-446655440002';
const LESSON = '550e8400-e29b-41d4-a716-446655440003';
const SESSION = '550e8400-e29b-41d4-a716-446655440001';

function grantAccess() {
  (mockAdmin as any).mockReturnValue({
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      if (table === 'vocabulary_lessons') {
        chain.single = vi.fn().mockResolvedValue({ data: { teacher_id: 'x', classroom_id: 'c1' }, error: null });
      } else {
        chain.then = (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: [{ classroom_id: 'c1' }], error: null }).then(resolve);
      }
      return chain;
    }),
  });
}

describe('POST /api/education/practice — Word Craft', () => {
  let insertMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: SESSION }, error: null }),
      }),
    });
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER } }, error: null }) },
      from: vi.fn(() => ({ insert: insertMock })),
      rpc: vi.fn(),
    });
    grantAccess();
  });

  it('Given variant wordcraft, When started, Then it records as solo_board with mode wordcraft (practice_type CHECK has no wordcraft)', async () => {
    const res = await POST(new NextRequest('http://localhost/api/education/practice', {
      method: 'POST',
      body: JSON.stringify({ lessonId: LESSON, practiceType: 'solo_board', variant: 'wordcraft' }),
    }));
    expect(res.status).toBe(201);
    expect(insertMock).toHaveBeenCalledWith({
      student_id: USER, lesson_id: LESSON, practice_type: 'solo_board', mode: 'wordcraft',
    });
  });

  it("Given practiceType 'wordcraft', When started, Then it is rejected before the DB CHECK can 500", async () => {
    const res = await POST(new NextRequest('http://localhost/api/education/practice', {
      method: 'POST',
      body: JSON.stringify({ lessonId: LESSON, practiceType: 'wordcraft' }),
    }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/education/practice — Word Craft completion', () => {
  function mockClient() {
    const existing = {
      id: SESSION, student_id: USER, lesson_id: LESSON, completed_at: null,
      practice_type: 'solo_board', mode: 'wordcraft', vocabulary_words_found: ['CAT'],
    };
    const from = vi.fn((table: string) => {
      if (table === 'practice_sessions') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existing, error: null }),
          }) }) }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { ...existing, completed_at: 'now' }, error: null }) }),
          }) }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { current_streak: 0 }, error: null }),
      };
    });
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER } }, error: null }) },
      from,
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockFind.mockResolvedValue('A1');
    mockStamp.mockResolvedValue(true);
    mockClient();
  });

  it('Given a finished Word Craft round, When completed, Then it scores as solo_board and stamps the assignment', async () => {
    const res = await PATCH(new NextRequest('http://localhost/api/education/practice', {
      method: 'PATCH',
      body: JSON.stringify({ sessionId: SESSION, vocabularyWordsFound: ['CAT'], totalScore: 40, completed: true }),
    }));
    expect(res.status).toBe(200);
    expect(mockCalculatePracticeXp).toHaveBeenCalledWith(expect.objectContaining({ type: 'solo_board' }));
    expect(mockFind).toHaveBeenCalledWith(expect.anything(), { lessonId: LESSON, sessionMode: 'wordcraft' });
    expect(mockStamp).toHaveBeenCalledWith(expect.anything(), {
      studentId: USER, lessonId: LESSON, assignmentId: 'A1',
    });
  });

  it('Given a progress update without completion, When patched, Then no assignment is stamped', async () => {
    await PATCH(new NextRequest('http://localhost/api/education/practice', {
      method: 'PATCH',
      body: JSON.stringify({ sessionId: SESSION, totalScore: 10 }),
    }));
    expect(mockFind).not.toHaveBeenCalled();
    expect(mockStamp).not.toHaveBeenCalled();
  });

  it('Given the stamp throws, When completed, Then the round still saves (logged, not a 500)', async () => {
    mockFind.mockRejectedValueOnce(new Error('boom'));
    const res = await PATCH(new NextRequest('http://localhost/api/education/practice', {
      method: 'PATCH',
      body: JSON.stringify({ sessionId: SESSION, completed: true }),
    }));
    expect(res.status).toBe(200);
    expect(mockStamp).not.toHaveBeenCalled();
  });

  it('Given no assignment is satisfied, When completed, Then nothing is stamped', async () => {
    mockFind.mockResolvedValueOnce(null);
    await PATCH(new NextRequest('http://localhost/api/education/practice', {
      method: 'PATCH',
      body: JSON.stringify({ sessionId: SESSION, completed: true }),
    }));
    expect(mockStamp).not.toHaveBeenCalled();
  });
});
