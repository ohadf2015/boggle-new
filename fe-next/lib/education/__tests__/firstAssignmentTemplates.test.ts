import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FIRST_ASSIGNMENT_TEMPLATES,
  firstAssignmentTemplatesFor,
  dueDateIso,
  assignFirstAssignmentTemplate,
} from '../firstAssignmentTemplates';
import { createAssignment } from '@/lib/supabase/education/assignments';
import { WORDCRAFT_FOCUS } from '../wordcraftAssignment';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';

vi.mock('@/lib/supabase/education/assignments', () => ({ createAssignment: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockCreateAssignment = createAssignment as unknown as ReturnType<typeof vi.fn>;

describe('firstAssignmentTemplates', () => {
  it('covers every education language so no classroom gets an empty grid', () => {
    for (const language of EDUCATION_LANGUAGES) {
      const packs = firstAssignmentTemplatesFor(language);
      expect(packs.length).toBeGreaterThan(0);
      expect(packs.every((p) => p.words.length >= 8)).toBe(true);
    }
  });

  it('returns English packs when the language has no dedicated list', () => {
    const packs = firstAssignmentTemplatesFor('en');
    expect(packs.map((p) => p.id)).toEqual(['starter-animals-en', 'starter-colors-en']);
  });

  it('keeps Hebrew packs in Hebrew, not the English fallback', () => {
    const packs = firstAssignmentTemplatesFor('he');
    expect(packs.every((p) => p.language === 'he')).toBe(true);
    expect(packs.some((p) => p.words.some((w) => /[\u0590-\u05FF]/.test(w.word)))).toBe(true);
  });

  it('formats due dates as local YYYY-MM-DD, not UTC', () => {
    expect(dueDateIso(1, new Date('2026-09-25T23:00:00'))).toBe('2026-09-26');
    expect(dueDateIso(0, new Date('2026-09-25T00:30:00'))).toBe('2026-09-25');
  });

  it('every pack has unique id and canIntegrate words', () => {
    const ids = FIRST_ASSIGNMENT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const pack of FIRST_ASSIGNMENT_TEMPLATES) {
      expect(pack.words.every((word) => word.canIntegrate && word.word.trim().length > 0)).toBe(true);
    }
  });
});

describe('assignFirstAssignmentTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAssignment.mockResolvedValue({ data: { id: 'a1' }, error: null });
  });

  it('creates the lesson and a Word Craft assignment due tomorrow', async () => {
    const createLesson = vi.fn().mockResolvedValue({ success: true, data: { id: 'lesson-1' } });
    const template = firstAssignmentTemplatesFor('en')[0];

    const result = await assignFirstAssignmentTemplate({
      template,
      classroomId: 'class-1',
      teacherId: 'teacher-1',
      lessonName: 'Animals',
      createLesson,
      now: new Date('2026-09-25T12:00:00'),
    });

    expect(result.success).toBe(true);
    expect(result.assigned).toBe(true);
    expect(createLesson).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Animals',
        classroomId: 'class-1',
        language: 'en',
        words: template.words,
      }),
    );
    expect(mockCreateAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        classroom_id: 'class-1',
        lesson_id: 'lesson-1',
        teacher_id: 'teacher-1',
        assignment_type: 'practice',
        due_date: '2026-09-26',
        practice_focus: WORDCRAFT_FOCUS,
      }),
    );
  });
});
