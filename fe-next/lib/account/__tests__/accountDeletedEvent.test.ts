/**
 * growth:account_deleted payload — pure derivation, no I/O.
 *
 * The delete route must emit this BEFORE auth.admin.deleteUser. These tests
 * pin the property names, the null-when-missing rule, and the PII ban.
 */
import { describe, expect, it } from 'vitest';
import {
  buildAccountDeletedEvent,
  hoursSince,
  loadAccountDeletedFacts,
  type AccountDeletedFacts,
} from '../accountDeletedEvent';
import { EMPTY_DELETE_IMPACT, type DeleteImpactSummary } from '../deleteAccountImpact';

const NOW = Date.parse('2026-11-04T12:00:00.000Z');

const TEACHER_IMPACT: DeleteImpactSummary = {
  isTeacher: true,
  classrooms: [
    { id: 'c1', name: 'Period 3', studentCount: 2 },
    { id: 'c2', name: 'Period 4', studentCount: 1 },
  ],
  totalStudents: 3,
  roundsPlayed: 4,
  emailSubscribed: true,
};

function facts(over: Partial<AccountDeletedFacts> = {}): AccountDeletedFacts {
  return {
    role: 'teacher',
    signupSurface: 'edu_access',
    utmCampaign: 'day2_value',
    rounds: 5,
    lastRoundAt: '2026-11-04T06:00:00.000Z',
    ...over,
  };
}

describe('hoursSince', () => {
  it('floors whole hours and never goes negative', () => {
    expect(hoursSince('2026-11-04T09:30:00.000Z', NOW)).toBe(2);
    expect(hoursSince('2026-11-04T13:00:00.000Z', NOW)).toBe(0);
    expect(hoursSince(null, NOW)).toBeNull();
    expect(hoursSince('not-a-date', NOW)).toBeNull();
  });
});

describe('buildAccountDeletedEvent', () => {
  it('names the event growth:account_deleted and carries every listed property', () => {
    const ev = buildAccountDeletedEvent({
      userId: 'user-1',
      createdAt: '2026-11-03T12:00:00.000Z',
      now: NOW,
      reason: 'too_many_emails',
      impact: TEACHER_IMPACT,
      facts: facts(),
    });
    expect(ev.event).toBe('growth:account_deleted');
    expect(ev.distinctId).toBe('user-1');
    expect(ev.properties).toMatchObject({
      role: 'teacher',
      account_age_hours: 24,
      classes: 2,
      members: 3,
      rounds: 5,
      last_round_age_hours: 6,
      signup_surface: 'edu_access',
      utm_campaign: 'day2_value',
      reason: 'too_many_emails',
      // kept so existing delete-route assertions and dashboards still match
      is_teacher: true,
      class_count: 2,
      student_count: 3,
      deletion_reason: 'too_many_emails',
      account_age_days: 1,
    });
  });

  it('nulls last_round_age_hours when the user never played a classroom round', () => {
    const ev = buildAccountDeletedEvent({
      userId: 'user-2',
      createdAt: '2026-11-04T11:00:00.000Z',
      now: NOW,
      reason: null,
      impact: EMPTY_DELETE_IMPACT,
      facts: facts({
        role: 'student',
        signupSurface: null,
        utmCampaign: null,
        rounds: 0,
        lastRoundAt: null,
      }),
    });
    expect(ev.properties.rounds).toBe(0);
    expect(ev.properties.last_round_age_hours).toBeNull();
    expect(ev.properties.signup_surface).toBeNull();
    expect(ev.properties.utm_campaign).toBeNull();
    expect(ev.properties.reason).toBeNull();
    expect(ev.properties.classes).toBe(0);
    expect(ev.properties.members).toBe(0);
    expect(ev.properties.account_age_hours).toBe(1);
  });

  it('drops email-shaped attribution and never copies name or email keys', () => {
    const ev = buildAccountDeletedEvent({
      userId: 'user-1',
      createdAt: '2026-11-01T12:00:00.000Z',
      now: NOW,
      reason: 'privacy',
      impact: TEACHER_IMPACT,
      facts: facts({
        signupSurface: 'teacher@school.org',
        utmCampaign: 'Ada Lovelace',
      }),
    });
    expect(ev.properties.signup_surface).toBeNull();
    expect(ev.properties.utm_campaign).toBeNull();
    const blob = JSON.stringify(ev.properties);
    expect(blob).not.toContain('@');
    expect(blob).not.toContain('Ada');
    expect(blob).not.toContain('Period 3');
    for (const key of Object.keys(ev.properties)) {
      expect(key).not.toMatch(/email|name|phone/i);
    }
  });
});

