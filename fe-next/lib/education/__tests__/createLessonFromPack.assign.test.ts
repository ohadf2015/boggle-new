import { vi, describe, it, expect, beforeEach } from 'vitest';
import { assignStarterPack } from '../createLessonFromPack';
import { createAssignment } from '@/lib/supabase/education/assignments';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';

vi.mock('@/lib/supabase/education/assignments', () => ({ createAssignment: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockCreateAssignment = createAssignment as unknown as ReturnType<typeof vi.fn>;
const pack = STARTER_LESSON_PACKS.find((p) => p.language === 'he') ?? STARTER_LESSON_PACKS[0];

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateAssignment.mockResolvedValue({ data: { id: 'a1' }, error: null });
});

describe('assignStarterPack', () => {
  it('Given a new class and a starter pack, When assigned, Then one lesson in the pack language reaches that class', async () => {
    const createLesson = vi.fn().mockResolvedValue({ success: true, data: { id: 'l1' } });

    const result = await assignStarterPack({ pack, title: 'Animals', classroomId: 'c1', teacherId: 't1', createLesson });

    expect(createLesson).toHaveBeenCalledTimes(1);
    expect(createLesson).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Animals', language: pack.language, classroomId: 'c1' }),
    );
    expect(createLesson.mock.calls[0][0].words).toHaveLength(pack.words.length);
    expect(mockCreateAssignment).toHaveBeenCalledTimes(1);
    expect(mockCreateAssignment).toHaveBeenCalledWith(expect.objectContaining({ classroom_id: 'c1', lesson_id: 'l1' }));
    expect(result).toEqual(expect.objectContaining({ success: true, assigned: true }));
  });

  it('Given the assignment insert fails, Then the result says the class did not get the words', async () => {
    const createLesson = vi.fn().mockResolvedValue({ success: true, data: { id: 'l1' } });
    mockCreateAssignment.mockResolvedValue({ data: null, error: { message: 'ASSIGNMENT_LIMIT_REACHED' } });

    const result = await assignStarterPack({ pack, title: 'Animals', classroomId: 'c1', teacherId: 't1', createLesson });

    expect(result.assigned).toBe(false);
    expect(result.assignmentError).toBe('ASSIGNMENT_LIMIT_REACHED');
  });

  it('Given the lesson cannot be saved, Then nothing is assigned', async () => {
    const createLesson = vi.fn().mockResolvedValue({ success: false, error: 'offline' });

    const result = await assignStarterPack({ pack, title: 'Animals', classroomId: 'c1', teacherId: 't1', createLesson });

    expect(result).toEqual(expect.objectContaining({ success: false, assigned: false }));
    expect(mockCreateAssignment).not.toHaveBeenCalled();
  });
});
