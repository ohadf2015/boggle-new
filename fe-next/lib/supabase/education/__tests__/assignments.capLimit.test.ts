import { vi, describe, it, expect, beforeEach } from 'vitest';
import { supabase as _supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { createAssignment, assignLesson } from '../assignments';

const supabase = _supabase!;

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/education/lessonPlayStat', () => ({ recordLessonPlays: vi.fn() }));
vi.mock('@/lib/education/teacherActivationFunnel', () => ({
  captureTeacherActivationFunnelStep: vi.fn(),
  captureTeacherActivationFunnelCompleted: vi.fn(),
}));

// What PostgREST returns for `raise exception 'ASSIGNMENT_LIMIT_REACHED' using detail = ...`.
const CAP_ERROR = {
  code: 'P0001',
  message: 'ASSIGNMENT_LIMIT_REACHED',
  details: '{"currentCount" : 3, "limit" : 3}',
  hint: null,
};

function mockInsertError(error: unknown) {
  const single = vi.fn().mockResolvedValue({ data: null, error });
  const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) });
  const select = vi.fn(() => ({ eq: vi.fn(async () => ({ count: 3, error: null })) }));
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert, select });
}

describe('assignment inserts refused by the free cap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createAssignment reports the cap code the upsell keys on', async () => {
    mockInsertError(CAP_ERROR);
    const res = await createAssignment({ classroom_id: 'c1', lesson_id: 'l4', teacher_id: 't1' });
    expect(res.data).toBeNull();
    expect(res.error).toEqual({ message: 'ASSIGNMENT_LIMIT_REACHED', code: 'ASSIGNMENT_LIMIT_REACHED' });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('the legacy assignLesson path reports the same code', async () => {
    mockInsertError(CAP_ERROR);
    const res = await assignLesson('l4', 'c1');
    expect(res.error?.message).toBe('ASSIGNMENT_LIMIT_REACHED');
  });

  it('an unrelated database error is still logged and passed through', async () => {
    mockInsertError({ code: '42501', message: 'permission denied', details: null, hint: null });
    const res = await createAssignment({ classroom_id: 'c1', lesson_id: 'l4', teacher_id: 't1' });
    expect(res.error).toEqual({ message: 'permission denied', code: '42501' });
    expect(logger.error).toHaveBeenCalled();
  });
});
