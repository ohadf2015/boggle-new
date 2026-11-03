/**
 * DELETE /api/account/delete — erasure has to include email-KEYED rows.
 *
 * The route deletes the auth user and relies on FK cascade, which is correct
 * for every table that references `auth.users(id)`. But teacher access rows are
 * keyed by the email STRING, not by a user id, so a cascade never reaches them:
 * after a teacher deleted their account, their address stayed in
 * `teacher_access_requests`.
 *
 * Found for real on 2026-09-21, cleaning up after a teacher who emailed asking
 * for her account AND her email address to be removed: the auth user, profile
 * and identities were gone, and the address was still sitting in
 * `teacher_access_requests`.
 *
 * t_b5825a0a adds: GET impact summary, teacher_delete_* server telemetry, and
 * deleteUser retry/idempotency (the UR-audit delete died on a 504).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const authUser = {
  v: { id: 'user-1', email: 'Teacher@School.org' } as { id: string; email?: string } | null,
};
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: authUser.v }, error: null }) },
  }),
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

const telemetry = { events: [] as Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> };
vi.mock('@/backend/utils/educationTelemetry', () => ({
  captureEduServerEvents: (events: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }>) => {
    telemetry.events.push(...events);
  },
}));

/** Per-table fixtures the fake query builder resolves from. */
const db = {
  classrooms: [] as Array<{ id: string; name: string | null }>,
  memberships: [] as Array<{ classroom_id: string; student_id: string; is_rehearsal: boolean | null }>,
  roundsCount: 0,
  profile: { daily_email_subscribed: true } as { daily_email_subscribed: boolean | null } | null,
};

const cap = {
  deletes: [] as Array<{ table: string; col: string; val: unknown }>,
  deletedUserIds: [] as string[],
  /** Queue of deleteUser results; each call shifts one. Last one repeats. */
  deleteUserResults: [] as Array<{ error: { message: string; status?: number; code?: string } | null }>,
  getUserByIdResult: null as { data: { user: unknown } | null; error: { message?: string; status?: number; code?: string } | null } | null,
};

function runDeleteUser(id: string) {
  cap.deletedUserIds.push(id);
  const next = cap.deleteUserResults.length > 1 ? cap.deleteUserResults.shift()! : cap.deleteUserResults[0];
  return Promise.resolve(next ?? { error: null });
}

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const qb: Record<string, unknown> = {};
      const resolveQuery = () => {
        if (table === 'classrooms') return { data: db.classrooms, error: null };
        if (table === 'classroom_memberships') return { data: db.memberships, error: null };
        if (table === 'classroom_rounds') return { data: null, count: db.roundsCount, error: null };
        if (table === 'profiles') return { data: db.profile, error: null };
        return { data: null, error: null };
      };
      for (const m of ['select', 'eq', 'in', 'not', 'gte', 'delete'] as const) {
        qb[m] = (...args: unknown[]) => {
          if (m === 'eq' && (table === 'teacher_access_requests' || table === 'teacher_access_allowlist' || table === 'user_push_tokens')) {
            cap.deletes.push({ table, col: args[0], val: args[1] });
          }
          return qb;
        };
      }
      qb.maybeSingle = () => Promise.resolve({ data: db.profile, error: null });
      (qb as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve(resolveQuery());
      return qb;
    },
    auth: {
      admin: {
        deleteUser: (id: string) => runDeleteUser(id),
        getUserById: (id: string) => {
          if (cap.getUserByIdResult !== null) return Promise.resolve(cap.getUserByIdResult);
          return Promise.resolve({ data: { user: { id } }, error: null });
        },
      },
    },
  }),
}));

import { DELETE, GET } from '../route';

/** Minimal NextRequest stand-in for the optional JSON body. */
function req(body?: unknown) {
  return {
    json: body === undefined ? async () => { throw new Error('no body'); } : async () => body,
  } as unknown as Parameters<typeof DELETE>[0];
}

beforeEach(() => {
  cap.deletes = [];
  cap.deletedUserIds = [];
  cap.deleteUserResults = [{ error: null }];
  cap.getUserByIdResult = null;
  telemetry.events = [];
  db.classrooms = [];
  db.memberships = [];
  db.roundsCount = 0;
  db.profile = { daily_email_subscribed: true };
  authUser.v = { id: 'user-1', email: 'Teacher@School.org' };
});

