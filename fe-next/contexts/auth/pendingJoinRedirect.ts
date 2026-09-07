/**
 * Decide whether a `SIGNED_IN` should send the student back to `/join/<code>`.
 *
 * `/join/[code]` stores `joinClassroomReturnCode` for every logged-out visitor,
 * so a student who chooses "sign in" over "play as a guest" is returned to the
 * join page once their account session exists. That feature is correct.
 *
 * What it must NOT catch is the anonymous session the JOIN button mints for
 * itself. `signInAsGuestStudent` emits the same `SIGNED_IN`, in the middle of a
 * join that is still running — it goes on to POST the enrolment and then
 * `router.push` the student into the live room. Redirecting there replaces the
 * document and throws that navigation away, so the tap ends with the form reset
 * and nothing said. The student's second tap works only because the code has
 * been consumed by then and no second anonymous session is minted.
 *
 * `shouldReloadAfterSignIn` — the other branch of the same `if` — already
 * refuses anonymous sessions for exactly this reason. This is the sibling guard
 * it was missing (recurring pitfall class 3: two paths out of one decision, one
 * of them updated).
 */
export interface PendingJoinRedirectContext {
  /** `joinClassroomReturnCode` as read from sessionStorage. */
  pendingJoinCode: string | null;
  /** True when the newly signed-in user is a Supabase anonymous (guest) user. */
  isAnonymous?: boolean;
}

export function shouldRedirectToPendingJoin(ctx: PendingJoinRedirectContext): boolean {
  if (!ctx.pendingJoinCode || !ctx.pendingJoinCode.trim()) return false;
  if (ctx.isAnonymous) return false;
  return true;
}
