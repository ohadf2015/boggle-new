/**
 * Decide whether a guest → authed transition is a countable signup
 * (t_b6131f7d).
 *
 * Supabase anonymous sessions (`signInAnonymously`, minted by
 * lib/education/guestStudent.ts for classroom students) produce a real
 * auth.users row AND a profiles row, so they pass every gate the signup
 * trackers use (user && profile, account < 1h old). Before this guard, an
 * anonymous classroom join fired signup_completed, persisted first-touch
 * attribution and armed the signup-first-game experiment exactly like a real
 * registration — Growth Radar counted 88 signups vs 49 real accounts in a
 * week, with the excess sitting on classroom days.
 *
 * An anonymous session is NOT a signup. The whole anonymous cohort is skipped
 * here; if an anonymous → permanent upgrade flow is ever added (none exists
 * today — no linkIdentity / email-claim call site in the repo), the upgrade is
 * where its signup must be counted, once.
 */
export function isCountableSignupUser(
  user: { is_anonymous?: boolean | null } | null | undefined,
): boolean {
  if (!user) return false;
  return user.is_anonymous !== true;
}
