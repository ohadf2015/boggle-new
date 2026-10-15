import { describe, it, expect, vi } from 'vitest';
import {
  EDUCATION_JOIN_COMPLETED,
  EDUCATION_JOIN_STARTED,
  STUDENT_JOIN_COMPLETED,
  STUDENT_JOIN_STARTED,
  completeSignedInJoin,
  hasAuthSessionCookie,
  isAutoJoinCode,
  signedInJoinEvents,
  signedInJoinHref,
  type JoinFunnelEvent,
  type SignedInJoinOutcome,
} from '../signedInJoin';
import { autoJoinSignedInStudent, type RunSignedInJoinDeps } from '../runSignedInJoin';

function success(over: Partial<Extract<SignedInJoinOutcome, { ok: true }>> = {}): SignedInJoinOutcome {
  return { ok: true, classroomId: 'c1', alreadyMember: false, gameCode: null, ...over };
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

  it('never sends a joined student to the bare hub', () => {
    expect(signedInJoinHref('en', { gameCode: null })).toBe('/en/student?class=open');
    expect(signedInJoinHref('en', { gameCode: 'ABC123' })).toBe(
      '/en/education/live?room=ABC123'
    );
    expect(signedInJoinHref('en', { gameCode: null })).not.toBe('/en/student');
  });

  it('emits started then completed for both funnels, each with classroom_id and never the code', () => {
    const events = signedInJoinEvents({ studentId: 'student-1', classroomId: 'c1', isTestAccount: false });
    expect(events.map((event) => event.event)).toEqual([
      EDUCATION_JOIN_STARTED,
      EDUCATION_JOIN_COMPLETED,
      STUDENT_JOIN_STARTED,
      STUDENT_JOIN_COMPLETED,
    ]);
    expect(events[0].distinctId).toBe('student-1');
    for (const event of events) {
      expect(event.properties).toEqual({ classroom_id: 'c1', is_test_account: false });
    }
    expect(events[0].properties).not.toBe(events[1].properties);
    expect(JSON.stringify(events)).not.toContain('ABC123');
  });
});

describe('completeSignedInJoin', () => {
  const user = { id: 'student-1', email: 'maya@school.edu' };

  function harness(joinResult: SignedInJoinOutcome | 'throw') {
    const join = vi.fn(async (): Promise<SignedInJoinOutcome> => {
      if (joinResult === 'throw') throw new Error('db down');
      return joinResult;
    });
    const captured: JoinFunnelEvent[][] = [];
    const capture = vi.fn((events: JoinFunnelEvent[]) => {
      captured.push(events);
    });
    return { join, capture, captured };
  }

  it('enrols a signed-in student and redirects into the class view', async () => {
    const { join, capture, captured } = harness(success());
    const href = await completeSignedInJoin({
      locale: 'en',
      code: 'ab12cd',
      user,
      isTestAccount: false,
      join,
      capture,
    });

    expect(join).toHaveBeenCalledWith('AB12CD');
    expect(href).toBe('/en/student?class=open');
    expect(captured).toHaveLength(1);
    expect(captured[0].map((event) => event.event)).toEqual([
      EDUCATION_JOIN_STARTED,
      EDUCATION_JOIN_COMPLETED,
      STUDENT_JOIN_STARTED,
      STUDENT_JOIN_COMPLETED,
    ]);
    expect(captured[0][0].properties).toMatchObject({ classroom_id: 'c1' });
    expect(captured[0][3].properties).toMatchObject({ classroom_id: 'c1' });
  });

  it('walks a live game into the room', async () => {
    const { join, capture } = harness(success({ gameCode: 'ABC123' }));
    const href = await completeSignedInJoin({
      locale: 'en',
      code: 'ABC123',
      user,
      isTestAccount: false,
      join,
      capture,
    });
    expect(href).toBe('/en/education/live?room=ABC123');
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('lands on the class view — not the bare hub — when there is no live game', async () => {
    const { join, capture } = harness(success());
    const href = await completeSignedInJoin({
      locale: 'es',
      code: 'ABC123',
      user,
      isTestAccount: false,
      join,
      capture,
    });
    expect(href).toBe('/es/student?class=open');
    expect(href).not.toBe('/es/student');
  });

  it('redirects an existing member without firing another join', async () => {
    const { join, capture } = harness(success({ alreadyMember: true }));
    const href = await completeSignedInJoin({
      locale: 'en',
      code: 'ABC123',
      user,
      isTestAccount: false,
      join,
      capture,
    });
    expect(href).toBe('/en/student?class=open');
    expect(capture).not.toHaveBeenCalled();
  });

  it('leaves a refused join on the form and emits nothing', async () => {
    const { join, capture } = harness({ ok: false });
    const href = await completeSignedInJoin({
      locale: 'en',
      code: 'ABC123',
      user,
      isTestAccount: false,
      join,
      capture,
    });
    expect(href).toBeNull();
    expect(capture).not.toHaveBeenCalled();
  });

  it('does not call the join route for a code that cannot be a classroom', async () => {
    const { join, capture } = harness(success());
    const href = await completeSignedInJoin({
      locale: 'en',
      code: 'nope',
      user,
      isTestAccount: false,
      join,
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

  it('joins and redirects into the class view when the session and the code are both real', async () => {
    const capture = vi.fn();
    const href = await autoJoinSignedInStudent('en', 'ABC123', deps({ capture }));
    expect(href).toBe('/en/student?class=open');
    expect(capture).toHaveBeenCalledTimes(1);
    const events = capture.mock.calls[0][0] as JoinFunnelEvent[];
    expect(events[0].event).toBe(EDUCATION_JOIN_STARTED);
    expect(events[1].event).toBe(EDUCATION_JOIN_COMPLETED);
    expect(events[2].event).toBe(STUDENT_JOIN_STARTED);
    expect(events[3].event).toBe(STUDENT_JOIN_COMPLETED);
    expect(events[0].properties.classroom_id).toBe('c1');
    expect(events[3].properties.classroom_id).toBe('c1');
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
