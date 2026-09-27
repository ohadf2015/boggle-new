import logger from '@/utils/logger';

/**
 * What a six-character code is worth committing to, BEFORE we commit to it.
 *
 * `unverified` is the important one and the reason this is not just
 * `lookupClassroomPreview() === null`. `/api/education/join-code/resolve`
 * answers `kind: 'unknown'` for four different situations — a genuine miss, a
 * tripped rate limit, a roster RPC that errored, a roster lookup that threw —
 * and only the first means "wrong code". The route now marks the other three
 * `degraded: true`; this collapses them to `unverified`, which callers must
 * treat as "carry on and let the server decide", never as a rejection.
 *
 * Getting that wrong is recurring pitfall class 4 in its most expensive form: a
 * Supabase hiccup would tell an entire school their classroom code was invalid,
 * and the answer would look exactly like the truthful one.
 */
export type JoinCodeVerdict = 'classroom' | 'game' | 'invalid' | 'unverified';

const CODE_RE = /^[A-Z0-9]{6}$/;

/**
 * Ask what a code is. Only `'invalid'` is safe to stop a join on.
 *
 * Cheap on purpose — one GET, no auth, no side effects — because the caller
 * runs it in parallel with the nickname precheck to keep a guest join inside
 * one round-trip's worth of waiting.
 */
export async function resolveJoinCodeVerdict(code: string): Promise<JoinCodeVerdict> {
  const normalized = code.trim().toUpperCase();
  // A code that cannot possibly be one is invalid without spending a request.
  if (!CODE_RE.test(normalized)) return 'invalid';

  try {
    const res = await fetch(
      `/api/education/join-code/resolve?code=${encodeURIComponent(normalized)}`
    );
    if (!res.ok) return 'unverified';

    const data = (await res.json()) as { kind?: string; degraded?: boolean } | null;
    if (data?.kind === 'classroom' || data?.kind === 'game') return data.kind;
    // Confident unknown — a typo, or a game the teacher has ended. Both are
    // "we didn't recognize that", which is the whole point of the Kahoot bar.
    if (data?.kind === 'unknown' && !data.degraded) return 'invalid';
    return 'unverified';
  } catch (err) {
    logger.error(
      'resolveJoinCodeVerdict failed:',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return 'unverified';
  }
}

export default resolveJoinCodeVerdict;
