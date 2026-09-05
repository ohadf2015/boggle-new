import { vi } from 'vitest';
/**
 * Practice API — `vocab_focus` sessions.
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

import { NextRequest } from 'next/server';
import { PATCH, POST } from '../route';
import { createClient } from '@/utils/supabase/server';

const USER = '550e8400-e29b-41d4-a716-446655440002';
const LESSON = '550e8400-e29b-41d4-a716-446655440003';
const SESSION = '550e8400-e29b-41d4-a716-446655440001';

describe('POST /api/education/practice — vocab_focus', () => {
  let insertMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: SESSION, practice_type: 'vocab_focus' }, error: null }),
      }),
    });
    const accessChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'assign-1' }, error: null }),
    };
    const lessonChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { teacher_id: 'someone-else' }, error: null }),
    };
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER } }, error: null }) },
      from: vi.fn((table: string) => {
        if (table === 'practice_sessions') return { insert: insertMock };
        if (table === 'lesson_assignments') return accessChain;
        return lessonChain;
      }),
      rpc: vi.fn(),
    });
  });

  it('accepts practiceType vocab_focus and records the focus in mode + results', async () => {
    const request = new NextRequest('http://localhost/api/education/practice', {
      method: 'POST',
      body: JSON.stringify({ lessonId: LESSON, practiceType: 'vocab_focus', focus: 'synonym' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(insertMock).toHaveBeenCalledWith({
      student_id: USER,
      lesson_id: LESSON,
      practice_type: 'vocab_focus',
      mode: 'vocab_focus',
      results: { focus: 'synonym' },
    });
  });

  it('rejects an unknown focus', async () => {
    const request = new NextRequest('http://localhost/api/education/practice', {
      method: 'POST',
      body: JSON.stringify({ lessonId: LESSON, practiceType: 'vocab_focus', focus: 'vibes' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('classic modes keep the legacy insert shape', async () => {
    const request = new NextRequest('http://localhost/api/education/practice', {
      method: 'POST',
      body: JSON.stringify({ lessonId: LESSON, practiceType: 'flashcard' }),
    });
    await POST(request);
    expect(insertMock).toHaveBeenCalledWith({ student_id: USER, lesson_id: LESSON, practice_type: 'flashcard' });
  });
});

describe('PATCH /api/education/practice — vocab_focus completion', () => {
  it('scores a vocab_focus session with the flashcard formula (cards reviewed/correct)', async () => {
    const completedSession = {
      id: SESSION,
      student_id: USER,
      lesson_id: LESSON,
      practice_type: 'vocab_focus',
      cards_reviewed: 10,
      cards_correct: 8,
      vocabulary_words_found: [],
      words_correct: 0,
      words_attempted: 0,
    };
    const from = vi.fn((table: string) => {
      if (table === 'practice_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: SESSION, student_id: USER, completed_at: null }, error: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: completedSession, error: null }) }),
              then: undefined,
            }),
          }),
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

    const request = new NextRequest('http://localhost/api/education/practice', {
      method: 'PATCH',
      body: JSON.stringify({ sessionId: SESSION, cardsReviewed: 10, cardsCorrect: 8, completed: true }),
    });
    const response = await PATCH(request);
    expect(response.status).toBe(200);
    expect(mockCalculatePracticeXp).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'flashcard', sessionData: expect.objectContaining({ cardsReviewed: 10, cardsCorrect: 8 }) })
    );
  });
});
