/**
 * This week in the classroom, from student_lesson_progress totals (#2096).
 *
 * Practice counts and awards come from the columns students cannot write
 * (total_practice_sessions, total_xp). "This week" is who practiced in the
 * last 7 days. The re-engagement nudge is the teacher, not one class: no
 * game and no practice anywhere in that window.
 */
import { describe, expect, it } from 'vitest';
import { summarizeTeacherClassrooms, type GameActivityRow, type ProgressTotalRow, type RosterRow } from '../classroomWeekActivity';

const NOW = Date.parse('2026-11-21T12:00:00.000Z');
const TODAY = '2026-11-21';
const EIGHT_DAYS_AGO = '2026-11-13';
const WEEK_EDGE = '2026-11-14';

const roster: RosterRow[] = [
  { classroomId: 'class-a', studentId: 'stu-1' },
  { classroomId: 'class-a', studentId: 'stu-2' },
  { classroomId: 'class-b', studentId: 'stu-3' },
];

describe('summarizeTeacherClassrooms', () => {
  it('GIVEN a student who practiced today WHEN totals include 600 XP and one practiced lesson THEN this week counts that student, their sessions, and the two awards those totals earn', () => {
    const progress: ProgressTotalRow[] = [
      { studentId: 'stu-1', lessonId: 'lesson-1', totalXp: 600, totalPracticeSessions: 4, lastPracticeDate: TODAY },
      { studentId: 'stu-1', lessonId: 'lesson-2', totalXp: 0, totalPracticeSessions: 0, lastPracticeDate: null },
    ];

    const summary = summarizeTeacherClassrooms({ roster, progress, games: [], nowMs: NOW });

    expect(summary.byClass['class-a']).toEqual({
      studentsPracticed: 1,
      practiceSessions: 4,
      awardsEarned: 2,
      practicedThisWeek: true,
    });
    expect(summary.byClass['class-b']).toEqual({
      studentsPracticed: 0,
      practiceSessions: 0,
      awardsEarned: 0,
      practicedThisWeek: false,
    });
    expect(summary.quietFor7Days).toBe(false);
  });

  it('GIVEN practice only on the 7-day boundary WHEN summarized THEN that student still counts, and a student from 8 days ago does not', () => {
    const progress: ProgressTotalRow[] = [
      { studentId: 'stu-1', lessonId: 'lesson-1', totalXp: 10, totalPracticeSessions: 2, lastPracticeDate: WEEK_EDGE },
      { studentId: 'stu-2', lessonId: 'lesson-9', totalXp: 9000, totalPracticeSessions: 40, lastPracticeDate: EIGHT_DAYS_AGO },
    ];

    const summary = summarizeTeacherClassrooms({ roster, progress, games: [], nowMs: NOW });

    expect(summary.byClass['class-a']).toMatchObject({ studentsPracticed: 1, practiceSessions: 2 });
    expect(summary.quietFor7Days).toBe(false);
  });

  it('GIVEN an active student with XP on an older lesson row WHEN awards are counted THEN every lesson total counts, not only the row dated this week', () => {
    const progress: ProgressTotalRow[] = [
      { studentId: 'stu-1', lessonId: 'fresh', totalXp: 10, totalPracticeSessions: 1, lastPracticeDate: TODAY },
      { studentId: 'stu-1', lessonId: 'banked', totalXp: 500, totalPracticeSessions: 9, lastPracticeDate: EIGHT_DAYS_AGO },
    ];

    const summary = summarizeTeacherClassrooms({ roster, progress, games: [], nowMs: NOW });

    // 510 XP, 10 sessions, one practiced lesson: first lesson, XP collector, practice veteran.
    expect(summary.byClass['class-a'].practiceSessions).toBe(10);
    expect(summary.byClass['class-a'].awardsEarned).toBe(3);
  });

  it('GIVEN no game and no practice in 7 days WHEN summarized THEN the teacher is quiet even if older totals exist', () => {
    const progress: ProgressTotalRow[] = [
      { studentId: 'stu-1', lessonId: 'lesson-1', totalXp: 9000, totalPracticeSessions: 40, lastPracticeDate: EIGHT_DAYS_AGO },
    ];
    const games: GameActivityRow[] = [{ classroomId: 'class-b', completedAt: '2026-11-13T12:00:00.000Z' }];

    const summary = summarizeTeacherClassrooms({ roster, progress, games, nowMs: NOW });

    expect(summary.byClass['class-a'].practicedThisWeek).toBe(false);
    expect(summary.quietFor7Days).toBe(true);
    expect(summary.lastGameAt).toBe('2026-11-13T12:00:00.000Z');
  });

  it('GIVEN a classroom game inside 7 days and no practice WHEN summarized THEN the teacher is not quiet', () => {
    const games: GameActivityRow[] = [{ classroomId: 'class-a', completedAt: '2026-11-20T08:00:00.000Z' }];

    const summary = summarizeTeacherClassrooms({ roster, progress: [], games, nowMs: NOW });

    expect(summary.quietFor7Days).toBe(false);
    expect(summary.lastGameAt).toBe('2026-11-20T08:00:00.000Z');
  });

  it('GIVEN null totals and a blank date WHEN summarized THEN they count as zero and do not look like this week', () => {
    const progress: ProgressTotalRow[] = [
      { studentId: 'stu-3', lessonId: 'lesson-1', totalXp: null, totalPracticeSessions: null, lastPracticeDate: 'not-a-date' },
    ];

    const summary = summarizeTeacherClassrooms({ roster, progress, games: [], nowMs: NOW });

    expect(summary.byClass['class-b']).toEqual({
      studentsPracticed: 0,
      practiceSessions: 0,
      awardsEarned: 0,
      practicedThisWeek: false,
    });
    expect(summary.quietFor7Days).toBe(true);
  });
});
