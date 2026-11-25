import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/utils/supabase/server');
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    log: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    time: vi.fn(),
    timeEnd: vi.fn(),
  },
}));
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({ success: true }),
}));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({ from: vi.fn() }),
}));
vi.mock('@/lib/education/lessonAccess', () => ({
  canStudentPracticeLesson: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/lib/education/studentReturnTelemetry', () => ({
  captureStudentReturned: vi.fn(),
}));

const stampStartMock = vi.fn().mockResolvedValue(true);
vi.mock('@/lib/education/assignmentCompletion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/education/assignmentCompletion')>()),
  stampAssignmentStartForLesson: (...args: unknown[]) => stampStartMock(...args),
}));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';

const USER = '550e8400-e29b-41d4-a716-446655440002';
const LESSON = '550e8400-e29b-41d4-a716-446655440003';

function requestFor(lessonId: string) {
  return new NextRequest('http://localhost/api/education/practice', {
    method: 'POST',
    body: JSON.stringify({ lessonId, practiceType: 'flashcard' }),
  });
}

function mockServerClient() {
  const insertMock = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'session-1', practice_type: 'flashcard' }, error: null }),
    }),
  });
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER } }, error: null }) },
    from: vi.fn((table: string) => {
      if (table === 'practice_sessions') return { insert: insertMock };
      throw new Error(`unexpected table ${table}`);
    }),
  };
  (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(client);
  return client;
}

describe('POST /api/education/practice — assignment start stamp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stampStartMock.mockResolvedValue(true);
  });

  it('stamps the assignment start on the request-scoped client after the session insert', async () => {
    const client = mockServerClient();
    const res = await POST(requestFor(LESSON));
    expect(res.status).toBe(201);
    expect(stampStartMock).toHaveBeenCalledWith(client, { studentId: USER, lessonId: LESSON });
  });

  it('still creates the session when the stamp finds no assignment (resolves false)', async () => {
    mockServerClient();
    stampStartMock.mockResolvedValue(false);
    const res = await POST(requestFor(LESSON));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.session).toEqual({ id: 'session-1', practice_type: 'flashcard' });
  });
});
