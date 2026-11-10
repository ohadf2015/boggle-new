/**
 * The admin Overview's brain: turns the daily activity series, weekly signups, revenue,
 * health and the notification feed into trend tiles and a ranked list of findings
 * (what is working, what is not, early warnings, fun facts). Pure; thresholds are
 * constants here, sentences live in the UI keyed by finding id.
 */

import { DAY_MS } from './eduMetrics';
import { createFindings, type Finding } from './findings';
import { dayPace, momentum, pctChange, sum, trailingZeros } from './seriesStats';

/** 1 = today so far against yesterday. */
export type PulseWindow = 1 | 7 | 30;

export interface DailyPoint {
  date: string;
  /** Games by signed-in players, by guests, and both. */
  games: number;
  guestGames: number;
  totalGames: number;
  totalUniquePlayers: number;
  /** New registered users that day (test accounts excluded). */
  signups?: number;
}

export interface GrowthWeek {
  /** Monday of the week, YYYY-MM-DD. The newest week is usually still in progress. */
  week: string;
  signups: number;
  total: number;
}

export interface PulseInput {
  nowMs: number;
  windowDays: PulseWindow;
  /** Up to 2x the window of daily rows; days with no row count as zero. */
  daily: DailyPoint[];
  growth: GrowthWeek[];
  stats: { activity: { uniquePlayersMonth: number } } | null;
  revenue: { paying: number; trialing: number; pastDue: number; checkoutsStarted30d: number; paidOrders30d: number } | null;
  health: { redis: 'ok' | 'down'; database: 'ok' | 'down'; process: { heapMB: number } } | null;
  unreadReports: number;
}

export interface PulseTile {
  current: number;
  prior: number;
  pct: number | null;
  /** One value per day (or per week for signups), oldest first. */
  spark: number[];
  /** Window 1 only: today's expected total at its current pace; null in the first hours. */
  projected?: number | null;
}

export interface Pulse {
  games: PulseTile;
  players: PulseTile;
  signups: PulseTile | null;
  /** Percent of games played by signed-in players. */
  signedInShare: number | null;
  /** Average daily players over the monthly unique players, in percent. */
  stickinessPct: number | null;
  findings: Finding[];
}

const SURGE_PCT = 20;
const SIGNUP_SWING_PCT = 25;
const MIN_GAMES_TO_JUDGE = 20;
const MIN_SIGNUPS_TO_JUDGE = 5;
const MIN_PLAYERS_TO_JUDGE = 5;
const GUEST_HEAVY_SHARE = 15;
const MIN_GAMES_FOR_SHARE = 50;
const QUIET_DAYS_ALERT = 2;
const MOMENTUM_DROP_PCT = 50;
const STICKY_PCT = 20;
const THIN_STICKY_PCT = 8;
const HEAP_WARN_MB = 1200;
const MIN_CHECKOUTS_TO_JUDGE = 3;
const SPARK_WEEKS = 8;
const SPARK_DAYS = 7;

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** One value per day for the last `days` days ending today, oldest first; gaps are zero. */
function series(daily: DailyPoint[], nowMs: number, days: number, pick: (p: DailyPoint) => number): { dates: string[]; values: number[] } {
  const byDate = new Map(daily.map((p) => [p.date, p]));
  const dates = Array.from({ length: days }, (_, i) => dayKey(nowMs - (days - 1 - i) * DAY_MS));
  return { dates, values: dates.map((d) => { const row = byDate.get(d); return row ? pick(row) : 0; }) };
}

function dayTile(daily: DailyPoint[], nowMs: number, w: number, pick: (p: DailyPoint) => number, mean = false): PulseTile & { dates: string[] } {
  const n = Math.max(w * 2, SPARK_DAYS);
  const { dates, values } = series(daily, nowMs, n, pick);
  const agg = (xs: number[]) => (mean ? Math.round(sum(xs) / w) : sum(xs));
  const current = agg(values.slice(n - w));
  const prior = agg(values.slice(n - 2 * w, n - w));
  const keep = Math.max(w, SPARK_DAYS);
  const tile = { current, prior, pct: pctChange(current, prior), spark: values.slice(-keep), dates: dates.slice(-keep) };
  if (w !== 1) return tile;
  return { ...tile, ...dayPace(current, prior, nowMs) };
}

function signupTile(growth: GrowthWeek[], daily: DailyPoint[], nowMs: number, windowDays: PulseWindow): PulseTile | null {
  if (windowDays === 1) {
    if (!daily.some((p) => p.signups !== undefined)) return null;
    const t = dayTile(daily, nowMs, 1, (p) => p.signups ?? 0);
    return { current: t.current, prior: t.prior, pct: t.pct, spark: t.spark, projected: t.projected };
  }
  const weeks = windowDays === 7 ? 1 : 4;
  const sorted = [...growth].sort((a, b) => a.week.localeCompare(b.week));
  const last = sorted[sorted.length - 1];
  const complete = last && Date.parse(last.week) > nowMs - 7 * DAY_MS ? sorted.slice(0, -1) : sorted;
  if (complete.length < weeks * 2) return null;
  const counts = complete.map((g) => g.signups);
  const current = sum(counts.slice(-weeks));
  const prior = sum(counts.slice(-weeks * 2, -weeks));
  return { current, prior, pct: pctChange(current, prior), spark: counts.slice(-SPARK_WEEKS) };
}

