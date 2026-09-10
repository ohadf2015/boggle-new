/**
 * Everything a logged-out student's join can be refused for BEFORE an account
 * exists.
 *
 * `signInAnonymously` mints a real, permanent `auth.users` row that cannot be
 * un-created, and the join path then waits on the `handle_new_user` trigger
 * before it can even post. So a typo — or the code of a game the teacher has
 * just ended — used to cost a student a spinner and a junk account, only to be
 * told the code was wrong. Kahoot rejects an unrecognised PIN instantly and
 * creates nothing; this module is what makes that possible here.
 *
 * Two checks, run in PARALLEL so the happy path still costs one round-trip's
 * worth of waiting rather than two:
 *
 *   1. The CODE, via `/api/education/join-code/resolve`. Only a CONFIDENT
 *      `invalid` refuses. `unverified` — rate limit, roster RPC error, offline —
 *      carries on and lets the server route decide, because failing closed on
 *      our own outage would tell a whole school their classroom code was wrong
 *      (recurring pitfall class 4, wearing the mask of a truthful answer).
 *   2. The NICKNAME, scoped to that classroom's roster. Same fail-open rule.
 *
 * Order of REPORTING is deliberate and is not the order of asking: a student
 * cannot act on "that nickname is taken" for a class they are not going to
 * reach, so a bad code is reported first even when both are wrong.
 *
 * Lives here rather than in `hooks/useClassroom.ts` because that file is past
 * the 500-line limit and may not grow — and because this is join policy, not
 * React.
 */

import { resolveJoinCodeVerdict } from '@/lib/education/joinCodeVerdict';

/** A refusal the caller can hand straight back as a `JoinClassroomResult`. */
export interface GuestJoinRefusal {
  code: 'INVALID_CODE' | 'NAME_TAKEN';
  /** For NAME_TAKEN: a nickname that is actually free, for one-tap acceptance. */
  suggestedName?: string;
  /** Log/fallback prose. Never rendered on its own — the caller localizes `code`. */
  error: string;
}

/**
 * Ask the server whether a guest nickname is free, and for a free variant.
 *
 * Fails OPEN on any transport problem: a check we could not perform must never
 * be the reason a student cannot join. Worst case they meet the original error;
 * blocking here would turn our outage into their locked door.
 */
export async function checkGuestNameAvailable(
  name: string,
  joinCode: string
): Promise<{ code?: 'NAME_TAKEN'; suggestedName?: string } | null> {
  try {
    const res = await fetch('/api/education/guest-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `joinCode` is not optional in practice. The route scopes its 409 to that
      // classroom's roster and fails OPEN without it — so omitting it does not
      // relax the check, it disables it entirely and silently.
      body: JSON.stringify({ name, joinCode }),
    });
    if (res.status !== 409) return null;
    const data = await res.json();
    return { code: 'NAME_TAKEN', suggestedName: data?.suggestedName };
  } catch {
    return null;
  }
}

/**
 * Run both pre-flight checks. Returns null when the student may proceed to
 * anonymous sign-in, or the refusal to hand back untouched.
 */
export async function runGuestJoinPreflight(
  joinCode: string,
  guestName: string
): Promise<GuestJoinRefusal | null> {
  const [codeVerdict, nameCheck] = await Promise.all([
    resolveJoinCodeVerdict(joinCode),
    checkGuestNameAvailable(guestName, joinCode),
  ]);

  if (codeVerdict === 'invalid') {
    return { code: 'INVALID_CODE', error: 'Invalid join code' };
  }
  if (nameCheck?.code === 'NAME_TAKEN') {
    return { code: 'NAME_TAKEN', suggestedName: nameCheck.suggestedName, error: 'NAME_TAKEN' };
  }
  return null;
}

export default runGuestJoinPreflight;
