import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ASSIGNMENT_TEMPLATES,
  GRADE_BANDS,
  SUBJECTS,
  assignmentTemplatesFor,
  filterAssignmentTemplates,
  getAssignmentTemplate,
  assignAssignmentTemplate,
} from '../assignmentTemplates';
import { createAssignment } from '@/lib/supabase/education/assignments';
import { WORDCRAFT_FOCUS } from '../wordcraftAssignment';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';

vi.mock('@/lib/supabase/education/assignments', () => ({ createAssignment: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockCreateAssignment = createAssignment as unknown as ReturnType<typeof vi.fn>;

describe('assignmentTemplates catalog', () => {
  it('is a non-empty typed list organized by grade band and subject', () => {
    expect(ASSIGNMENT_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    for (const template of ASSIGNMENT_TEMPLATES) {
      expect(GRADE_BANDS).toContain(template.gradeBand);
      expect(SUBJECTS).toContain(template.subject);
      expect(template.id.length).toBeGreaterThan(0);
      expect(template.words.length).toBeGreaterThanOrEqual(8);
      expect(template.words.every((word) => word.canIntegrate && word.word.trim().length > 0)).toBe(
        true,
      );
    }
  });

  it('covers English vocab, science, and geography', () => {
    const subjects = new Set(ASSIGNMENT_TEMPLATES.map((t) => t.subject));
    expect(subjects.has('english')).toBe(true);
    expect(subjects.has('science')).toBe(true);
    expect(subjects.has('geography')).toBe(true);
  });

  it('covers every grade band', () => {
    const bands = new Set(ASSIGNMENT_TEMPLATES.map((t) => t.gradeBand));
    for (const band of GRADE_BANDS) {
      expect(bands.has(band)).toBe(true);
    }
  });

  it('has unique ids', () => {
    const ids = ASSIGNMENT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never returns an empty gallery for a classroom language', () => {
    for (const language of EDUCATION_LANGUAGES) {
      const packs = assignmentTemplatesFor(language);
      expect(packs.length).toBeGreaterThan(0);
    }
  });

  it('filters by grade band and subject together', () => {
    const scienceMid = filterAssignmentTemplates({
      language: 'en',
      gradeBand: '6-8',
      subject: 'science',
    });
    expect(scienceMid.length).toBeGreaterThan(0);
    expect(scienceMid.every((t) => t.gradeBand === '6-8' && t.subject === 'science')).toBe(true);
  });

  it('looks up a template by id', () => {
    const first = ASSIGNMENT_TEMPLATES[0];
    expect(getAssignmentTemplate(first.id)?.id).toBe(first.id);
    expect(getAssignmentTemplate('not-a-real-template')).toBeUndefined();
  });
});

describe('assignAssignmentTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAssignment.mockResolvedValue({ data: { id: 'a1' }, error: null });
  });

  it('reuses createLessonAndAssign so the classroom gets a normal assignment', async () => {
    const createLesson = vi.fn().mockResolvedValue({ success: true, data: { id: 'lesson-1' } });
    const template = assignmentTemplatesFor('en')[0];

    const result = await assignAssignmentTemplate({
      template,
      classroomId: 'class-1',
      teacherId: 'teacher-1',
      lessonName: 'Science pack',
      createLesson,
      now: new Date('2026-10-18T12:00:00'),
    });

    expect(result.success).toBe(true);
    expect(result.assigned).toBe(true);
    expect(createLesson).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Science pack',
        classroomId: 'class-1',
        language: template.language,
        words: template.words,
      }),
    );
    expect(mockCreateAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        classroom_id: 'class-1',
        lesson_id: 'lesson-1',
        teacher_id: 'teacher-1',
        assignment_type: 'practice',
        due_date: '2026-10-19',
        practice_focus: WORDCRAFT_FOCUS,
      }),
    );
  });
});