describe('DELETE /api/account/delete', () => {
  it('rejects an unauthenticated caller', async () => {
    authUser.v = null;
    const res = await DELETE(req());
    expect(res.status).toBe(401);
  });

  it('deletes the auth user', async () => {
    const res = await DELETE(req());
    expect(res.status).toBe(200);
    expect(cap.deletedUserIds).toEqual(['user-1']);
  });

  it('clears the email-keyed teacher access rows a cascade cannot reach', async () => {
    await DELETE(req());
    const tables = cap.deletes.map((d) => d.table);
    expect(tables).toContain('teacher_access_requests');
    expect(tables).toContain('teacher_access_allowlist');
  });

  it('matches those rows case-insensitively', async () => {
    // Signup lowercases the address; the request row keeps whatever the teacher
    // typed. An `eq` on the raw string silently matches nothing.
    await DELETE(req());
    const emailDeletes = cap.deletes.filter((d) => d.table.startsWith('teacher_access_'));
    expect(emailDeletes.length).toBeGreaterThan(0);
    for (const d of emailDeletes) {
      expect(d.val).toBe('teacher@school.org');
    }
  });

  it('still deletes the account when the user has no email on record', async () => {
    authUser.v = { id: 'user-1' };
    const res = await DELETE(req());
    expect(res.status).toBe(200);
    expect(cap.deletedUserIds).toEqual(['user-1']);
  });

  it('retries deleteUser once on a 504 and succeeds', async () => {
    cap.deleteUserResults = [
      { error: { message: 'Gateway Timeout', status: 504 } },
      { error: null },
    ];
    const res = await DELETE(req());
    expect(res.status).toBe(200);
    expect(cap.deletedUserIds).toEqual(['user-1', 'user-1']);
  });

  it('treats user-not-found on retry as success — the 504 already deleted', async () => {
    cap.deleteUserResults = [
      { error: { message: 'Gateway Timeout', status: 504 } },
      { error: { message: 'User not found', status: 404, code: 'user_not_found' } },
    ];
    const res = await DELETE(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alreadyDeleted).toBe(true);
  });

  it('does not retry a non-retryable 4xx', async () => {
    cap.deleteUserResults = [{ error: { message: 'Forbidden', status: 403 } }];
    const res = await DELETE(req());
    expect(res.status).toBe(500);
    expect(cap.deletedUserIds).toEqual(['user-1']);
  });

  it('emits teacher_delete_completed with impact and reason for a classroom teacher', async () => {
    db.classrooms = [{ id: 'c1', name: 'Period 3' }];
    db.memberships = [
      { classroom_id: 'c1', student_id: 's1', is_rehearsal: false },
      { classroom_id: 'c1', student_id: 's2', is_rehearsal: false },
      { classroom_id: 'c1', student_id: 'user-1', is_rehearsal: false }, // teacher seat excluded
    ];
    db.roundsCount = 15;
    const res = await DELETE(req({ reason: 'too_many_emails', surface: 'settings' }));
    expect(res.status).toBe(200);
    const ev = telemetry.events.find((e) => e.event === 'teacher_delete_completed');
    expect(ev).toBeTruthy();
    expect(ev!.distinctId).toBe('user-1');
    expect(ev!.properties).toMatchObject({
      reason: 'too_many_emails',
      surface: 'settings',
      classroom_count: 1,
      student_count: 2,
      rounds_played: 15,
    });
  });

  it('emits teacher_delete_failed when the delete cannot complete', async () => {
    db.classrooms = [{ id: 'c1', name: null }];
    cap.deleteUserResults = [{ error: { message: 'Gateway Timeout', status: 504 } }];
    const res = await DELETE(req({ reason: 'other' }));
    expect(res.status).toBe(500);
    const ev = telemetry.events.find((e) => e.event === 'teacher_delete_failed');
    expect(ev).toBeTruthy();
    expect(ev!.properties).toMatchObject({ reason: 'other', attempts: 2 });
  });

  it('emits no teacher telemetry for a non-teacher', async () => {
    await DELETE(req({ reason: 'other' }));
    expect(telemetry.events.filter((e) => e.event.startsWith('teacher_delete_'))).toEqual([]);
  });

  it('ignores an unknown reason value', async () => {
    db.classrooms = [{ id: 'c1', name: 'X' }];
    await DELETE(req({ reason: 'not-a-real-reason' }));
    const ev = telemetry.events.find((e) => e.event === 'teacher_delete_completed');
    expect(ev).toBeTruthy();
    expect(ev!.properties.reason).toBeUndefined();
  });

  it('emits growth:account_deleted with teacher metadata, reason, and account_age_days', async () => {
    authUser.v = { id: 'user-1', email: 'teacher@school.org', created_at: '2026-10-01T00:00:00.000Z' } as any;
    db.classrooms = [{ id: 'c1', name: 'Period 3' }];
    db.memberships = [
      { classroom_id: 'c1', student_id: 's1', is_rehearsal: false },
      { classroom_id: 'c1', student_id: 's2', is_rehearsal: false },
    ];
    const res = await DELETE(req({ reason: 'too_many_emails', surface: 'account_delete_page' }));
    expect(res.status).toBe(200);
    const growth = telemetry.events.find((e) => e.event === 'growth:account_deleted');
    expect(growth).toBeTruthy();
    expect(growth!.distinctId).toBe('user-1');
    expect(growth!.properties).toMatchObject({
      is_teacher: true,
      class_count: 1,
      student_count: 2,
      deletion_reason: 'too_many_emails',
    });
    expect(typeof growth!.properties.account_age_days).toBe('number');
    expect(growth!.properties.account_age_days).toBeGreaterThan(0);
  });

  it('emits growth:account_deleted for non-teacher with is_teacher:false', async () => {
    authUser.v = { id: 'user-2', email: 'player@example.com', created_at: '2026-10-15T00:00:00.000Z' } as any;
    const res = await DELETE(req());
    expect(res.status).toBe(200);
    const growth = telemetry.events.find((e) => e.event === 'growth:account_deleted');
    expect(growth).toBeTruthy();
    expect(growth!.distinctId).toBe('user-2');
    expect(growth!.properties).toMatchObject({
      is_teacher: false,
      class_count: 0,
      student_count: 0,
      deletion_reason: null,
    });
  });

  it('deleteUser timeout-then-already-deleted resolves as success (idempotent recovery)', async () => {
    cap.deleteUserResults = [
      { error: { message: 'Gateway Timeout', status: 504 } },
    ];
    // Lookup confirms user is already gone
    cap.getUserByIdResult = { data: { user: null }, error: { status: 404, message: 'User not found' } };
    const res = await DELETE(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.alreadyDeleted).toBe(true);
  });

  it('deleteUser hard failure (user still exists) returns 500 and does NOT claim success', async () => {
    cap.deleteUserResults = [
      { error: { message: 'Gateway Timeout', status: 504 } },
      { error: { message: 'Gateway Timeout', status: 504 } },
    ];
    // User still exists on lookup
    cap.getUserByIdResult = { data: { user: { id: 'user-1' } }, error: null };
    const res = await DELETE(req());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to delete account');
    expect(body.success).toBeUndefined();
  });

  it('telemetry failure does not fail the deletion', async () => {
    const eduTelemetry = await import('@/backend/utils/educationTelemetry');
    const originalCapture = eduTelemetry.captureEduServerEvents;
    try {
      (eduTelemetry as any).captureEduServerEvents = () => {
        throw new Error('PostHog capture failure');
      };
      const res = await DELETE(req());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    } finally {
      (eduTelemetry as any).captureEduServerEvents = originalCapture;
    }
  });
});

