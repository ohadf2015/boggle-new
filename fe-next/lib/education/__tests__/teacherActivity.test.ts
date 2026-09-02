import { describe, it, expect } from 'vitest';
import {
  buildTeacherActivity,
  type TeacherActivityInput,
} from '../teacherActivity';

const input = (over: Partial<TeacherActivityInput> = {}): TeacherActivityInput => ({
  userId: 'u1',
  profile: {
    id: 'u1',
    user_role: 'teacher',
    last_seen_at: '2026-08-10T00:00:00Z',
    display_name: 'Ada D',
    username: 'ada',
  },
  request: {
    email: 'ada@school.edu',
    full_name: 'Ada Teacher',
    status: 'approved',
    trial_expires_at: '2026-09-01T00:00:00Z',
  },
  classrooms: [],
  memberships: [],
  lessons: [],
  assignments: [],
  progress: [],
  ...over,
});

describe('buildTeacherActivity', () => {
  it('shouldAssembleTeacherIdentityWhenProfileAndRequestExist', () => {
    // GIVEN a granted teacher with an access request
    // WHEN the details payload is assembled
    const out = buildTeacherActivity(input());

    // THEN identity, grant, trial and last-seen are all present
    expect(out.teacher).toEqual({
      id: 'u1',
      email: 'ada@school.edu',
      fullName: 'Ada Teacher',
      displayName: 'Ada D',
      username: 'ada',
      roleGranted: true,
      lastSeenAt: '2026-08-10T00:00:00Z',
      trialExpiresAt: '2026-09-01T00:00:00Z',
      status: 'approved',
    });
  });

  it('shouldMarkRoleGrantedFalseWhenProfileRoleIsNotTeacher', () => {
    // GIVEN an approved request whose profile was never promoted
    const out = buildTeacherActivity(
      input({ profile: { id: 'u1', user_role: 'student', last_seen_at: null, display_name: null, username: null } }),
    );

    // THEN roleGranted is false — same alarm the funnel already shows
    expect(out.teacher.roleGranted).toBe(false);
  });

  it('shouldNestStudentsUnderClassroomsWhenMembershipsExist', () => {
    // GIVEN one classroom with two members
    const out = buildTeacherActivity(
      input({
        classrooms: [
          {
            id: 'c1',
            name: '3RD GRADE',
            join_code: 'ABC123',
            language: 'en',
            created_at: '2026-08-21T09:00:00Z',
          },
        ],
        memberships: [
          { classroom_id: 'c1', student_id: 's1', joined_at: '2026-08-22T00:00:00Z' },
          { classroom_id: 'c1', student_id: 's2', joined_at: '2026-08-23T00:00:00Z' },
        ],
      }),
    );

    // THEN studentCount and the student list agree
    expect(out.classrooms).toEqual([
      {
        id: 'c1',
        name: '3RD GRADE',
        joinCode: 'ABC123',
        language: 'en',
        createdAt: '2026-08-21T09:00:00Z',
        studentCount: 2,
        students: [
          { id: 's1', joinedAt: '2026-08-22T00:00:00Z' },
          { id: 's2', joinedAt: '2026-08-23T00:00:00Z' },
        ],
      },
    ]);
  });

  it('shouldCountWordsFromLessonJsonWhenAssemblingWordlists', () => {
    // GIVEN a lesson whose words column is a JSON array
    const out = buildTeacherActivity(
      input({
        lessons: [
          {
            id: 'l1',
            name: 'Week 1',
            language: 'en',
            created_at: '2026-08-01T00:00:00Z',
            words: [{ word: 'cat' }, { word: 'dog' }, { word: 'hat' }],
            source_game_code: 'ROOM1',
          },
        ],
      }),
    );

    // THEN wordCount is the array length and sourceGameCode is forwarded
    expect(out.wordlists).toEqual([
      {
        id: 'l1',
        name: 'Week 1',
        language: 'en',
        createdAt: '2026-08-01T00:00:00Z',
        wordCount: 3,
        sourceGameCode: 'ROOM1',
      },
    ]);
  });

  it('shouldTreatNonArrayWordsAsZeroWhenCountingWordlistSize', () => {
    const out = buildTeacherActivity(
      input({
        lessons: [
          {
            id: 'l1',
            name: 'Empty',
            language: 'he',
            created_at: '2026-08-01T00:00:00Z',
            words: null,
            source_game_code: null,
          },
        ],
      }),
    );

    expect(out.wordlists[0].wordCount).toBe(0);
    expect(out.wordlists[0].sourceGameCode).toBeNull();
  });

  it('shouldCountCompletedProgressRowsPerAssignmentWhenCompletedAtIsSet', () => {
    // GIVEN two progress rows for the same assignment, one unfinished
    const out = buildTeacherActivity(
      input({
        classrooms: [
          { id: 'c1', name: 'Room A', join_code: 'AAAAAA', language: 'en', created_at: '2026-08-01T00:00:00Z' },
        ],
        lessons: [
          {
            id: 'l1',
            name: 'Animals',
            language: 'en',
            created_at: '2026-08-01T00:00:00Z',
            words: [],
            source_game_code: null,
          },
        ],
        assignments: [
          {
            id: 'a1',
            title: 'Practice animals',
            assignment_type: 'practice',
            classroom_id: 'c1',
            lesson_id: 'l1',
            due_date: '2026-08-30T00:00:00Z',
            created_at: '2026-08-10T00:00:00Z',
          },
        ],
        progress: [
          {
            student_id: 's1',
            lesson_id: 'l1',
            assignment_id: 'a1',
            completed_at: '2026-08-12T00:00:00Z',
            current_level: 2,
            total_xp: 40,
            words_mastered: ['cat'],
          },
          {
            student_id: 's2',
            lesson_id: 'l1',
            assignment_id: 'a1',
            completed_at: null,
            current_level: 1,
            total_xp: 0,
            words_mastered: [],
          },
          {
            student_id: 's3',
            lesson_id: 'l1',
            assignment_id: 'other',
            completed_at: '2026-08-13T00:00:00Z',
            current_level: 1,
            total_xp: 10,
            words_mastered: [],
          },
        ],
      }),
    );

    // THEN only the matching completed row counts
    expect(out.assignments).toEqual([
      {
        id: 'a1',
        title: 'Practice animals',
        type: 'practice',
        classroomName: 'Room A',
        lessonName: 'Animals',
        dueDate: '2026-08-30T00:00:00Z',
        createdAt: '2026-08-10T00:00:00Z',
        completedCount: 1,
      },
    ]);
  });

  it('shouldFallBackToLessonNameWhenAssignmentTitleIsMissing', () => {
    const out = buildTeacherActivity(
      input({
        lessons: [
          {
            id: 'l1',
            name: 'Animals',
            language: 'en',
            created_at: '2026-08-01T00:00:00Z',
            words: [],
            source_game_code: null,
          },
        ],
        assignments: [
          {
            id: 'a1',
            title: null,
            assignment_type: 'duel',
            classroom_id: 'missing',
            lesson_id: 'l1',
            due_date: null,
            created_at: '2026-08-10T00:00:00Z',
          },
        ],
      }),
    );

    expect(out.assignments[0].title).toBe('Animals');
    expect(out.assignments[0].classroomName).toBeNull();
    expect(out.assignments[0].type).toBe('duel');
  });

  it('shouldReturnNewestFiftyCompletionsWhenMoreExist', () => {
    // GIVEN 51 completed progress rows (i=0 oldest, i=50 newest)
    const at = (i: number) => new Date(Date.UTC(2026, 7, 1) + i * 86_400_000).toISOString();
    const progress = Array.from({ length: 51 }, (_, i) => ({
      student_id: `s${i}`,
      lesson_id: 'l1',
      assignment_id: 'a1',
      completed_at: at(i),
      current_level: 1,
      total_xp: i,
      words_mastered: i % 2 === 0 ? ['cat', 'dog'] : null,
    }));

    const out = buildTeacherActivity(
      input({
        lessons: [
          {
            id: 'l1',
            name: 'Animals',
            language: 'en',
            created_at: '2026-08-01T00:00:00Z',
            words: [],
            source_game_code: null,
          },
        ],
        progress,
      }),
    );

    // THEN only the 50 newest completed rows are returned, newest first
    expect(out.completions).toHaveLength(50);
    expect(out.completions[0].completedAt).toBe(at(50));
    expect(out.completions[0].lessonName).toBe('Animals');
    expect(out.completions[0].wordsMasteredCount).toBe(2);
    expect(out.completions[49].completedAt).toBe(at(1));
    expect(out.completions.every((c) => c.completedAt !== null)).toBe(true);
  });

  it('shouldOmitUnfinishedProgressFromCompletionsWhenCompletedAtIsNull', () => {
    const out = buildTeacherActivity(
      input({
        lessons: [
          {
            id: 'l1',
            name: 'Animals',
            language: 'en',
            created_at: '2026-08-01T00:00:00Z',
            words: [],
            source_game_code: null,
          },
        ],
        progress: [
          {
            student_id: 's1',
            lesson_id: 'l1',
            assignment_id: null,
            completed_at: null,
            current_level: 1,
            total_xp: 0,
            words_mastered: [],
          },
        ],
      }),
    );

    expect(out.completions).toEqual([]);
  });

  it('shouldDefaultEmptyCollectionsWhenTeacherHasNoActivity', () => {
    const out = buildTeacherActivity(input());
    expect(out.classrooms).toEqual([]);
    expect(out.wordlists).toEqual([]);
    expect(out.assignments).toEqual([]);
    expect(out.completions).toEqual([]);
  });
});
