import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  GC_GRADE_PASSBACK_SCOPES,
  gradePercentFromProgress,
  scaleToMaxPoints,
  matchStudentsByEmail,
  isGradePassbackServerEnabled,
  isGradePassbackUiEnabled,
} from '../googleClassroomGrades';

describe('GC_GRADE_PASSBACK_SCOPES', () => {
  it('requests coursework write, course + roster read, and profile.emails (needed for emailAddress)', () => {
    expect(GC_GRADE_PASSBACK_SCOPES).toEqual([
      'https://www.googleapis.com/auth/classroom.coursework.students',
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/classroom.rosters.readonly',
      'https://www.googleapis.com/auth/classroom.profile.emails',
    ]);
  });
});

describe('gradePercentFromProgress', () => {
  it('Given words_attempted counts, When graded, Then percent = correct / attempts', () => {
    const pct = gradePercentFromProgress({
      completed_at: null,
      words_attempted: { cat: { attempts: 4, correct: 3 }, dog: { attempts: 4, correct: 1 } },
      words_mastered: ['cat'],
    });
    expect(pct).toBe(50);
  });

  it('Given no attempts but a completed lesson, Then completion credit = 100', () => {
    expect(gradePercentFromProgress({ completed_at: '2026-09-01T00:00:00Z', words_attempted: {}, words_mastered: [] })).toBe(100);
  });

  it('Given no attempts and not completed, Then null (skipped, never a 0)', () => {
    expect(gradePercentFromProgress({ completed_at: null, words_attempted: {}, words_mastered: [] })).toBeNull();
    expect(gradePercentFromProgress(null)).toBeNull();
  });

  it('ignores malformed words_attempted entries (legacy numeric value)', () => {
    expect(gradePercentFromProgress({ completed_at: null, words_attempted: 7 as unknown as Record<string, unknown> })).toBeNull();
    expect(
      gradePercentFromProgress({ completed_at: null, words_attempted: { a: { attempts: 'x', correct: 1 }, b: { attempts: 2, correct: 2 } } }),
    ).toBe(100);
  });

  it('clamps correct > attempts to 100', () => {
    expect(gradePercentFromProgress({ completed_at: null, words_attempted: { a: { attempts: 1, correct: 5 } } })).toBe(100);
  });
});

describe('scaleToMaxPoints', () => {
  it('scales a percent onto maxPoints, 2-decimal rounding', () => {
    expect(scaleToMaxPoints(50, 100)).toBe(50);
    expect(scaleToMaxPoints(66.6666, 10)).toBe(6.67);
    expect(scaleToMaxPoints(100, 25)).toBe(25);
    expect(scaleToMaxPoints(0, 20)).toBe(0);
  });

  it('throws for ungraded courseWork (maxPoints 0 / missing)', () => {
    expect(() => scaleToMaxPoints(50, 0)).toThrow(/ungraded/);
    expect(() => scaleToMaxPoints(50, undefined as unknown as number)).toThrow(/ungraded/);
  });
});

describe('matchStudentsByEmail', () => {
  const roster = [
    { userId: 'g-1', profile: { emailAddress: 'Dana@School.org' } },
    { userId: 'g-2', profile: { emailAddress: 'omer@school.org' } },
    { userId: 'g-3', profile: {} },
  ];

  it('matches case-insensitively and trims', () => {
    const r = matchStudentsByEmail(
      [{ studentId: 's1', name: 'Dana', email: '  dana@school.ORG ' }],
      roster,
    );
    expect(r.matched).toEqual([{ studentId: 's1', name: 'Dana', googleUserId: 'g-1' }]);
    expect(r.unmatched).toEqual([]);
  });

  it('reports anonymous guests (no email) and non-roster emails as unmatched, never guessed', () => {
    const r = matchStudentsByEmail(
      [
        { studentId: 's1', name: 'Guest Fox', email: null },
        { studentId: 's2', name: 'Noa', email: 'noa@elsewhere.org' },
        { studentId: 's3', name: 'Omer', email: 'omer@school.org' },
      ],
      roster,
    );
    expect(r.matched).toEqual([{ studentId: 's3', name: 'Omer', googleUserId: 'g-2' }]);
    expect(r.unmatched).toEqual([
      { studentId: 's1', name: 'Guest Fox', reason: 'no_email' },
      { studentId: 's2', name: 'Noa', reason: 'not_in_course' },
    ]);
  });

  it('never matches two LexiClash students to the same Google student', () => {
    const r = matchStudentsByEmail(
      [
        { studentId: 's1', name: 'A', email: 'omer@school.org' },
        { studentId: 's2', name: 'B', email: 'OMER@school.org' },
      ],
      roster,
    );
    expect(r.matched).toHaveLength(1);
    expect(r.unmatched).toEqual([{ studentId: 's2', name: 'B', reason: 'duplicate_email' }]);
  });
});

describe('feature flags', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('server flag defaults OFF and only "true" turns it on', () => {
    vi.stubEnv('GC_GRADE_PASSBACK_ENABLED', '');
    expect(isGradePassbackServerEnabled()).toBe(false);
    vi.stubEnv('GC_GRADE_PASSBACK_ENABLED', '1');
    expect(isGradePassbackServerEnabled()).toBe(false);
    vi.stubEnv('GC_GRADE_PASSBACK_ENABLED', 'true');
    expect(isGradePassbackServerEnabled()).toBe(true);
  });

  it('UI flag defaults OFF', () => {
    vi.stubEnv('NEXT_PUBLIC_GC_GRADE_PASSBACK', '');
    expect(isGradePassbackUiEnabled()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_GC_GRADE_PASSBACK', 'true');
    expect(isGradePassbackUiEnabled()).toBe(true);
  });
});
