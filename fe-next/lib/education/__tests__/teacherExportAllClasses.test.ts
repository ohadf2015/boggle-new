import { describe, it, expect } from 'vitest';
import {
  buildTeacherExportRows,
  teacherExportToCsv,
} from '../teacherExportAllClasses';

const CSV_LABELS = {
  classroom: 'Classroom',
  student: 'Student',
  lessonsCompleted: 'Lessons completed',
  wordsMastered: 'Words mastered',
  totalXp: 'Total XP',
  lastActive: 'Last active',
  gamesPlayed: 'Games played',
  anonymousStudent: 'Student {{id}}',
};

describe('buildTeacherExportRows', () => {
  it('emits one row per classroom x student, scoped to that classroom\'s assigned lessons', () => {
    const rows = buildTeacherExportRows({
      classrooms: [
        { id: 'c1', name: 'Grade 5A' },
        { id: 'c2', name: 'Grade 5B' },
      ],
      memberships: [
        { classroomId: 'c1', studentId: 's1' },
        { classroomId: 'c1', studentId: 's2' },
        { classroomId: 'c2', studentId: 's1' }, // s1 is in both classrooms
      ],
      profiles: [
        { studentId: 's1', name: 'Ada' },
        { studentId: 's2', name: 'Ben' },
      ],
      lessonAssignments: [
        { classroomId: 'c1', lessonId: 'l1' },
        { classroomId: 'c2', lessonId: 'l2' },
      ],
      progress: [
        { studentId: 's1', lessonId: 'l1', totalXp: 100, wordsMasteredCount: 5, lastPracticeDate: '2026-09-01', completedAt: '2026-09-01' },
        { studentId: 's1', lessonId: 'l2', totalXp: 40, wordsMasteredCount: 2, lastPracticeDate: '2026-09-10', completedAt: null },
        { studentId: 's2', lessonId: 'l1', totalXp: 30, wordsMasteredCount: 1, lastPracticeDate: '2026-08-20', completedAt: null },
      ],
      sessions: [
        { studentId: 's1', lessonId: 'l1', completedAt: '2026-09-02' },
        { studentId: 's1', lessonId: 'l2', completedAt: '2026-09-11' },
      ],
    });

    expect(rows).toHaveLength(3);

    // s1 in c1: only l1-scoped progress/sessions count.
    const s1c1 = rows.find((r) => r.classroomId === 'c1' && r.studentId === 's1');
    expect(s1c1).toMatchObject({
      classroomName: 'Grade 5A',
      studentName: 'Ada',
      lessonsCompleted: 1,
      wordsMastered: 5,
      totalXp: 100,
      gamesPlayed: 1,
      lastActive: '2026-09-02',
    });

    // s1 in c2: only l2-scoped progress/sessions count — different numbers
    // from the c1 row above, proving stats are scoped per classroom.
    const s1c2 = rows.find((r) => r.classroomId === 'c2' && r.studentId === 's1');
    expect(s1c2).toMatchObject({
      classroomName: 'Grade 5B',
      studentName: 'Ada',
      lessonsCompleted: 0,
      wordsMastered: 2,
      totalXp: 40,
      gamesPlayed: 1,
      lastActive: '2026-09-11',
    });

    const s2c1 = rows.find((r) => r.classroomId === 'c1' && r.studentId === 's2');
    expect(s2c1).toMatchObject({
      studentName: 'Ben',
      lessonsCompleted: 0,
      wordsMastered: 1,
      totalXp: 30,
      gamesPlayed: 0,
      lastActive: '2026-08-20',
    });
  });

  it('still emits a zeroed row for a student with no progress or session data', () => {
    const rows = buildTeacherExportRows({
      classrooms: [{ id: 'c1', name: 'Grade 5A' }],
      memberships: [{ classroomId: 'c1', studentId: 's1' }],
      profiles: [{ studentId: 's1', name: 'Ada' }],
      lessonAssignments: [{ classroomId: 'c1', lessonId: 'l1' }],
      progress: [],
      sessions: [],
    });

    expect(rows).toEqual([
      {
        classroomId: 'c1',
        classroomName: 'Grade 5A',
        studentId: 's1',
        studentName: 'Ada',
        lessonsCompleted: 0,
        wordsMastered: 0,
        totalXp: 0,
        lastActive: null,
        gamesPlayed: 0,
      },
    ]);
  });

  it('still emits a zeroed row when the classroom has no lesson assignments at all', () => {
    const rows = buildTeacherExportRows({
      classrooms: [{ id: 'c1', name: 'Grade 5A' }],
      memberships: [{ classroomId: 'c1', studentId: 's1' }],
      profiles: [{ studentId: 's1', name: 'Ada' }],
      lessonAssignments: [],
      progress: [{ studentId: 's1', lessonId: 'l-unassigned', totalXp: 999, wordsMasteredCount: 9, lastPracticeDate: '2026-09-01', completedAt: '2026-09-01' }],
      sessions: [],
    });

    expect(rows[0]).toMatchObject({ lessonsCompleted: 0, wordsMastered: 0, totalXp: 0 });
  });

  it('leaves studentName null (not a hardcoded English string) when no profile row matches a member', () => {
    // A Hebrew/Japanese/etc. export must not silently drop in an English
    // "Unknown" — null lets the CSV layer substitute a translated label.
    const rows = buildTeacherExportRows({
      classrooms: [{ id: 'c1', name: 'Grade 5A' }],
      memberships: [{ classroomId: 'c1', studentId: 's1' }],
      profiles: [],
      lessonAssignments: [],
      progress: [],
      sessions: [],
    });
    expect(rows[0].studentName).toBeNull();
  });

  it('returns an empty list when the teacher has no classrooms', () => {
    expect(
      buildTeacherExportRows({
        classrooms: [],
        memberships: [],
        profiles: [],
        lessonAssignments: [],
        progress: [],
        sessions: [],
      }),
    ).toEqual([]);
  });

  it('returns an empty list for a classroom with no members', () => {
    expect(
      buildTeacherExportRows({
        classrooms: [{ id: 'c1', name: 'Empty class' }],
        memberships: [],
        profiles: [],
        lessonAssignments: [],
        progress: [],
        sessions: [],
      }),
    ).toEqual([]);
  });
});

