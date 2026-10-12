import { describe, it, expect, vi } from 'vitest';
import {
  EDUCATION_JOIN_COMPLETED,
  EDUCATION_JOIN_STARTED,
  assignmentViewHref,
  completeSignedInJoin,
  hasAuthSessionCookie,
  isAutoJoinCode,
  pickAssignment,
  signedInJoinEvents,
  signedInJoinHref,
  type AssignmentPick,
  type JoinFunnelEvent,
  type SignedInJoinOutcome,
} from '../signedInJoin';
import { autoJoinSignedInStudent, type RunSignedInJoinDeps } from '../runSignedInJoin';

const LESSON = '11111111-1111-4111-8111-111111111111';
const LATER = '22222222-2222-4222-8222-222222222222';

function success(over: Partial<Extract<SignedInJoinOutcome, { ok: true }>> = {}): SignedInJoinOutcome {
  return { ok: true, classroomId: 'c1', alreadyMember: false, gameCode: null, ...over };
}

function assignment(over: Partial<AssignmentPick> = {}): AssignmentPick {
  return { lessonId: LESSON, practiceFocus: null, dueDate: null, createdAt: '2026-10-01T00:00:00Z', ...over };
}

describe('signed-in invite join', () => {
  it('accepts a six-character classroom code and nothing else', () => {
    expect(isAutoJoinCode(' ab12cd ')).toBe(true);
    expect(isAutoJoinCode('ABC12')).toBe(false);
    expect(isAutoJoinCode('ABC12!')).toBe(false);
  });

  it('treats a supabase auth cookie, including a chunked one, as a session', () => {
    expect(hasAuthSessionCookie(['sb-abc-auth-token'])).toBe(true);
    expect(hasAuthSessionCookie(['sb-abc-auth-token.0', 'sb-abc-auth-token.1'])).toBe(true);
    expect(hasAuthSessionCookie(['other', 'sb-abc-something'])).toBe(false);
    expect(hasAuthSessionCookie([])).toBe(false);
  });

  it('picks the soonest due assignment and ignores a non-lesson id', () => {
    const pick = pickAssignment([
      { lesson_id: LATER, due_date: '2026-10-20', created_at: '2026-10-01' },
      { lesson_id: LESSON, due_date: '2026-10-12', created_at: '2026-10-02' },
      { lesson_id: 'not-a-lesson', due_date: '2026-10-01' },
      { lesson_id: null },
    ]);
    expect(pick?.lessonId).toBe(LESSON);
  });

  it('opens a plain lesson, a vocab focus, and word craft on their own URLs', () => {
    expect(assignmentViewHref('en', assignment())).toBe(`/en/student/lessons/${LESSON}`);
    expect(assignmentViewHref('en', assignment({ practiceFocus: 'definition' }))).toBe(
      `/en/student/lessons/${LESSON}?mode=vocab_focus&focus=definition`
    );
    expect(assignmentViewHref('he', assignment({ practiceFocus: 'wordcraft' }))).toBe(
      `/he/student/lessons/${LESSON}?mode=solo_board&variant=wordcraft`
    );
  });

  it('never sends a joined student to the bare hub', () => {
    expect(signedInJoinHref('en', { gameCode: null, assignment: null })).toBe('/en/student/lessons');
    expect(signedInJoinHref('en', { gameCode: 'ABC123', assignment: null })).toBe(
      '/en/multiplayer?room=ABC123&classroom=true'
    );
    expect(signedInJoinHref('en', { gameCode: null, assignment: assignment() })).toBe(
      `/en/student/lessons/${LESSON}`
    );
    expect(signedInJoinHref('en', { gameCode: 'ABC123', assignment: null })).not.toBe('/en/student');
  });

  it('emits started then completed, both with classroom_id', () => {
    const events = signedInJoinEvents({ studentId: 'student-1', classroomId: 'c1', isTestAccount: false });
    expect(events.map((event) => event.event)).toEqual([EDUCATION_JOIN_STARTED, EDUCATION_JOIN_COMPLETED]);
    expect(events[0].distinctId).toBe('student-1');
    expect(events[0].properties).toEqual({ classroom_id: 'c1', is_test_account: false });
    expect(events[1].properties.classroom_id).toBe('c1');
    expect(events[0].properties).not.toBe(events[1].properties);
  });
});

