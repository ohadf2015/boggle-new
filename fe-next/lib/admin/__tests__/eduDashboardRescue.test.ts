import { describe, it, expect } from 'vitest';
import { buildEduDashboard, type EduDashboardInput } from '../eduDashboard';
import { dailyDistinct } from '../eduMetrics';
import { isOutreachCoolingDown, OUTREACH_COOLDOWN_DAYS, teacherHomeUrl } from '../eduOutreach';

const NOW = Date.parse('2026-10-08T12:00:00Z');
const DAY = 86_400_000;

const base = (over: Partial<EduDashboardInput> = {}): EduDashboardInput => ({
  nowMs: NOW,
  windowDays: 7,
  teachers: [{ id: 't1', name: 'Ann', last_seen_at: '2026-10-01T00:00:00Z' }],
  approvals: [
    { user_id: 't1', reviewed_at: '2026-10-07T10:00:00Z', trial_expires_at: null, email: 'ann@school.example' },
  ],
  requested: 2,
  classrooms: [{ id: 'c1', teacher_id: 't1', name: 'P3', join_code: 'ABC123' }],
  memberships: [],
  rounds: [],
  subscriptions: [],
  outreach: null,
  ...over,
});

describe('dailyDistinct', () => {
  it('counts distinct keys per day, oldest first', () => {
    const series = dailyDistinct(
      [
        { key: 'c1', ts: '2026-10-08T01:00:00Z' },
        { key: 'c1', ts: '2026-10-08T02:00:00Z' },
        { key: 'c2', ts: '2026-10-08T03:00:00Z' },
        { key: 'c1', ts: '2026-10-06T03:00:00Z' },
      ],
      NOW,
      3,
    );
    expect(series).toEqual([1, 0, 2]);
  });
});

describe('buildEduDashboard sparklines', () => {
  it('returns a daily series for every KPI, one value per window day', () => {
    const data = buildEduDashboard(
      base({
        rounds: [{ classroom_id: 'c1', teacher_id: 't1', game_mode: 'wordcraft', player_count: 3, completed_at: '2026-10-08T01:00:00Z' }],
      }),
    );
    const keys = ['activeTeachers', 'newTeachers', 'classesWithLiveGame', 'liveRounds', 'trialsStarted', 'trialsPaid'] as const;
    for (const key of keys) {
      expect(data.sparklines[key], key).toHaveLength(7);
    }
    expect(data.sparklines.newTeachers?.[5]).toBe(1);
    expect(data.sparklines.classesWithLiveGame?.[6]).toBe(1);
  });

  it('marks round-based series as unmeasured when classroom_rounds is missing', () => {
    const data = buildEduDashboard(base({ rounds: null }));
    expect(data.sparklines.liveRounds).toBeNull();
    expect(data.sparklines.classesWithLiveGame).toBeNull();
    expect(data.sparklines.newTeachers).not.toBeNull();
  });
});

describe('buildEduDashboard rescue rows', () => {
  it('carries the email, first class join code and last outreach for each stuck teacher', () => {
    const data = buildEduDashboard(
      base({
        outreach: [
          { teacher_id: 't1', channel: 'copy', created_at: '2026-10-03T00:00:00Z' },
          { teacher_id: 't1', channel: 'email', created_at: '2026-10-05T00:00:00Z' },
        ],
      }),
    );
    expect(data.outreachAvailable).toBe(true);
    const row = data.verdict?.rescue[0];
    expect(row).toMatchObject({
      id: 't1',
      email: 'ann@school.example',
      joinCode: 'ABC123',
      lastOutreachAt: '2026-10-05T00:00:00Z',
    });
  });

  it('reports outreach as unmeasured, not as never contacted, when the table is missing', () => {
    const data = buildEduDashboard(base({ outreach: null }));
    expect(data.outreachAvailable).toBe(false);
    expect(data.verdict?.rescue[0].lastOutreachAt).toBeNull();
  });
});

describe('eduOutreach', () => {
  it('blocks a second nudge inside the cooldown and allows one after it', () => {
    const last = new Date(NOW - (OUTREACH_COOLDOWN_DAYS - 1) * DAY).toISOString();
    expect(isOutreachCoolingDown(last, NOW)).toBe(true);
    expect(isOutreachCoolingDown(new Date(NOW - (OUTREACH_COOLDOWN_DAYS + 1) * DAY).toISOString(), NOW)).toBe(false);
    expect(isOutreachCoolingDown(null, NOW)).toBe(false);
  });

  it('builds the teacher home link on the request origin and locale', () => {
    expect(teacherHomeUrl('https://lexiclash.com', 'he')).toBe('https://lexiclash.com/he/teacher');
  });
});
