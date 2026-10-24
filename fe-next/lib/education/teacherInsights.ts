// Teacher Home "insight of the visit": facts derived only from rows the week card already reads.

import type { TeacherActivityRow } from './teacherWeekStats';

const DAY_MS = 86_400_000;
const MIN_GAMES_FOR_WEEKDAY = 4;
const QUIET_AFTER_DAYS = 5;

export type TeacherInsightId = 'momentum' | 'streak' | 'busiest' | 'topClass' | 'quiet' | 'reach' | 'month';

export interface TeacherInsight {
  id: TeacherInsightId;
  value: number | string;
  params?: Record<string, string | number>;
}

const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export function buildTeacherInsights(
  rows: readonly TeacherActivityRow[],
  classrooms: readonly { id: string; name?: string; member_count?: number | null }[],
  nowMs: number,
  locale: string,
): TeacherInsight[] {
  const games = new Map<string, { classroomId: string; at: number }>();
  for (const r of rows) {
    if (!r.game_code) continue;
    const key = `${r.classroom_id}:${r.game_code}`;
    const at = Date.parse(r.completed_at);
    const seen = games.get(key);
    if (!seen || at > seen.at) games.set(key, { classroomId: r.classroom_id, at });
  }
  if (games.size === 0) return [];

  const list = [...games.values()];
  const thisWeek = list.filter((g) => g.at >= nowMs - 7 * DAY_MS);
  const lastWeek = list.filter((g) => g.at < nowMs - 7 * DAY_MS && g.at >= nowMs - 14 * DAY_MS);
  const out: TeacherInsight[] = [];

  if (thisWeek.length > lastWeek.length && lastWeek.length > 0) {
    out.push({ id: 'momentum', value: thisWeek.length - lastWeek.length });
  }

  const days = new Set(list.map((g) => dayKey(g.at)));
  let streak = 0;
  for (let d = days.has(dayKey(nowMs)) ? 0 : 1; days.has(dayKey(nowMs - d * DAY_MS)); d += 1) streak += 1;
  if (streak >= 2) out.push({ id: 'streak', value: streak });

  if (list.length >= MIN_GAMES_FOR_WEEKDAY) {
    const perDay = new Array<number>(7).fill(0);
    for (const g of list) perDay[new Date(g.at).getDay()] += 1;
    const top = perDay.indexOf(Math.max(...perDay));
    // 2024-01-07 was a Sunday: a fixed anchor so index 0..6 maps to Sun..Sat.
    const label = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(new Date(2024, 0, 7 + top));
    out.push({ id: 'busiest', value: label });
  }

  const perClass = new Map<string, number>();
  for (const g of thisWeek) perClass.set(g.classroomId, (perClass.get(g.classroomId) ?? 0) + 1);
  if (perClass.size >= 2) {
    const [topId, count] = [...perClass.entries()].sort((a, b) => b[1] - a[1])[0];
    const name = classrooms.find((c) => c.id === topId)?.name;
    if (name) out.push({ id: 'topClass', value: count, params: { name } });
  }

  const idleDays = Math.floor((nowMs - Math.max(...list.map((g) => g.at))) / DAY_MS);
  if (idleDays >= QUIET_AFTER_DAYS) out.push({ id: 'quiet', value: idleDays });

  const students = classrooms.reduce((n, c) => n + (c.member_count ?? 0), 0);
  if (students > 0) out.push({ id: 'reach', value: students });
  out.push({ id: 'month', value: list.length });
  return out;
}