describe('completeSignedInJoin', () => {
  const user = { id: 'student-1', email: 'maya@school.edu' };

  function harness(joinResult: SignedInJoinOutcome | 'throw', assignment: AssignmentPick | null = null) {
    const join = vi.fn(async (): Promise<SignedInJoinOutcome> => {
      if (joinResult === 'throw') throw new Error('db down');
      return joinResult;
    });
    const findAssignment = vi.fn(async () => assignment);
    const captured: JoinFunnelEvent[][] = [];
    const capture = vi.fn((events: JoinFunnelEvent[]) => {
      captured.push(events);
    });
    return { join, findAssignment, capture, captured };
  }

  it('enrols a signed-in student and redirects into the assignment', async () => {
    const { join, findAssignment, capture, captured } = harness(success(), assignment());
    const href = await completeSignedInJoin({
      locale: 'en',
      code: 'ab12cd',
      user,
      isTestAccount: false,
      join,
      findAssignment,
      capture,
    });

    expect(join).toHaveBeenCalledWith('AB12CD');
    expect(href).toBe(`/en/student/lessons/${LESSON}`);
    expect(captured).toHaveLength(1);
    expect(captured[0].map((event) => event.event)).toEqual([
      EDUCATION_JOIN_STARTED,
      EDUCATION_JOIN_COMPLETED,
    ]);
    expect(captured[0][0].properties).toMatchObject({ classroom_id: 'c1' });
    expect(captured[0][1].properties).toMatchObject({ classroom_id: 'c1' });
  });

  it('walks a live game into the room and does not look up homework', async () => {
    const { join, findAssignment, capture } = harness(success({ gameCode: 'ABC123' }));
    const href = await completeSignedInJoin({
      locale: 'en',
      code: 'ABC123',
      user,
      isTestAccount: false,
      join,
      findAssignment,
      capture,
    });
    expect(href).toBe('/en/multiplayer?room=ABC123&classroom=true');
    expect(findAssignment).not.toHaveBeenCalled();
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('lands on the lesson list when the class has no assignment', async () => {
    const { join, findAssignment, capture } = harness(success(), null);
    const href = await completeSignedInJoin({
      locale: 'es',
      code: 'ABC123',
      user,
      isTestAccount: false,
      join,
      findAssignment,
      capture,
    });
    expect(href).toBe('/es/student/lessons');
    expect(href).not.toBe('/es/student');
  });

  it('redirects an existing member without firing another join', async () => {
    const { join, findAssignment, capture } = harness(success({ alreadyMember: true }), assignment());
    const href = await completeSignedInJoin({
      locale: 'en',
      code: 'ABC123',
      user,
      isTestAccount: false,
      join,
      findAssignment,
      capture,
    });
    expect(href).toBe(`/en/student/lessons/${LESSON}`);
    expect(capture).not.toHaveBeenCalled();
  });

  it('leaves a refused join on the form and emits nothing', async () => {
    const { join, findAssignment, capture } = harness({ ok: false });
    const href = await completeSignedInJoin({
      locale: 'en',
      code: 'ABC123',
      user,
      isTestAccount: false,
      join,
      findAssignment,
      capture,
    });
    expect(href).toBeNull();
    expect(capture).not.toHaveBeenCalled();
    expect(findAssignment).not.toHaveBeenCalled();
  });

  it('still redirects when homework lookup fails after the membership is written', async () => {
    const { join, capture } = harness(success());
    const href = await completeSignedInJoin({
      locale: 'en',
      code: 'ABC123',
      user,
      isTestAccount: false,
      join,
      findAssignment: async () => {
        throw new Error('assignments down');
      },
      capture,
    });
    expect(href).toBe('/en/student/lessons');
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('does not call the join route for a code that cannot be a classroom', async () => {
    const { join, findAssignment, capture } = harness(success());
    const href = await completeSignedInJoin({
      locale: 'en',
      code: 'nope',
      user,
      isTestAccount: false,
      join,
      findAssignment,
      capture,
    });
    expect(href).toBeNull();
    expect(join).not.toHaveBeenCalled();
  });
});

describe('autoJoinSignedInStudent', () => {
  function deps(over: Partial<RunSignedInJoinDeps> = {}): RunSignedInJoinDeps {
    return {
      hasSession: async () => true,
      currentUser: async () => ({ id: 'student-1', email: 'maya@school.edu' }),
      join: async () => success(),
      findAssignment: async () => assignment(),
      capture: vi.fn(),
      isTestAccount: () => false,
      ...over,
    };
  }

  it('does not join a guest who has no session cookie', async () => {
    const join = vi.fn(async () => success());
    const href = await autoJoinSignedInStudent('en', 'ABC123', deps({ hasSession: async () => false, join }));
    expect(href).toBeNull();
    expect(join).not.toHaveBeenCalled();
  });

  it('does not join when the cookie is stale', async () => {
    const join = vi.fn(async () => success());
    const href = await autoJoinSignedInStudent(
      'en',
      'ABC123',
      deps({ currentUser: async () => null, join })
    );
    expect(href).toBeNull();
    expect(join).not.toHaveBeenCalled();
  });

  it('joins and redirects when the session and the code are both real', async () => {
    const capture = vi.fn();
    const href = await autoJoinSignedInStudent('en', 'ABC123', deps({ capture }));
    expect(href).toBe(`/en/student/lessons/${LESSON}`);
    expect(capture).toHaveBeenCalledTimes(1);
    const events = capture.mock.calls[0][0] as JoinFunnelEvent[];
    expect(events[0].event).toBe(EDUCATION_JOIN_STARTED);
    expect(events[1].event).toBe(EDUCATION_JOIN_COMPLETED);
    expect(events[0].properties.classroom_id).toBe('c1');
    expect(events[1].properties.classroom_id).toBe('c1');
  });

  it('returns null when the join throws, so the form still renders', async () => {
    const href = await autoJoinSignedInStudent(
      'en',
      'ABC123',
      deps({
        join: async () => {
          throw new Error('offline');
        },
      })
    );
    expect(href).toBeNull();
  });

  it('ignores an empty share-sheet code', async () => {
    const join = vi.fn(async () => success());
    expect(await autoJoinSignedInStudent('en', '', deps({ join }))).toBeNull();
    expect(join).not.toHaveBeenCalled();
  });
});