export function buildPulse(input: PulseInput): Pulse {
  const { nowMs, windowDays: w, daily, stats, revenue, health } = input;
  const games = dayTile(daily, nowMs, w, (p) => p.totalGames);
  const players = dayTile(daily, nowMs, w, (p) => p.totalUniquePlayers, true);
  const signups = signupTile(input.growth, daily, nowMs, w);

  const partialDayView = w === 1;
  const signedIn = sum(series(daily, nowMs, w, (p) => p.games).values);
  const signedInShare = games.current > 0 ? Math.round((signedIn / games.current) * 100) : null;
  const monthly = stats?.activity.uniquePlayersMonth ?? 0;
  const stickinessPct = !partialDayView && stats && monthly > 0 ? Math.round((players.current / monthly) * 100) : null;

  const { add, done } = createFindings();
  const { current: g, prior: gp, pct: gPct } = games;
  // A partial day cannot be called up or down; the tiles show its pace instead.
  const partialDay = partialDayView;
  const periodGames = partialDay ? sum(games.spark) : g;
  if (!partialDay) {
  if (gPct !== null && gPct >= SURGE_PCT && g >= MIN_GAMES_TO_JUDGE) add('games_up', 'win', { pct: gPct, current: g });
  if (gPct !== null && gPct <= -SURGE_PCT && gp >= MIN_GAMES_TO_JUDGE) add('games_down', 'problem', { pct: Math.abs(gPct), current: g, prior: gp });
  const { pct: pPct, prior: pp } = players;
  if (pPct !== null && pPct >= SURGE_PCT && players.current >= MIN_PLAYERS_TO_JUDGE) add('players_up', 'win', { pct: pPct, current: players.current });
  if (pPct !== null && pPct <= -SURGE_PCT && pp >= MIN_PLAYERS_TO_JUDGE) add('players_down', 'problem', { pct: Math.abs(pPct), current: players.current, prior: pp });
  if (signups?.pct != null) {
    if (signups.pct >= SIGNUP_SWING_PCT && signups.current >= MIN_SIGNUPS_TO_JUDGE) add('signups_up', 'win', { pct: signups.pct, current: signups.current });
    if (signups.pct <= -SIGNUP_SWING_PCT && signups.prior >= MIN_SIGNUPS_TO_JUDGE) add('signups_down', 'problem', { pct: Math.abs(signups.pct), current: signups.current, prior: signups.prior });
  }
  }

  if (signedInShare !== null && signedInShare <= GUEST_HEAVY_SHARE && periodGames >= MIN_GAMES_FOR_SHARE) add('guest_heavy', 'early', { pct: signedInShare });
  const stopped = periodGames >= MIN_GAMES_TO_JUDGE && trailingZeros(games.spark) >= QUIET_DAYS_ALERT;
  if (stopped) add('activity_stopped', 'early', { days: trailingZeros(games.spark) });
  else {
    const m = momentum(games.spark);
    if (m !== null && m <= -MOMENTUM_DROP_PCT) add('momentum_drop', 'early', { pct: Math.abs(m) });
  }
  if (stickinessPct !== null) {
    if (stickinessPct >= STICKY_PCT) add('sticky', 'win', { pct: stickinessPct });
    if (stickinessPct < THIN_STICKY_PCT) add('low_stickiness', 'early', { pct: stickinessPct });
  }

  if (health?.redis === 'down') add('service_down_redis', 'problem');
  if (health?.database === 'down') add('service_down_database', 'problem');
  if (health && health.process.heapMB >= HEAP_WARN_MB) add('memory_high', 'early', { mb: Math.round(health.process.heapMB) });

  if (revenue) {
    if (revenue.paidOrders30d > 0) add('revenue_flowing', 'win', { orders: revenue.paidOrders30d, paying: revenue.paying });
    if (revenue.paidOrders30d === 0 && revenue.checkoutsStarted30d >= MIN_CHECKOUTS_TO_JUDGE) add('checkouts_no_pay', 'problem', { count: revenue.checkoutsStarted30d });
    if (revenue.pastDue > 0) add('payment_failing', 'early', { count: revenue.pastDue });
  }
  if (input.unreadReports > 0) add('reports_waiting', 'early', { count: input.unreadReports });

  const peak = Math.max(...games.spark);
  if (peak > 0) add('busiest_day', 'fact', { date: games.dates[games.spark.indexOf(peak)], games: peak });

  return { games, players, signups, signedInShare, stickinessPct, findings: done() };
}