describe('loadAccountDeletedFacts', () => {
  it('reads role, signup surface, all class rounds, and the newer email landing', async () => {
    const calls: string[] = [];
    const db = {
      from(table: string) {
        const state = { head: false, filters: [] as string[] };
        const qb: Record<string, unknown> = {};
        const resolve = () => {
          calls.push(table);
          if (table === 'profiles') {
            return {
              data: {
                user_role: 'teacher',
                signup_surface: 'header_or_menu',
                utm_source: 'google',
                utm_medium: 'cpc',
                utm_campaign: 'brand',
              },
              error: null,
            };
          }
          if (table === 'classroom_rounds' && state.head) {
            return { data: null, count: 7, error: null };
          }
          if (table === 'classroom_rounds') {
            return {
              data: { started_at: '2026-11-04T08:00:00.000Z', completed_at: '2026-11-04T08:20:00.000Z' },
              error: null,
            };
          }
          if (table === 'analytics_events') {
            return { data: { utm_campaign: 'day2_value', created_at: '2026-11-02T00:00:00.000Z' }, error: null };
          }
          if (table === 'guest_sessions') {
            return { data: { utm_campaign: 'abandoned_checkout', last_visit_at: '2026-11-03T00:00:00.000Z' }, error: null };
          }
          return { data: null, error: null };
        };
        for (const m of ['select', 'eq', 'in', 'or', 'order', 'limit', 'not', 'gte']) {
          qb[m] = (...args: unknown[]) => {
            if (m === 'select' && args[1] && (args[1] as { head?: boolean }).head) state.head = true;
            if (m === 'or') state.filters.push(String(args[0]));
            return qb;
          };
        }
        qb.maybeSingle = () => Promise.resolve(resolve());
        qb.then = (resolveFn: (v: unknown) => void) => resolveFn(resolve());
        return qb;
      },
    };

    const got = await loadAccountDeletedFacts(db as never, 'user-1', ['c1', 'c2']);
    expect(got.role).toBe('teacher');
    expect(got.signupSurface).toBe('header_or_menu');
    expect(got.rounds).toBe(7);
    expect(got.lastRoundAt).toBe('2026-11-04T08:20:00.000Z');
    // guest session is newer than the analytics landing, so its campaign wins.
    // Profile utm_campaign is a paid click, not an email landing — ignored.
    expect(got.utmCampaign).toBe('abandoned_checkout');
    expect(calls).toContain('analytics_events');
    expect(calls).toContain('guest_sessions');
  });

  it('falls back to profile utm_campaign only when that attribution is itself an email landing', async () => {
    const db = {
      from(table: string) {
        const qb: Record<string, unknown> = {};
        const resolve = () => {
          if (table === 'profiles') {
            return {
              data: {
                user_role: 'student',
                signup_surface: null,
                utm_source: 'email',
                utm_medium: 'email',
                utm_campaign: 'polar_trial_day10',
              },
              error: null,
            };
          }
          if (table === 'classroom_rounds') return { data: null, count: 0, error: null };
          return { data: null, error: null };
        };
        for (const m of ['select', 'eq', 'in', 'or', 'order', 'limit', 'not', 'gte']) {
          qb[m] = () => qb;
        }
        qb.maybeSingle = () => Promise.resolve(resolve());
        qb.then = (resolveFn: (v: unknown) => void) => resolveFn(resolve());
        return qb;
      },
    };
    const got = await loadAccountDeletedFacts(db as never, 'user-2', []);
    expect(got.rounds).toBe(0);
    expect(got.lastRoundAt).toBeNull();
    expect(got.utmCampaign).toBe('polar_trial_day10');
    expect(got.role).toBe('student');
  });
});
