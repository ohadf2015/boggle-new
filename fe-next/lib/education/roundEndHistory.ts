/**
 * The session's memory of the rounds already played.
 *
 * A score is a number. "+40 vs last round" is a story, and a fifteen-year-old
 * plays the next round for the story. This module is that arithmetic — delta,
 * personal best, placing climb, and the class's sweep streak — kept pure so it
 * can be argued about without a browser and reused by the phone, the teacher's
 * laptop and the projector without three copies drifting apart (Pitfall
 * Class 3: one computation, many renderers).
 *
 * Round 1 deliberately yields NOTHING. No delta, no best, no streak chip. A
 * first round has nothing to be bigger than, and a teacher reloading the
 * projector must see an honest blank rather than a confident wrong number.
 */

/** One finished round, as this device saw it. */
export interface SessionRound {
  /** This client's own score that round (the class's total on the projector). */
  score: number;
  /** Placing, 1 = won. `0` when the client had no placing (a spectator). */
  rank: number;
  /** How many humans were ranked — a 2nd of 20 is not a 2nd of 2. */
  players: number;
  /** The class found every lesson word that round. */
  sweep: boolean;
  /** Epoch ms, for ordering only. */
  at: number;
}

/** What the round just played means next to the ones before it. */
export interface RoundMomentum {
  /** 2 for the second round of the session; there is no momentum for round 1. */
  roundNumber: number;
  /** Points above (or below) the round immediately before this one. */
  delta: number;
  /** Places climbed since the previous round; negative is a slip. */
  rankDelta: number;
  /** Strictly better than every earlier round in this session. */
  personalBest: boolean;
}

/**
 * A session is a browser tab, so the cap only exists to stop a pathological
 * write loop from filling sessionStorage. Twelve rounds is far past what a
 * 45-minute lesson runs.
 */
export const MAX_SESSION_ROUNDS = 12;

/**
 * One key per teacher + lesson set, so switching lessons starts a fresh story
 * instead of comparing a spelling round to a synonyms round. Sorted, because
 * the server is not required to hand the lesson ids back in a stable order and
 * a re-ordered list is the SAME session, not a new one.
 */
export function sessionKeyFor(summary: { teacherName: string; lessonIds: string[] }): string {
  const lessons = [...summary.lessonIds].sort().join('|');
  return `lexiclash.edu.round-history.${summary.teacherName}::${lessons}`;
}

/** Appends a round, oldest-first, trimming the head past the cap. */
export function appendRound(history: SessionRound[], round: SessionRound): SessionRound[] {
  const next = [...history, round];
  return next.length > MAX_SESSION_ROUNDS ? next.slice(next.length - MAX_SESSION_ROUNDS) : next;
}

/**
 * The round just played, measured against the session so far.
 *
 * `history` must be the rounds BEFORE this one — never the list this round has
 * already been appended to, which would compare a round to itself and print
 * "+0 vs last round" on every screen in the room.
 */
export function momentumFor(
  history: SessionRound[],
  current: Pick<SessionRound, 'score' | 'rank'>
): RoundMomentum | null {
  if (history.length === 0) return null;
  const previous = history[history.length - 1];
  const best = Math.max(...history.map((r) => r.score));
  // A placing climb only means something when both rounds actually placed the
  // player; rank 0 is "not ranked", not "last".
  const rankDelta =
    previous.rank > 0 && current.rank > 0 ? previous.rank - current.rank : 0;

  return {
    roundNumber: history.length + 1,
    delta: current.score - previous.score,
    rankDelta,
    personalBest: current.score > best,
  };
}

/**
 * How many rounds in a row the class has ended on 100%. Counted from the END of
 * the session — a sweep three rounds ago that was then broken is not a streak.
 */
export function sweepStreak(history: SessionRound[]): number {
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (!history[i].sweep) break;
    streak += 1;
  }
  return streak;
}

export default momentumFor;
