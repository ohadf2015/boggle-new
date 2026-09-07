/**
 * GC grade passback for #975 async miss-gap — Kahoot Marketplace foil.
 */
import { describe, it, expect } from 'vitest';
import { CLASS_GAP_ORIGIN } from '../classGapShare';
import {
  MISS_GAP_GRADE_PASSBACK_PATH,
  MISS_GAP_LATE_POINTS,
  MISS_GAP_MAX_POINTS,
  buildMissGapGradeAttachment,
  buildMissGapGradePassback,
  buildMissGapGradePassbackShareUrl,
  buildMissGapStudentSubmissionPatch,
  missGapGradePassbackMarketplaceSlice,
  scoreMissGapHomework,
} from '../missGapGradePassback';

const baseInput = {
  locale: 'en',
  lessonNames: ['Physics 101'],
  teacherName: 'Ms. Cohen',
  found: 2,
  total: 4,
  missedWords: ['neutron', 'quark'],
  dueDate: '2026-09-15',
};

describe('scoreMissGapHomework', () => {
  it('awards full points for on-time completion', () => {
    const score = scoreMissGapHomework({
      dueDate: '2026-09-15',
      completedOn: '2026-09-14',
      completed: true,
    });
    expect(score.pointsEarned).toBe(MISS_GAP_MAX_POINTS);
    expect(score.maxPoints).toBe(MISS_GAP_MAX_POINTS);
    expect(score.onTime).toBe(true);
    expect(score.postState).toBe('TURNED_IN');
  });

  it('awards late points when completed after due date', () => {
    const score = scoreMissGapHomework({
      dueDate: '2026-09-10',
      completedOn: '2026-09-12',
      completed: true,
    });
    expect(score.pointsEarned).toBe(MISS_GAP_LATE_POINTS);
    expect(score.onTime).toBe(false);
    expect(score.postState).toBe('TURNED_IN');
  });

  it('returns zero when not completed', () => {
    const score = scoreMissGapHomework({
      dueDate: '2026-09-15',
      completedOn: '2026-09-14',
      completed: false,
    });
    expect(score.pointsEarned).toBe(0);
    expect(score.postState).toBe('NEW');
  });
});

describe('buildMissGapGradeAttachment', () => {
  it('sets maxPoints and points teacher/student views at grade-passback URI', () => {
    const att = buildMissGapGradeAttachment({ input: baseInput });
    expect(att.maxPoints).toBe(MISS_GAP_MAX_POINTS);
    expect(att.teacherViewUri).toContain(CLASS_GAP_ORIGIN);
    expect(att.teacherViewUri).toContain(MISS_GAP_GRADE_PASSBACK_PATH);
    expect(att.studentViewUri).toBe(att.teacherViewUri);
    expect(att.teacherViewUri).toContain('neutron');
    expect(att.teacherViewUri).toContain('due=2026-09-15');
    expect(att.teacherViewUri).not.toContain('lexiclash.com');
    expect(att.title).toContain('Physics 101');
  });

  it('rejects empty missed words', () => {
    expect(() =>
      buildMissGapGradeAttachment({
        input: { ...baseInput, missedWords: [] },
      }),
    ).toThrow(/missed word/);
  });
});

describe('buildMissGapStudentSubmissionPatch', () => {
  it('emits pointsEarned + postState with updateMask for Classroom patch', () => {
    const score = scoreMissGapHomework({
      dueDate: '2026-09-15',
      completedOn: '2026-09-15',
    });
    const patch = buildMissGapStudentSubmissionPatch(score);
    expect(patch.body.pointsEarned).toBe(100);
    expect(patch.body.postState).toBe('TURNED_IN');
    expect(patch.updateMask).toContain('pointsEarned');
    expect(patch.patchPathTemplate).toContain('addOnAttachments');
  });
});

describe('buildMissGapGradePassback', () => {
  it('builds receipt + attachment + submission for completed homework', () => {
    const result = buildMissGapGradePassback({
      missed_words: ['neutron', 'quark'],
      lesson: 'Physics 101',
      due: '2026-09-15',
      completedOn: '2026-09-14',
      locale: 'en',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.score.pointsEarned).toBe(100);
    expect(result.attachment.maxPoints).toBe(100);
    expect(result.gradeReceiptUrl).toContain(MISS_GAP_GRADE_PASSBACK_PATH);
    expect(result.gradeReceiptUrl).toContain('points=100');
    expect(result.homeworkUrl).toContain('miss-gap-assignment');
    expect(result.student_names).toBe(false);
    expect(result.roster_scopes).toBe(false);
    expect(result.oauth_required_for_grade_sync).toBe(true);
    expect(result.foils).toContain('Kahoot Marketplace grade passback');
    expect(JSON.stringify(result)).not.toMatch(/\bMaya\b/);
    expect(result.student_names).toBe(false);
  });

  it('rejects student name fields', () => {
    const result = buildMissGapGradePassback({
      missed_words: ['neutron'],
      due: '2026-09-15',
      student_names: ['Ada'],
    });
    expect(result.ok).toBe(false);
  });

  it('requires due date', () => {
    const result = buildMissGapGradePassback({
      missed_words: ['neutron'],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/due/i);
  });
});

describe('buildMissGapGradePassbackShareUrl', () => {
  it('embeds score query params on lexiclash.live', () => {
    const score = scoreMissGapHomework({
      dueDate: '2026-09-15',
      completedOn: '2026-09-15',
    });
    const url = buildMissGapGradePassbackShareUrl({
      input: baseInput,
      score,
      context: { courseId: 'c1', itemId: 'i1' },
    });
    expect(url).toContain(`${CLASS_GAP_ORIGIN}/en${MISS_GAP_GRADE_PASSBACK_PATH}`);
    expect(url).toContain('points=100');
    expect(url).toContain('max=100');
    expect(url).toContain('onTime=1');
    expect(url).toContain('courseId=c1');
  });
});

describe('missGapGradePassbackMarketplaceSlice', () => {
  it('documents Kahoot grade-passback foil without roster scopes', () => {
    const slice = missGapGradePassbackMarketplaceSlice();
    expect(slice.foils).toEqual(
      expect.arrayContaining(['Kahoot Marketplace grade passback']),
    );
    expect(slice.student_names).toBe(false);
    expect(slice.roster_scopes).toBe(false);
    expect(String(slice.api)).toContain('/api/classroom-addon/grade-passback');
  });
});
