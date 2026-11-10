import { describe, it, expect } from 'vitest';
import { buildEduInsights, type EduInsightsInput } from '../eduInsights';

const DAY = 86_400_000;
const NOW = Date.parse('2026-11-10T12:00:00Z'); // Tuesday
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();

const base = (over: Partial<EduInsightsInput> = {}): EduInsightsInput => ({
  nowMs: NOW,
  windowDays: 7,
  rounds: [],
  classes: [],
  approvals: [],
  subscriptions: [],
  ...over,
});

describe('buildEduInsights — usage', () => {
  it('is null-safe when rounds are unavailable', () => {
    const r = buildEduInsights(base({ rounds: null }));
    expect(r.usage).toBeNull();
    expect(r.retention).toBeNull();
  });

  it('counts rounds, players and players-per-round in the window only', () => {
    const r = buildEduInsights(
      base({
        rounds: [
          { classroom_id: 'c1', teacher_id: 't1', game_mode: 'classic', player_count: 10, completed_at: ago(1) },
          { classroom_id: 'c1', teacher_id: 't1', game_mode: 'classic', player_count: 20, completed_at: ago(2) },
          { classroom_id: 'c2', teacher_id: 't2', game_mode: 'classic', player_count: 99, completed_at: ago(9) },
        ],
      }),
    );
    expect(r.usage!.rounds).toBe(2);
    expect(r.usage!.players).toBe(30);
    expect(r.usage!.avgPlayersPerRound).toBe(15);
    expect(r.usage!.dailyPlayers).toHaveLength(7);
    expect(r.usage!.dailyPlayers.reduce((a, b) => a + b, 0)).toBe(30);
  });

  it('buckets rounds by weekday (0=Sunday) and picks the peak', () => {
    // 2026-11-09 is Monday, 2026-11-10 Tuesday
    const r = buildEduInsights(
      base({
        rounds: [
          { classroom_id: 'c1', teacher_id: 't1', game_mode: 'a', player_count: 1, completed_at: '2026-11-09T10:00:00Z' },
          { classroom_id: 'c1', teacher_id: 't1', game_mode: 'a', player_count: 1, completed_at: '2026-11-09T11:00:00Z' },
          { classroom_id: 'c1', teacher_id: 't1', game_mode: 'a', player_count: 1, completed_at: '2026-11-10T09:00:00Z' },
        ],
      }),
    );
    expect(r.usage!.byWeekday).toEqual([0, 2, 1, 0, 0, 0, 0]);
    expect(r.usage!.peakWeekday).toBe(1);
  });

  it('peakWeekday is null with no rounds', () => {
    expect(buildEduInsights(base()).usage!.peakWeekday).toBeNull();
  });

  it('ranks top teachers by rounds in the window, max 5', () => {
    const rounds = [
      ...Array.from({ length: 3 }, () => ({ classroom_id: 'c1', teacher_id: 'a', game_mode: 'x', player_count: 5, completed_at: ago(1) })),
      { classroom_id: 'c2', teacher_id: 'b', game_mode: 'x', player_count: 7, completed_at: ago(1) },
      ...['c', 'd', 'e', 'f'].map((id) => ({ classroom_id: id, teacher_id: id, game_mode: 'x', player_count: 1, completed_at: ago(1) })),
    ];
    const top = buildEduInsights(base({ rounds })).usage!.topTeachers;
    expect(top).toHaveLength(5);
    expect(top[0]).toEqual({ teacherId: 'a', rounds: 3, players: 15 });
  });
});

describe('buildEduInsights — retention', () => {
  it('returning = teachers who taught in both windows / taught in prior window', () => {
    const rounds = [
      { classroom_id: 'c', teacher_id: 'a', game_mode: 'x', player_count: 1, completed_at: ago(1) },
      { classroom_id: 'c', teacher_id: 'a', game_mode: 'x', player_count: 1, completed_at: ago(8) },
      { classroom_id: 'c', teacher_id: 'b', game_mode: 'x', player_count: 1, completed_at: ago(9) },
      { classroom_id: 'c', teacher_id: 'n', game_mode: 'x', player_count: 1, completed_at: ago(2) },
    ];
    const r = buildEduInsights(base({ rounds })).retention!;
    expect(r.priorTeachers).toBe(2);
    expect(r.returned).toBe(1);
    expect(r.pct).toBe(50);
    expect(r.newlyTeaching).toBe(1);
    expect(r.lostIds).toEqual(['b']);
  });

  it('pct is null when nobody taught in the prior window', () => {
    const r = buildEduInsights(base({ rounds: [{ classroom_id: 'c', teacher_id: 'a', game_mode: 'x', player_count: 1, completed_at: ago(1) }] })).retention!;
    expect(r.pct).toBeNull();
  });
});

