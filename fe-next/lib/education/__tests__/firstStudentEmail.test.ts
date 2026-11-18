import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), info: vi.fn() } }));
const sendEmail = vi.fn(async (_args: { to: string; subject: string; html: string }) => ({ ok: true }));
vi.mock('@/lib/email/send', () => ({ sendEmail: (a: { to: string; subject: string; html: string }) => sendEmail(a) }));

import logger from '@/utils/logger';
import { notifyFirstStudent } from '../firstStudentEmail';

type Row = Record<string, unknown>;

function fakeDb(seed: Record<string, Row[]>, failOn?: string) {
  const tables: Record<string, Row[]> = { teacher_lifecycle_sends: [], ...seed };
  const keyOf = (r: Row) => `${r.user_id}|${r.kind}|${r.period_key}`;
  return {
    tables,
    from(table: string) {
      const filters: Array<(r: Row) => boolean> = [];
      const q: Record<string, unknown> = {};
      const run = () => (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
      const result = () =>
        failOn === `${table}:select` ? { data: null, error: { message: 'down' } } : { data: run(), error: null };
      Object.assign(q, {
        select: () => q,
        eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return q; },
        in: (c: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[c])); return q; },
        limit: () => q,
        maybeSingle: async () => (failOn === `${table}:select` ? { data: null, error: { message: 'down' } } : { data: run()[0] ?? null, error: null }),
        then: (ok: (v: unknown) => unknown) => Promise.resolve(result()).then(ok),
        update: (patch: Row) => ({
          eq: async (c: string, v: unknown) => {
            for (const r of tables[table] ?? []) if (r[c] === v) Object.assign(r, patch);
            return { error: null };
          },
        }),
        upsert: (row: Row) => {
          const exists = tables[table].some((r) => keyOf(r) === keyOf(row));
          if (!exists) tables[table].push({ sent_at: new Date().toISOString(), ...row });
          return { select: async () => ({ data: exists ? [] : [row], error: null }) };
        },
        delete: () => {
          const chain = {
            eq: (c: string, v: unknown) => {
              filters.push((r) => r[c] === v);
              return {
                ...chain,
                then: (ok: (x: unknown) => unknown) => {
                  tables[table] = tables[table].filter((r) => !filters.every((f) => f(r)));
                  return Promise.resolve({ error: null }).then(ok);
                },
              };
            },
          };
          return chain;
        },
      });
      return q;
    },
  };
}

const world = (over: Record<string, Row[]> = {}) => ({
  classrooms: [{ id: 'c1', teacher_id: 't1', name: '7B English' }],
  classroom_memberships: [{ classroom_id: 'c1', student_id: 's1', is_rehearsal: false }],
  profiles: [{ id: 't1', is_test_account: false, daily_email_subscribed: true, email_unsubscribe_token: 'tok' }],
  teacher_access_requests: [{ user_id: 't1', status: 'approved', email: 'dana@school.test', full_name: 'Dana Levi', locale: 'he' }],
  ...over,
});

const args = (over: Partial<Parameters<typeof notifyFirstStudent>[1]> = {}) => ({
  classroomId: 'c1',
  studentId: 's1',
  isRehearsal: false,
  liveGameCode: null,
  ...over,
});

const run = (db: ReturnType<typeof fakeDb>, a = args()) => notifyFirstStudent(db as never, a);

