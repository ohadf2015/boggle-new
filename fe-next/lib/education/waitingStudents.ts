/**
 * A class whose students joined and are still waiting for a round.
 * Pure: the teacher HQ asks this before it paints "N students are waiting".
 */

export const WAITING_DELAY_MS = 5 * 60 * 1000;
/** A class period, not a leftover from last week. */
export const WAITING_LOOKBACK_MS = 90 * 60 * 1000;

export interface WaitingJoin {
  classroomId: string;
  joinedAt: string;
}

export interface WaitingRound {
  classroomId: string;
  /** When a round started, or completed if start was not stored. */
  at: string;
}

export interface WaitingNudge {
  classroomId: string;
  count: number;
  waitingMs: number;
}

function ms(iso: string): number {
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : Number.NaN;
}

/**
 * Students who joined inside the lookback, after the class's last round, and
 * have been sitting at least `delayMs` with no live room. Prefers the class
 * the teacher is looking at when that one qualifies.
 */
export function waitingNudge(input: {
  joins: readonly WaitingJoin[];
  rounds: readonly WaitingRound[];
  liveClassroomIds?: ReadonlySet<string>;
  now: number;
  delayMs?: number;
  lookbackMs?: number;
  preferId?: string;
}): WaitingNudge | null {
  const delay = input.delayMs ?? WAITING_DELAY_MS;
  const lookback = input.lookbackMs ?? WAITING_LOOKBACK_MS;
  const cutoff = input.now - lookback;
  const live = input.liveClassroomIds ?? new Set<string>();

  const byClass = new Map<string, number[]>();
  for (const join of input.joins) {
    const at = ms(join.joinedAt);
    if (!Number.isFinite(at) || at < cutoff || at > input.now) continue;
    const list = byClass.get(join.classroomId) ?? [];
    list.push(at);
    byClass.set(join.classroomId, list);
  }

  const lastRound = new Map<string, number>();
  for (const round of input.rounds) {
    const at = ms(round.at);
    if (!Number.isFinite(at)) continue;
    const prev = lastRound.get(round.classroomId) ?? Number.NEGATIVE_INFINITY;
    if (at > prev) lastRound.set(round.classroomId, at);
  }

  const candidates: WaitingNudge[] = [];
  for (const [classroomId, times] of byClass) {
    if (live.has(classroomId)) continue;
    const after = lastRound.get(classroomId) ?? Number.NEGATIVE_INFINITY;
    const waiting = times.filter((at) => at > after);
    if (waiting.length === 0) continue;
    const earliest = Math.min(...waiting);
    const waitingMs = input.now - earliest;
    if (waitingMs < delay) continue;
    candidates.push({ classroomId, count: waiting.length, waitingMs });
  }
  if (candidates.length === 0) return null;
  if (input.preferId) {
    const preferred = candidates.find((c) => c.classroomId === input.preferId);
    if (preferred) return preferred;
  }
  candidates.sort((a, b) => b.count - a.count || b.waitingMs - a.waitingMs);
  return candidates[0];
}

interface QueryResult {
  data: Array<Record<string, unknown>> | null;
  error: { message: string } | null;
}

interface WaitingQuery {
  select: (cols: string) => WaitingQuery;
  in: (col: string, vals: readonly string[]) => WaitingQuery;
  gte: (col: string, val: string) => WaitingQuery;
  eq: (col: string, val: boolean) => WaitingQuery;
  limit: (n: number) => WaitingQuery & PromiseLike<QueryResult>;
}

export interface WaitingClient {
  from: (table: string) => WaitingQuery;
}

export interface WaitingInputs {
  joins: WaitingJoin[];
  rounds: WaitingRound[];
}

const EMPTY: WaitingInputs = { joins: [], rounds: [] };

/** Recent memberships and rounds for the teacher's classes. Throws on a failed read. */
export async function fetchWaitingInputs(
  client: WaitingClient | null,
  classroomIds: readonly string[],
  now: number,
): Promise<WaitingInputs> {
  if (!client || classroomIds.length === 0) return EMPTY;
  const since = new Date(now - WAITING_LOOKBACK_MS).toISOString();
  const ids = classroomIds.slice(0, 12);
  const [members, rounds] = await Promise.all([
    client
      .from('classroom_memberships')
      .select('classroom_id, joined_at, is_rehearsal')
      .in('classroom_id', ids)
      .eq('is_rehearsal', false)
      .gte('joined_at', since)
      .limit(500),
    client
      .from('classroom_rounds')
      .select('classroom_id, started_at, completed_at')
      .in('classroom_id', ids)
      .gte('completed_at', since)
      .limit(200),
  ]);
  if (members.error) throw new Error(members.error.message);
  if (rounds.error) throw new Error(rounds.error.message);

  const joins: WaitingJoin[] = [];
  for (const row of members.data ?? []) {
    if (row.is_rehearsal === true) continue;
    if (typeof row.classroom_id !== 'string' || typeof row.joined_at !== 'string') continue;
    joins.push({ classroomId: row.classroom_id, joinedAt: row.joined_at });
  }
  const roundRows: WaitingRound[] = [];
  for (const row of rounds.data ?? []) {
    const at = typeof row.started_at === 'string' ? row.started_at : row.completed_at;
    if (typeof row.classroom_id !== 'string' || typeof at !== 'string') continue;
    roundRows.push({ classroomId: row.classroom_id, at });
  }
  return { joins, rounds: roundRows };
}