describe('buildEduInsights — class sizes', () => {
  it('buckets classes and averages only non-empty ones', () => {
    const classes = [0, 3, 12, 25, 25, 40].map((students, i) => ({ id: `c${i}`, students }));
    const r = buildEduInsights(base({ classes }));
    expect(r.classSizes.buckets).toEqual([
      { key: 'empty', count: 1 },
      { key: '1-9', count: 1 },
      { key: '10-19', count: 1 },
      { key: '20-29', count: 2 },
      { key: '30+', count: 1 },
    ]);
    expect(r.classSizes.avgStudents).toBe(21);
  });

  it('avg is null without any populated class', () => {
    expect(buildEduInsights(base({ classes: [{ id: 'a', students: 0 }] })).classSizes.avgStudents).toBeNull();
  });
});

describe('buildEduInsights — pro pipeline', () => {
  const approvals = (rows: Array<[string, number | null]>) =>
    rows.map(([id, d]) => ({ user_id: id, reviewed_at: ago(30), trial_expires_at: d === null ? null : new Date(NOW + d * DAY).toISOString() }));

  it('splits trials into active, expiring within 7 days, and lapsed unpaid; paid ones are excluded', () => {
    const r = buildEduInsights(
      base({
        approvals: approvals([['active', 20], ['soon', 3], ['lapsed', -2], ['paid', 3], ['notrial', null]]),
        subscriptions: [{ user_id: 'paid', status: 'active', created_at: ago(1) }],
      }),
    ).pro;
    expect(r.trialsActive).toEqual(['active', 'soon']);
    expect(r.expiringSoon).toEqual(['soon']);
    expect(r.lapsedUnpaid).toEqual(['lapsed']);
    expect(r.paying).toBe(1);
  });

  it('conversion = paid trial teachers / trials already concluded (ended or paid)', () => {
    const r = buildEduInsights(
      base({
        approvals: approvals([['a', -5], ['b', -5], ['c', -5], ['d', 10]]),
        subscriptions: [{ user_id: 'a', status: 'active', created_at: ago(6) }],
      }),
    ).pro;
    expect(r.conversionPct).toBe(33);
  });

  it('conversion is null when no trial has concluded', () => {
    expect(buildEduInsights(base({ approvals: approvals([['d', 10]]) })).pro.conversionPct).toBeNull();
  });
});

describe('buildEduInsights — early-warning signals', () => {
  const r = (teacher: string, d: number, players = 10) => ({
    classroom_id: 'c', teacher_id: teacher, game_mode: 'x', player_count: players, completed_at: ago(d),
  });

  it('fading = still teaching but at most half of last period, with enough history', () => {
    const rounds = [
      ...[8, 9, 10, 11].map((d) => r('fade', d)),
      r('fade', 1),
      ...[8, 9, 10].map((d) => r('steady', d)),
      ...[1, 2, 3].map((d) => r('steady', d)),
      ...[8, 9].map((d) => r('tiny', d)),
    ];
    expect(buildEduInsights(base({ rounds })).usage!.fadingIds).toEqual(['fade']);
  });

  it('quietDays counts trailing days with no games', () => {
    const u = buildEduInsights(base({ rounds: [r('a', 3), r('a', 5)] })).usage!;
    expect(u.quietDays).toBe(3);
    expect(u.dailyRounds).toHaveLength(7);
  });

  it('quietDays is the whole window with no games', () => {
    expect(buildEduInsights(base({ rounds: [r('a', 20)] })).usage!.quietDays).toBe(7);
  });

  it('momentum compares the last 3 days with the earlier days of the window', () => {
    const slump = [...[4, 5, 6].map((d) => r('a', d, 30)), r('a', 1, 10)];
    expect(buildEduInsights(base({ rounds: slump })).usage!.momentumPct).toBeLessThan(-50);
    const none = buildEduInsights(base({ rounds: [r('a', 1)] })).usage!;
    expect(none.momentumPct).toBeNull();
  });

  it('topTeacherShare is the top teacher\'s percent of all games', () => {
    const rounds = [r('a', 1), r('a', 1), r('a', 2), r('b', 1)];
    expect(buildEduInsights(base({ rounds })).usage!.topTeacherShare).toBe(75);
  });
});

describe('buildEduInsights — per-mode health', () => {
  const m = (mode: string, teacher: string, d: number, players: number) => ({
    classroom_id: 'c', teacher_id: teacher, game_mode: mode, player_count: players, completed_at: ago(d),
  });

  it('summarises each mode in the window: games, teachers, average players, one-and-done teachers', () => {
    const rounds = [
      m('classic', 'a', 1, 20), m('classic', 'a', 2, 20), m('classic', 'b', 1, 10),
      m('blast', 'a', 1, 4), m('blast', 'b', 2, 2), m('blast', 'c', 3, 3),
      m('classic', 'a', 10, 99),
    ];
    const modes = buildEduInsights(base({ rounds })).usage!.modes;
    expect(modes.map((x) => x.mode)).toEqual(['classic', 'blast']);
    expect(modes[0]).toMatchObject({ rounds: 3, teachers: 2, avgPlayers: 16.7, oneAndDone: 1, priorRounds: 1 });
    expect(modes[1]).toMatchObject({ rounds: 3, teachers: 3, avgPlayers: 3, oneAndDone: 3, priorRounds: 0 });
  });

  it('is empty without rounds', () => {
    expect(buildEduInsights(base()).usage!.modes).toEqual([]);
  });
});
