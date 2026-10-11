import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createWordGoalAssignment } from '../createWordGoalAssignment';
import { createAssignment } from '@/lib/supabase/education/assignments';
import { trackAssignmentCreated } from '../assignmentEvents';

vi.mock('@/lib/supabase/education/assignments', () => ({ createAssignment: vi.fn() }));
vi.mock('../assignmentEvents', () => ({ trackAssignmentCreated: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockCreateAssignment = createAssignment as unknown as ReturnType<typeof vi.fn>;
const mockTrack = trackAssignmentCreated as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateAssignment.mockResolvedValue({ data: { id: 'asg-1' }, error: null });
});

describe('createWordGoalAssignment', () => {
  it('creates a lesson + assignment for a word-count goal and emits assignment_created', async () => {
    const createLesson = vi.fn().mockResolvedValue({ success: true, data: { id: 'les-1' } });
    const result = await createWordGoalAssignment({
      goal: { kind: 'word_count', target: 12, dueDate: '2026-10-17' },
      classroomId: 'cls-1',
      teacherId: 't-1',
      language: 'en',
      createLesson,
      findNWordsLabel: (n) => `Find ${n} words`,
    });
    expect(result).toEqual({ success: true, assigned: true, assignmentId: 'asg-1' });
    expect(createLesson).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Find 12 words',
      classroomId: 'cls-1',
    }));
    expect(mockCreateAssignment).toHaveBeenCalledWith(expect.objectContaining({
      classroom_id: 'cls-1',
      lesson_id: 'les-1',
      due_date: '2026-10-17',
      word_count_target: 12,
    }));
    expect(mockTrack).toHaveBeenCalledWith(expect.objectContaining({
      classroom_id: 'cls-1',
      assignment_id: 'asg-1',
      kind: 'word_count',
      word_count_target: 12,
    }));
  });

  it('stores the pasted list as the lesson words and no count target', async () => {
    const createLesson = vi.fn().mockResolvedValue({ success: true, data: { id: 'les-2' } });
    await createWordGoalAssignment({
      goal: { kind: 'word_list', words: ['cat', 'dog', 'fish'], dueDate: '2026-10-18' },
      classroomId: 'cls-1',
      teacherId: 't-1',
      language: 'en',
      createLesson,
      findNWordsLabel: (n) => `Find ${n} words`,
    });
    expect(createLesson.mock.calls[0][0].words.map((w: { word: string }) => w.word)).toEqual(['cat', 'dog', 'fish']);
    expect(mockCreateAssignment).toHaveBeenCalledWith(expect.objectContaining({
      word_count_target: null,
      due_date: '2026-10-18',
    }));
    expect(mockTrack).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'word_list',
      word_list_length: 3,
    }));
  });

  it('does not claim assigned when the assignment insert fails', async () => {
    mockCreateAssignment.mockResolvedValue({ data: null, error: { message: 'rls' } });
    const createLesson = vi.fn().mockResolvedValue({ success: true, data: { id: 'les-1' } });
    const result = await createWordGoalAssignment({
      goal: { kind: 'word_count', target: 8, dueDate: '2026-10-17' },
      classroomId: 'cls-1',
      teacherId: 't-1',
      language: 'en',
      createLesson,
      findNWordsLabel: (n) => `Find ${n} words`,
    });
    expect(result.success).toBe(true);
    expect(result.assigned).toBe(false);
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
