/** True when a Supabase auth cookie (chunked or whole) is present. Presence only; never trusted for access. */
export function hasSupabaseSessionCookie(names: readonly string[]): boolean {
  return names.some((name) => /^sb-[a-z0-9]+-auth-token(\.\d+)?$/.test(name));
}
