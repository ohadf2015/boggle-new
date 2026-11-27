export const TABLE_MAX_MEMBERS = 8;
export const TABLE_GOAL_PER_MEMBER = 400;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;

export function newTableCode(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function isTableCode(v: unknown): v is string {
  return typeof v === 'string' && CODE_RE.test(v);
}

export function groupGoal(memberCount: number): number {
  return Math.max(1, memberCount) * TABLE_GOAL_PER_MEMBER;
}

export interface MemberDayScore {
  userId: string;
  date: string;
  score: number;
}

export function bestPerMemberDay(
  rows: ReadonlyArray<{ player_id: string; puzzle_date: string; efficiency_score: number | null }>,
): MemberDayScore[] {
  const best = new Map<string, MemberDayScore>();
  for (const r of rows) {
    const key = `${r.player_id}|${r.puzzle_date}`;
    const score = Number(r.efficiency_score) || 0;
    const cur = best.get(key);
    if (!cur || score > cur.score) best.set(key, { userId: r.player_id, date: r.puzzle_date, score });
  }
  return [...best.values()];
}

export interface TableBoard {
  goal: number;
  nights: Array<{ date: string; total: number; lit: boolean }>;
  today: { date: string; total: number; playedIds: string[] };
  leaderboard: Array<{ userId: string; total: number; rank: number }>;
}

export function tableBoard(i: {
  trackDays: readonly string[];
  memberIds: readonly string[];
  scores: readonly MemberDayScore[];
  today: string;
}): TableBoard {
  const members = new Set(i.memberIds);
  const days = new Set([...i.trackDays, i.today]);
  const valid = i.scores.filter((s) => members.has(s.userId) && days.has(s.date));
  const goal = groupGoal(members.size);
  const sumOn = (date: string) => valid.filter((s) => s.date === date).reduce((a, s) => a + s.score, 0);
  const inTrack = valid.filter((s) => i.trackDays.includes(s.date));
  const totals = i.memberIds.map((userId) => ({
    userId,
    total: inTrack.filter((s) => s.userId === userId).reduce((a, s) => a + s.score, 0),
  }));
  totals.sort((a, b) => b.total - a.total);
  return {
    goal,
    nights: i.trackDays.map((date) => {
      const total = sumOn(date);
      return { date, total, lit: total >= goal };
    }),
    today: { date: i.today, total: sumOn(i.today), playedIds: valid.filter((s) => s.date === i.today).map((s) => s.userId) },
    leaderboard: totals.map((t, idx) => ({ ...t, rank: idx + 1 })),
  };
}
