import logger from '@/utils/logger';

/**
 * What a six-character code is, in ONE round trip.
 *
 * `lib/education/joinCodeVerdict` already asks `/api/education/join-code/resolve`
 * the narrower question "is it real". The join screen needs that AND "whose room
 * is it" at the same instant, and a class of thirty shares one school IP against
 * that route's rate limit — so asking twice per code is a cost paid for nothing.
 * This is the same contract, read off a single response.
 *
 * (A third reader, `lib/education/classroomPreview`, was orphaned when the old
 * join form was replaced and has been deleted.)
 *
 * `unverified` is the load-bearing value. The route answers `kind: 'unknown'`
 * for a genuine miss AND for a tripped rate limit, an errored roster RPC, or a
 * Redis outage — marking the recoverable ones `degraded`. Only a CONFIDENT
 * unknown may be shown to a student as a bad code. Collapsing the rest into
 * "wrong code" is recurring pitfall class 4 in its most expensive form: our
 * outage, rendered as their typo, to an entire school at once.
 */
export type JoinTargetVerdict = 'classroom' | 'game' | 'invalid' | 'unverified';

export interface JoinTarget {
  verdict: JoinTargetVerdict;
  /** Classroom name, or the teacher's name for a live game. Never invented. */
  label?: string;
  classroomId?: string;
  /** Present only for a live game — the room the student walks into. */
  gameCode?: string;
}

const CODE_RE = /^[A-Z0-9]{6}$/;

export async function resolveJoinTarget(code: string): Promise<JoinTarget> {
  const normalized = code.trim().toUpperCase();
  // A code that cannot possibly be one is invalid without spending a request.
  if (!CODE_RE.test(normalized)) return { verdict: 'invalid' };

  try {
    const res = await fetch(
      `/api/education/join-code/resolve?code=${encodeURIComponent(normalized)}`
    );
    if (!res.ok) return { verdict: 'unverified' };

    const data = (await res.json()) as
      | {
          kind?: string;
          degraded?: boolean;
          id?: string;
          name?: string;
          classroomId?: string;
          teacherName?: string;
          gameCode?: string;
        }
      | null;

    if (data?.kind === 'classroom') {
      return { verdict: 'classroom', label: data.name, classroomId: data.id };
    }
    if (data?.kind === 'game') {
      // A live game has no name worth showing; the teacher's name is what tells
      // a student they are in the right place.
      return {
        verdict: 'game',
        label: data.teacherName,
        classroomId: data.classroomId,
        gameCode: data.gameCode ?? normalized,
      };
    }
    if (data?.kind === 'unknown' && !data.degraded) return { verdict: 'invalid' };
    return { verdict: 'unverified' };
  } catch (err) {
    logger.error(
      'resolveJoinTarget failed:',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return { verdict: 'unverified' };
  }
}

export default resolveJoinTarget;
