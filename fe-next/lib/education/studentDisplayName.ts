/**
 * Resolve the name shown for a student in classroom multiplayer.
 *
 * The classroom hub reuses the generic MP "username" channel, which is
 * broadcast to opponents (lobby + leaderboard). Defaulting that to the raw
 * account email leaks contact info to classmates. Prefer the student's chosen
 * profile name; fall back to the email LOCAL-PART only (never the full address
 * with domain) so students stay distinguishable without exposing PII.
 */

interface ProfileNameFields {
  display_name?: string | null;
  username?: string | null;
}

interface UserEmailField {
  email?: string | null;
}

export function resolveStudentDisplayName(
  profile: ProfileNameFields | null | undefined,
  user: UserEmailField | null | undefined,
  fallback: string,
): string {
  const named = profile?.display_name?.trim() || profile?.username?.trim();
  if (named) return named;

  // Last resort before the generic fallback: the email local-part only.
  // Never return anything containing '@' — that would expose the domain and a
  // contactable address to other students.
  const local = user?.email?.split('@')[0]?.trim();
  if (local) return local;

  return fallback;
}
