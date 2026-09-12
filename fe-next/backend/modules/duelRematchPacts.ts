/**
 * REMATCH is an agreement, not a button.
 *
 * Round 3's `duel:rematch` INSERTed a duel on every tap. Two students on two
 * podiums both tapped REMATCH, two duel rows existed, each client navigated to
 * its own room id, and both sat on "Waiting for opponent…" until the server's
 * timer completed two empty duels. No error, no recovery — recurring-pitfalls
 * Class 4 wearing a Class 3 hat (two paths to "we play again" that never met).
 *
 * A pact fixes the shape: the first tap OFFERS, the second tap MATCHES, and the
 * match — not the tap — creates exactly ONE duel that both students are sent
 * to. The registry is deliberately in-memory and synchronous: the handler must
 * decide offer-vs-match BEFORE its first `await`, or two simultaneous taps
 * interleave and we are back to two duels.
 *
 * Offers expire. A student who taps REMATCH and gets no answer must reach a
 * definite outcome (invite sent to their lobby), never an open-ended wait.
 */

/** How long an unanswered rematch offer stays live. */
export const REMATCH_PACT_TTL_MS = 45_000;

export interface RematchPact {
  /** Who asked first — they become the challenger of the new duel. */
  requesterId: string;
  /** The duel they just finished: carries classroom_id + duel_type forward. */
  duelId: string;
  createdAt: number;
}

export type OfferRematchResult =
  | { status: 'offered' }
  /** Same student tapped again — the offer stands, nothing new happens. */
  | { status: 'waiting' }
  | {
      status: 'matched';
      challengerId: string;
      opponentId: string;
      /** The finished duel the first tapper came from. */
      sourceDuelId: string;
    };

const pacts = new Map<string, RematchPact>();

/** One key per (pair, lesson), whichever order the two ids arrive in. */
export function rematchPactKey(userA: string, userB: string, lessonId: string): string {
  const [first, second] = [userA, userB].sort();
  return `${first}|${second}|${lessonId}`;
}

function live(key: string, now: number): RematchPact | null {
  const pact = pacts.get(key);
  if (!pact) return null;
  if (now - pact.createdAt > REMATCH_PACT_TTL_MS) {
    pacts.delete(key);
    return null;
  }
  return pact;
}

export interface OfferRematchArgs {
  key: string;
  userId: string;
  /** The duel this student is rematching FROM. */
  duelId: string;
  now?: number;
}

/**
 * Synchronous by contract. Call it as the first statement of the handler, then
 * await whatever the outcome needs — never the other way round.
 */
export function offerRematch({
  key,
  userId,
  duelId,
  now = Date.now(),
}: OfferRematchArgs): OfferRematchResult {
  const existing = live(key, now);

  if (existing && existing.requesterId !== userId) {
    // Consume it: the pact is spent by the match, so a later tap opens a fresh
    // offer instead of creating a second duel (Class 2 — stale state surviving
    // a round boundary).
    pacts.delete(key);
    return {
      status: 'matched',
      challengerId: existing.requesterId,
      opponentId: userId,
      sourceDuelId: existing.duelId,
    };
  }

  if (existing) return { status: 'waiting' };

  pacts.set(key, { requesterId: userId, duelId, createdAt: now });
  return { status: 'offered' };
}

/** Read a live offer without consuming it. */
export function peekRematchPact(key: string, now: number = Date.now()): RematchPact | null {
  return live(key, now);
}

/**
 * Withdraw an offer. Only its own requester can — otherwise the student who was
 * ASKED could silently cancel the invitation they were about to accept.
 * Returns whether anything was withdrawn.
 */
export function cancelRematch(key: string, userId: string): boolean {
  const pact = pacts.get(key);
  if (!pact || pact.requesterId !== userId) return false;
  pacts.delete(key);
  return true;
}

/** Test-only reset; the map is process-global. */
export function clearRematchPacts(): void {
  pacts.clear();
}