describe('teacherExportToCsv', () => {
  const baseRow = {
    classroomId: 'c1',
    classroomName: 'Grade 5A',
    studentId: 's1',
    studentName: 'Ada',
    lessonsCompleted: 3,
    wordsMastered: 12,
    totalXp: 450,
    lastActive: '2026-09-20',
    gamesPlayed: 7,
  };

  it('emits a header plus one CSV row per input row, in the spec\'d column order', () => {
    const csv = teacherExportToCsv([baseRow], CSV_LABELS);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Classroom,Student,Lessons completed,Words mastered,Total XP,Last active,Games played');
    expect(lines[1]).toBe('Grade 5A,Ada,3,12,450,2026-09-20,7');
  });

  it('leaves lastActive blank instead of writing "null"', () => {
    const csv = teacherExportToCsv([{ ...baseRow, lastActive: null }], CSV_LABELS);
    expect(csv.split('\n')[1]).toBe('Grade 5A,Ada,3,12,450,,7');
  });

  it('escapes commas/quotes in names and neutralizes formula-injection prefixes', () => {
    const csv = teacherExportToCsv(
      [{ ...baseRow, classroomName: '=HYPERLINK("evil")', studentName: 'Ada, "the great"' }],
      CSV_LABELS,
    );
    const dataLine = csv.split('\n')[1];
    expect(dataLine).toBe('"\'=HYPERLINK(""evil"")","Ada, ""the great""",3,12,450,2026-09-20,7');
  });

  it('does not neutralize the numeric columns even when a count is 0', () => {
    const csv = teacherExportToCsv([{ ...baseRow, lessonsCompleted: 0, wordsMastered: 0, totalXp: 0, gamesPlayed: 0 }], CSV_LABELS);
    expect(csv.split('\n')[1]).toBe('Grade 5A,Ada,0,0,0,2026-09-20,0');
  });

  it('substitutes the id into a DOUBLE-brace {{id}} anonymousStudent template', () => {
    const csv = teacherExportToCsv(
      [{ ...baseRow, studentName: null, studentId: 'abcdef1234567890' }],
      { ...CSV_LABELS, anonymousStudent: 'Student {{id}}' },
    );
    expect(csv.split('\n')[1]).toBe('Grade 5A,Student abcdef12,3,12,450,2026-09-20,7');
  });

  it('substitutes the id into a SINGLE-brace {id} anonymousStudent template — this is what the real t() actually returns: LanguageContext normalizes {{id}} to ICU {id} before this ever runs, and calling t() with no params returns the template untouched, so a naive .replace("{{id}}", …) would silently leave "{id}" in the CSV in production', () => {
    const csv = teacherExportToCsv(
      [{ ...baseRow, studentName: null, studentId: 'abcdef1234567890' }],
      { ...CSV_LABELS, anonymousStudent: 'Student {id}' },
    );
    expect(csv.split('\n')[1]).toBe('Grade 5A,Student abcdef12,3,12,450,2026-09-20,7');
  });

  it('writes a real negative number as-is — only STRING cells get the formula-injection prefix', () => {
    const csv = teacherExportToCsv([{ ...baseRow, totalXp: -5 }], CSV_LABELS);
    expect(csv.split('\n')[1]).toBe('Grade 5A,Ada,3,12,-5,2026-09-20,7');
  });

  it('substitutes the translated anonymous-student label instead of a hardcoded English fallback when studentName is null', () => {
    const csv = teacherExportToCsv(
      [{ ...baseRow, studentName: null, studentId: 'abcdef1234567890' }],
      CSV_LABELS,
    );
    expect(csv.split('\n')[1]).toBe('Grade 5A,Student abcdef12,3,12,450,2026-09-20,7');
  });
});
