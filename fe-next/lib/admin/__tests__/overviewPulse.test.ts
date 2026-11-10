import { describe, it, expect } from 'vitest';
import { buildPulse, type PulseInput } from '../overviewPulse';

const DAY = 86_400_000;
const NOW = Date.parse('2026-11-10T12:00:00Z');
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString().slice(0, 10);

/** One row per day for `days` days ending today; `games(daysAgo)` and `players(daysAgo)` shape the series. */
const dailyOf = (days: number, games: (d: number) => number, players: (d: number) => number = () => 10, guestShare = 0.5) =>
  Array.from({ length: days }, (_, i) => {
    const d = days - 1 - i;
    const total = games(d);
    const guest = Math.round(total * guestShare);
    return { date: iso(d), games: total - guest, guestGames: guest, totalGames: total, uniquePlayers: players(d), uniqueGuests: 0, totalUniquePlayers: players(d) };
  });

const weekStart = (weeksAgo: number) => iso(weeksAgo * 7 + 2);
const growthOf = (perWeek: number[]) => perWeek.map((signups, i) => ({ week: weekStart(perWeek.length - 1 - i), signups, total: 1000 }));

const base = (over: Partial<PulseInput> = {}): PulseInput => ({
  nowMs: NOW,
  windowDays: 7,
  daily: dailyOf(60, () => 40),
  growth: growthOf([10, 10, 10, 10, 10, 10, 10, 10, 4]),
  stats: { activity: { uniquePlayersToday: 10, uniquePlayersMonth: 40 }, overview: { totalPlayers: 900, totalGuests: 300, totalGames: 5000 } },
  revenue: { paying: 0, trialing: 0, pastDue: 0, checkoutsStarted30d: 0, paidOrders30d: 0 },
  health: { redis: 'ok', database: 'ok', process: { heapMB: 300, uptimeSeconds: 100 } },
  unreadReports: 0,
  ...over,
});

const ids = (p: ReturnType<typeof buildPulse>, tone?: string) => p.findings.filter((f) => !tone || f.tone === tone).map((f) => f.id);

describe('buildPulse — tiles', () => {
  it('compares the window with the one before it, and keeps one spark value per day', () => {
    const p = buildPulse(base({ daily: dailyOf(60, (d) => (d < 7 ? 60 : 40)) }));
    expect(p.games).toMatchObject({ current: 420, prior: 280, pct: 50 });
    expect(p.games.spark).toHaveLength(7);
  });

  it('a 30-day window needs 60 days and sums both halves', () => {
    const p = buildPulse(base({ windowDays: 30, daily: dailyOf(60, (d) => (d < 30 ? 10 : 20)) }));
    expect(p.games).toMatchObject({ current: 300, prior: 600, pct: -50 });
    expect(p.games.spark).toHaveLength(30);
  });

  it('missing days count as zero rather than shifting the series', () => {
    const daily = dailyOf(60, () => 10).filter((r) => r.date !== iso(1));
    const p = buildPulse(base({ daily }));
    expect(p.games.current).toBe(60);
    expect(p.games.spark).toHaveLength(7);
  });

  it('players is the average active players per day', () => {
    const p = buildPulse(base({ daily: dailyOf(60, () => 40, (d) => (d < 7 ? 20 : 10)) }));
    expect(p.players).toMatchObject({ current: 20, prior: 10, pct: 100 });
  });

  it('signups come from complete weeks only, ignoring the current partial week', () => {
    const p = buildPulse(base({ growth: growthOf([10, 10, 10, 10, 10, 10, 10, 20, 15, 2]) }));
    expect(p.signups).toMatchObject({ current: 15, prior: 20, pct: -25 });
    expect(p.signups!.spark).toEqual([10, 10, 10, 10, 10, 10, 20, 15]);
  });

  it('a 30-day window sums four complete weeks against the four before', () => {
    const p = buildPulse(base({ windowDays: 30, growth: growthOf([5, 5, 5, 5, 10, 10, 10, 10, 1]) }));
    expect(p.signups).toMatchObject({ current: 40, prior: 20, pct: 100 });
  });

  it('signups is null without enough weeks', () => {
    expect(buildPulse(base({ growth: growthOf([5, 5]) })).signups).toBeNull();
  });

  it('signed-in share is the percent of games played by logged-in players', () => {
    const p = buildPulse(base({ daily: dailyOf(60, () => 100, () => 10, 0.8) }));
    expect(p.signedInShare).toBe(20);
  });

  it('stickiness is the average daily players over the monthly unique players', () => {
    const p = buildPulse(base({ daily: dailyOf(60, () => 40, () => 12), stats: { activity: { uniquePlayersToday: 1, uniquePlayersMonth: 48 }, overview: { totalPlayers: 1, totalGuests: 0, totalGames: 1 } } }));
    expect(p.stickinessPct).toBe(25);
  });

  it('everything is null-safe with no data at all', () => {
    const p = buildPulse(base({ daily: [], growth: [], stats: null, revenue: null, health: null }));
    expect(p.games).toMatchObject({ current: 0, prior: 0, pct: null });
    expect(p.signedInShare).toBeNull();
    expect(p.stickinessPct).toBeNull();
    expect(p.findings).toEqual([]);
  });
});

