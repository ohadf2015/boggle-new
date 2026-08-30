/**
 * Account-less ("guest") student identity via Supabase anonymous auth.
 *
 * A student joins a class WITHOUT an email/password account: we mint an
 * anonymous Supabase user (`signInAnonymously`) carrying the typed name in
 * metadata. The `handle_new_user` trigger reads `full_name`/`username` from
 * `raw_user_meta_data` and creates a real `profiles` row (display_name = name,
 * has_customized_profile = true) in the same insert. The anonymous user has a
 * valid `auth.uid()`, so every existing `student_id`-keyed table + RLS works
 * unchanged, and the @supabase/ssr session persists on-device.
 *
 * Persistence is DEVICE-BOUND: clearing cookies / a new device loses the
 * identity. On shared devices the student hub exposes a "start fresh" sign-out
 * so the next student is not mistaken for the previous one.
 *
 * NOTE: requires "Anonymous sign-ins" enabled on the Supabase project (Auth →
 * Providers). When disabled, `signInAnonymously` returns an error and this
 * degrades gracefully (caller surfaces it).
 */

import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface GuestSignInResult {
  user: User | null;
  error: string | null;
}

/** Slugify a free-text display name into a safe username (or '' if none). */
export function deriveGuestUsername(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20)
    .replace(/_+$/g, '');
}

/**
 * Sign in as an anonymous guest student carrying `name` as the profile name.
 * Does NOT join a classroom — caller joins with the returned user id.
 */
export async function signInAsGuestStudent(
  supabase: SupabaseClient,
  name: string,
): Promise<GuestSignInResult> {
  const displayName = name.trim().slice(0, 40);
  if (!displayName) return { user: null, error: 'NAME_REQUIRED' };

  const data: Record<string, string> = { full_name: displayName };
  const username = deriveGuestUsername(displayName);
  if (username) data.username = username;

  const { data: res, error } = await supabase.auth.signInAnonymously({ options: { data } });
  if (error) return { user: null, error: error.message };
  return { user: res?.user ?? null, error: null };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Wait until the trigger-created `profiles` row is readable. The join RPC needs
 * only the session, but the student hub guard checks `user && profile`; awaiting
 * the row here removes the post-sign-in redirect race (same class of bug as the
 * teacher-access admin guard race).
 */
export async function waitForProfile(
  supabase: SupabaseClient,
  userId: string,
  opts: { tries?: number; delayMs?: number; timeoutMs?: number } = {},
): Promise<boolean> {
  const tries = opts.tries ?? 10;
  const delayMs = opts.delayMs ?? 150;
  // Hard deadline. `joinClassroom` awaits this BEFORE it posts to the join
  // route, so an unsettled query here means the student presses JOIN and
  // nothing happens at all — no request, no toast, no error. That is exactly
  // what a first-time guest hit on 2026-08-30: the anonymous auth user was
  // created but no membership followed, and a second press worked. The join
  // route needs only the session, so this wait is a convenience and must
  // never be able to block the join.
  const timeoutMs = opts.timeoutMs ?? 3000;
  const deadline = Date.now() + timeoutMs;

  for (let i = 0; i < tries; i++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return false;

    const query = supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
    // A PostgREST call can stall through the post-sign-in token swap; race it
    // so a stuck request costs the deadline, not the whole join.
    const settled = await Promise.race([
      Promise.resolve(query).then((r) => r as { data: unknown } | null),
      sleep(remaining).then(() => null),
    ]);
    if (settled?.data) return true;
    if (settled === null) return false; // deadline won

    if (i < tries - 1 && delayMs > 0) {
      if (Date.now() + delayMs >= deadline) return false;
      await sleep(delayMs);
    }
  }
  return false;
}
