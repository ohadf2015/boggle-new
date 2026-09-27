/**
 * GC grade passback for Unplugged reteach Live — Kahoot Classroom add-on foil.
 */
import { describe, it, expect } from 'vitest';
import { CLASS_GAP_ORIGIN } from '../classGapShare';
import {
  UNPLUGGED_GRADE_PASSBACK_PATH,
  UNPLUGGED_MAX_POINTS,
  buildUnpluggedGradeAttachment,
  buildUnpluggedGradePassback,
  buildUnpluggedGradePassbackShareUrl,
  buildUnpluggedStudentSubmissionPatch,
  scoreUnpluggedReteach,
  unpluggedGradePassbackMarketplaceSlice,
} from '../unpluggedReteachGradePassback';

const baseInput = {
  locale: 'en',
  lessonNames: ['Physics 101'],
  teacherName: 'Ms. Cohen',
  found: 2,
  total: 4,
  missedWords: ['neutron', 'quark'],
};

describe('scoreUnpluggedReteach', () => {
  it('awards full accuracy points for perfect on-time clear', () => {
    const score = scoreUnpluggedReteach({
      cleared: 2,
      total: 2,
      dueDate: '2026-09-15',
      completedOn: '2026-09-14',
      completed: true,
    });
    expect(score.pointsEarned).toBe(UNPLUGGED_MAX_POINTS);
    expect(score.maxPoints).toBe(UNPLUGGED_MAX_POINTS);
    expect(score.onTime).toBe(true);
    expect(score.accuracy).toBe(100);
    expect(score.postState).toBe('TURNED_IN');
  });

  it('scales points by cleared/total accuracy', () => {
    const score = scoreUnpluggedReteach({
      cleared: 1,
      total: 2,
      dueDate: '2026-09-15',
      completedOn: '2026-09-15',
      completed: true,
    });
    expect(score.pointsEarned).toBe(50);
    expect(score.accuracy).toBe(50);
    expect(score.onTime).toBe(true);
  });

  it('applies late factor when completed after due date', () => {
    const score = scoreUnpluggedReteach({
      cleared: 2,
      total: 2,
      dueDate: '2026-09-10',
      completedOn: '2026-09-12',
      completed: true,
    });
    expect(score.pointsEarned).toBe(70);
    expect(score.onTime).toBe(false);
    expect(score.postState).toBe('TURNED_IN');
  });

  it('returns zero when not completed', () => {
    const score = scoreUnpluggedReteach({
      cleared: 2,
      total: 2,
      dueDate: '2026-09-15',
      completedOn: '2026-09-14',
      completed: false,
    });
    expect(score.pointsEarned).toBe(0);
    expect(score.postState).toBe('NEW');
  });
});

describe('buildUnpluggedGradeAttachment', () => {
  it('sets maxPoints and points views at grade-passback URI on lexiclash.live', () => {
    const att = buildUnpluggedGradeAttachment({
      input: baseInput,
      dueDate: '2026-09-15',
    });
    expect(att.maxPoints).toBe(UNPLUGGED_MAX_POINTS);
    expect(att.teacherViewUri).toContain(CLASS_GAP_ORIGIN);
    expect(att.teacherViewUri).toContain(UNPLUGGED_GRADE_PASSBACK_PATH);
    expect(att.studentViewUri).toBe(att.teacherViewUri);
    expect(att.teacherViewUri).toContain('neutron');
    expect(att.teacherViewUri).toContain('due=2026-09-15');
    expect(att.teacherViewUri).not.toContain('lexiclash.com');
    expect(att.title).toContain('Physics 101');
  });

  it('rejects empty missed words', () => {
    expect(() =>
      buildUnpluggedGradeAttachment({
        input: { ...baseInput, missedWords: [] },
      }),
    ).toThrow(/missed word/);
  });
});

describe('buildUnpluggedStudentSubmissionPatch', () => {
  it('emits pointsEarned + postState with updateMask for Classroom patch', () => {
    const score = scoreUnpluggedReteach({
      cleared: 2,
      total: 2,
      dueDate: '2026-09-15',
      completedOn: '2026-09-15',
    });
    const patch = buildUnpluggedStudentSubmissionPatch(score);
    expect(patch.body.pointsEarned).toBe(100);
    expect(patch.body.postState).toBe('TURNED_IN');
    expect(patch.updateMask).toContain('pointsEarned');
    expect(patch.patchPathTemplate).toContain('addOnAttachments');
  });
});

describe('buildUnpluggedGradePassback', () => {
  it('builds receipt + attachment + submission for finished Unplugged Live', () => {
    const result = buildUnpluggedGradePassback({
      missed_words: ['neutron', 'quark'],
      lesson: 'Physics 101',
      teacher: 'Ms. Cohen',
      cleared: 2,
      total: 2,
      due: '2026-09-15',
      completedOn: '2026-09-14',
      locale: 'en',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gradeReceiptUrl).toContain(UNPLUGGED_GRADE_PASSBACK_PATH);
    expect(result.gradeReceiptUrl).toContain('points=100');
    expect(result.gradeReceiptUrl).toContain(CLASS_GAP_ORIGIN);
    expect(result.gradeReceiptUrl).not.toContain('lexiclash.com');
    expect(result.unpluggedLiveUrl).toContain('/education/unplugged-reteach');
    expect(result.score.pointsEarned).toBe(100);
    expect(result.attachment.maxPoints).toBe(100);
    expect(result.studentSubmission.body.postState).toBe('TURNED_IN');
    expect(result.student_names).toBe(false);
    expect(result.roster_scopes).toBe(false);
    expect(result.oauth_required_for_grade_sync).toBe(true);
    expect(result.foils.some((f) => /Kahoot/i.test(f))).toBe(true);
  });

  it('rejects student names in body', () => {
    const result = buildUnpluggedGradePassback({
      missed_words: ['neutron'],
      student_name: 'Ada',
      due: '2026-09-15',
    });
    expect(result.ok).toBe(false);
  });

  it('requires at least one missed word', () => {
    const result = buildUnpluggedGradePassback({
      missed_words: [],
      due: '2026-09-15',
    });
    expect(result.ok).toBe(false);
  });
});

describe('buildUnpluggedGradePassbackShareUrl', () => {
  it('never uses lexiclash.com', () => {
    const score = scoreUnpluggedReteach({
      cleared: 2,
      total: 2,
      dueDate: '2026-09-15',
      completedOn: '2026-09-15',
    });
    const url = buildUnpluggedGradePassbackShareUrl({
      input: baseInput,
      score,
      dueDate: '2026-09-15',
    });
    expect(url).toContain('lexiclash.live');
    expect(url).not.toContain('lexiclash.com');
    expect(url).toContain('cleared=2');
  });
});

describe('unpluggedGradePassbackMarketplaceSlice', () => {
  it('advertises Kahoot Classroom foil and deferred OAuth', () => {
    const slice = unpluggedGradePassbackMarketplaceSlice();
    expect(slice.student_names).toBe(false);
    expect(slice.oauth_required_for_grade_sync).toBe(true);
    expect(String(slice.api)).toContain('/api/classroom-addon/unplugged-grade-passback');
  });
});