describe('GET /api/account/delete (impact summary)', () => {
  it('rejects an unauthenticated caller', async () => {
    authUser.v = null;
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns isTeacher:false for a user with no classrooms', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isTeacher).toBe(false);
    expect(body.classrooms).toEqual([]);
  });

  it('summarises classrooms, roster (excluding teacher + rehearsal seats), rounds and email state', async () => {
    db.classrooms = [
      { id: 'c1', name: 'Period 3' },
      { id: 'c2', name: null },
    ];
    db.memberships = [
      { classroom_id: 'c1', student_id: 's1', is_rehearsal: false },
      { classroom_id: 'c1', student_id: 'user-1', is_rehearsal: false }, // teacher preview seat
      { classroom_id: 'c1', student_id: 's2', is_rehearsal: true }, // rehearsal seat
      { classroom_id: 'c2', student_id: 's3', is_rehearsal: false },
      { classroom_id: 'c2', student_id: 's4', is_rehearsal: false },
    ];
    db.roundsCount = 15;
    db.profile = { daily_email_subscribed: false };

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isTeacher).toBe(true);
    expect(body.totalStudents).toBe(3);
    expect(body.roundsPlayed).toBe(15);
    expect(body.emailSubscribed).toBe(false);
    const c1 = body.classrooms.find((c: { id: string }) => c.id === 'c1');
    expect(c1.studentCount).toBe(1);
    expect(c1.name).toBe('Period 3');
  });
});