describe('buildPulse — findings', () => {
  it('celebrates a games surge and flags a slump, only with enough volume to mean something', () => {
    expect(ids(buildPulse(base({ daily: dailyOf(60, (d) => (d < 7 ? 60 : 40)) })), 'win')).toContain('games_up');
    expect(ids(buildPulse(base({ daily: dailyOf(60, (d) => (d < 7 ? 20 : 40)) })), 'problem')).toContain('games_down');
    expect(ids(buildPulse(base({ daily: dailyOf(60, (d) => (d < 7 ? 1 : 0)) })))).not.toContain('games_up');
  });

  it('flags falling and rising signups', () => {
    expect(ids(buildPulse(base({ growth: growthOf([10, 10, 10, 10, 10, 10, 10, 20, 12, 1]) })), 'problem')).toContain('signups_down');
    expect(ids(buildPulse(base({ growth: growthOf([10, 10, 10, 10, 10, 10, 10, 10, 20, 1]) })), 'win')).toContain('signups_up');
  });

  it('warns when almost everyone plays as a guest', () => {
    const f = buildPulse(base({ daily: dailyOf(60, () => 100, () => 10, 0.9) })).findings.find((x) => x.id === 'guest_heavy')!;
    expect(f).toMatchObject({ tone: 'early', params: { pct: 10 } });
  });

  it('warns when games stop after a busy period, and does not double-report it as a momentum drop', () => {
    const stopped = buildPulse(base({ daily: dailyOf(60, (d) => (d < 2 ? 0 : 40)) }));
    expect(ids(stopped, 'early')).toContain('activity_stopped');
    expect(ids(stopped)).not.toContain('momentum_drop');
  });

  it('warns on a sharp drop over the last 3 days before the weekly total shows it', () => {
    const p = buildPulse(base({ daily: dailyOf(60, (d) => (d < 3 ? 10 : 40)) }));
    expect(ids(p, 'early')).toContain('momentum_drop');
  });

  it('reads stickiness: good is a win, thin is an early warning', () => {
    const mk = (players: number, mau: number) => base({ daily: dailyOf(60, () => 40, () => players), stats: { activity: { uniquePlayersToday: 1, uniquePlayersMonth: mau }, overview: { totalPlayers: 1, totalGuests: 0, totalGames: 1 } } });
    expect(ids(buildPulse(mk(25, 100)), 'win')).toContain('sticky');
    expect(ids(buildPulse(mk(5, 100)), 'early')).toContain('low_stickiness');
  });

  it('a service that is down is a problem, and a heavy heap is an early warning', () => {
    const down = buildPulse(base({ health: { redis: 'down', database: 'ok', process: { heapMB: 300, uptimeSeconds: 1 } } }));
    expect(down.findings.find((f) => f.id === 'service_down_redis')!.tone).toBe('problem');
    const heavy = buildPulse(base({ health: { redis: 'ok', database: 'ok', process: { heapMB: 1300, uptimeSeconds: 1 } } }));
    expect(heavy.findings.find((f) => f.id === 'memory_high')).toMatchObject({ tone: 'early', params: { mb: 1300 } });
  });

  it('money: orders are a win, checkouts without payment a problem, past-due an early warning', () => {
    const rev = { paying: 3, trialing: 2, pastDue: 0, checkoutsStarted30d: 8, paidOrders30d: 4 };
    expect(ids(buildPulse(base({ revenue: rev })), 'win')).toContain('revenue_flowing');
    expect(ids(buildPulse(base({ revenue: { ...rev, paidOrders30d: 0 } })), 'problem')).toContain('checkouts_no_pay');
    expect(ids(buildPulse(base({ revenue: { ...rev, pastDue: 2 } })), 'early')).toContain('payment_failing');
  });

  it('unread user reports are an early warning', () => {
    expect(buildPulse(base({ unreadReports: 3 })).findings.find((f) => f.id === 'reports_waiting')).toMatchObject({ tone: 'early', params: { count: 3 } });
  });

  it('names the busiest day as a fun fact', () => {
    const p = buildPulse(base({ daily: dailyOf(60, (d) => (d === 2 ? 99 : 40)) }));
    expect(p.findings.find((f) => f.id === 'busiest_day')).toMatchObject({ tone: 'fact', params: { date: iso(2), games: 99 } });
  });

  it('orders problems first, then early warnings, wins and facts', () => {
    const p = buildPulse(base({ daily: dailyOf(60, (d) => (d < 7 ? 60 : 40)), unreadReports: 1, health: { redis: 'down', database: 'ok', process: { heapMB: 1, uptimeSeconds: 1 } } }));
    const tones = p.findings.map((f) => f.tone);
    expect(tones).toEqual([...tones].sort((a, b) => ['problem', 'early', 'win', 'fact'].indexOf(a) - ['problem', 'early', 'win', 'fact'].indexOf(b)));
  });
});