describe('notifyFirstStudent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given the first real student joins, When notified, Then the teacher is emailed once in their locale with a link to Teacher Home', async () => {
    const db = fakeDb(world());

    expect(await run(db)).toBe('sent');

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.to).toBe('dana@school.test');
    expect(mail.html).toContain('lang="he"');
    expect(mail.html).toContain('7B English');
    expect(mail.html).toContain('/he/teacher?');
    expect(mail.html).toContain('classroomId=c1');
    expect(db.tables.teacher_lifecycle_sends).toHaveLength(1);
    expect(db.tables.teacher_lifecycle_sends[0]).toMatchObject({ user_id: 't1', kind: 'first_student', period_key: 'c1' });
  });

  it('Given a class of two joins nearly together, When both are notified, Then exactly one email goes out', async () => {
    const db = fakeDb(world({
      classroom_memberships: [
        { classroom_id: 'c1', student_id: 's1', is_rehearsal: false },
        { classroom_id: 'c1', student_id: 's2', is_rehearsal: false },
      ],
    }));

    const results = await Promise.all([run(db, args({ studentId: 's1' })), run(db, args({ studentId: 's2' }))]);

    expect(results.filter((r) => r === 'sent')).toHaveLength(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('Given five real students after this join, When notified, Then the email is still sent', async () => {
    const db = fakeDb(world({
      classroom_memberships: ['s1', 's2', 's3', 's4', 's5'].map((id) => ({ classroom_id: 'c1', student_id: id, is_rehearsal: false })),
    }));

    expect(await run(db, args({ studentId: 's5' }))).toBe('sent');
  });

  it('Given more than five real students, When notified, Then nothing is sent', async () => {
    const db = fakeDb(world({
      classroom_memberships: ['s1', 's2', 's3', 's4', 's5', 's6'].map((id) => ({ classroom_id: 'c1', student_id: id, is_rehearsal: false })),
    }));

    expect(await run(db, args({ studentId: 's6' }))).toBe('class-started');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('Given the student is not on the roster, When notified, Then nothing is sent', async () => {
    const db = fakeDb(world());

    expect(await run(db, args({ studentId: 'ghost' }))).toBe('class-started');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('Given an earlier rehearsal seat, When the first real student joins, Then it still counts as the first', async () => {
    const db = fakeDb(world({
      classroom_memberships: [
        { classroom_id: 'c1', student_id: 't1', is_rehearsal: true },
        { classroom_id: 'c1', student_id: 's1', is_rehearsal: false },
      ],
    }));

    expect(await run(db)).toBe('sent');
  });

  it('Given a rehearsal seat joins, When notified, Then nothing is sent', async () => {
    const db = fakeDb(world());

    expect(await run(db, args({ isRehearsal: true }))).toBe('rehearsal');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('Given the teacher joins their own class, When notified, Then nothing is sent', async () => {
    const db = fakeDb(world({ classroom_memberships: [{ classroom_id: 'c1', student_id: 't1', is_rehearsal: false }] }));

    expect(await run(db, args({ studentId: 't1' }))).toBe('teacher');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('Given the teacher is a test account, When notified, Then nothing is sent', async () => {
    const db = fakeDb(world({
      profiles: [{ id: 't1', is_test_account: true, daily_email_subscribed: true, email_unsubscribe_token: 'tok' }],
    }));

    expect(await run(db)).toBe('test-account');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('Given a live game is running, When notified, Then nothing is sent', async () => {
    const db = fakeDb(world());

    expect(await run(db, args({ liveGameCode: 'ABC123' }))).toBe('live-game');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('Given the teacher unsubscribed, When notified, Then nothing is sent and nothing is claimed', async () => {
    const db = fakeDb(world({
      profiles: [{ id: 't1', is_test_account: false, daily_email_subscribed: false, email_unsubscribe_token: 'tok' }],
    }));

    expect(await run(db)).toBe('unsubscribed');
    expect(sendEmail).not.toHaveBeenCalled();
    expect(db.tables.teacher_lifecycle_sends).toHaveLength(0);
  });

  it('Given the ledger already holds this class, When notified, Then nothing is sent', async () => {
    const db = fakeDb(world({
      teacher_lifecycle_sends: [{ user_id: 't1', kind: 'first_student', period_key: 'c1', sent_at: '2026-11-18T00:00:00Z' }],
    }));

    expect(await run(db)).toBe('already-sent');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('Given the send fails, When notified, Then it does not throw, logs, and releases the claim', async () => {
    sendEmail.mockResolvedValueOnce({ ok: false });
    const db = fakeDb(world());

    await expect(run(db)).resolves.toBe('send-failed');

    expect(logger.error).toHaveBeenCalled();
    expect(db.tables.teacher_lifecycle_sends).toHaveLength(0);
  });

  it('Given the database is down, When notified, Then it does not throw and logs', async () => {
    const db = fakeDb(world(), 'classrooms:select');

    await expect(run(db)).resolves.toBe('error');

    expect(logger.error).toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('Given a teacher with no approved contact, When notified, Then nothing is sent', async () => {
    const db = fakeDb(world({ teacher_access_requests: [] }));

    expect(await run(db)).toBe('no-contact');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('Given an unknown teacher locale, When notified, Then the email falls back to English', async () => {
    const db = fakeDb(world({
      teacher_access_requests: [{ user_id: 't1', status: 'approved', email: 'dana@school.test', full_name: null, locale: 'fr' }],
    }));

    await run(db);

    expect(sendEmail.mock.calls[0][0].html).toContain('lang="en"');
  });
});