describe('buildPulse — today against yesterday (window 1)', () => {
  const dayView = (over: Partial<PulseInput> = {}) => base({ windowDays: 1, ...over });
  const lateEvening = Date.parse('2026-11-10T18:00:00Z');
  const earlyMorning = Date.parse('2026-11-10T03:00:00Z');
  const shaped = (todayGames: number, yesterdayGames: number) => dailyOf(60, (d) => (d === 0 ? todayGames : d === 1 ? yesterdayGames : 40));

  it('takes today as current and yesterday as prior, with a 7-day spark', () => {
    const p = buildPulse(dayView({ daily: shaped(30, 40) }));
    expect(p.games).toMatchObject({ current: 30, prior: 40 });
    expect(p.games.spark).toHaveLength(7);
  });

  it('judges today by its pace so a half-finished day is not a crash', () => {
    const p = buildPulse(dayView({ nowMs: lateEvening, daily: shaped(30, 40) }));
    expect(p.games.projected).toBe(40);
    expect(p.games.pct).toBe(0);
  });

  it('gives no verdict in the first hours of the day', () => {
    const p = buildPulse(dayView({ nowMs: earlyMorning, daily: shaped(2, 40) }));
    expect(p.games.projected).toBeNull();
    expect(p.games.pct).toBeNull();
  });

  it('does not call a drop or a surge on a partial day', () => {
    const p = buildPulse(dayView({ nowMs: lateEvening, daily: shaped(90, 20) }));
    expect(ids(p)).not.toContain('games_up');
    expect(ids(p)).not.toContain('games_down');
  });

  it('signups are today against yesterday from the daily rows', () => {
    const daily = dailyOf(60, () => 40).map((r, i, all) => ({ ...r, signups: i === all.length - 1 ? 3 : i === all.length - 2 ? 5 : 1 }));
    const p = buildPulse(dayView({ daily }));
    expect(p.signups).toMatchObject({ current: 3, prior: 5 });
    expect(p.signups!.spark).toHaveLength(7);
  });

  it('has no stickiness on a partial day', () => {
    const p = buildPulse(dayView());
    expect(p.stickinessPct).toBeNull();
    expect(ids(p)).not.toContain('low_stickiness');
  });

  it('keeps the week and month windows unprojected', () => {
    expect(buildPulse(base()).games.projected).toBeUndefined();
  });
});
