/**
 * Grandfathering — existing users are treated as tier 'adult'; only NEW users
 * (post-cutoff signups / fresh installs) are asked for their age.
 *
 * Product decision 2026-07-13: interstitials + personalized ads require a KNOWN
 * adult (lib/families/adPolicy.ts), but 95% of the install base predates the
 * age gate and will never declare. The app targets 13+ (exited the Families
 * program 2026-06-08), so pre-existing users are declared adult wholesale and
 * the age gate applies to new users only.
 *
 * Two independent signals, both fail-closed (⇒ age gate, never ⇒ adult):
 *
 *  - Authed: profiles.created_at before the cutoff. No data is backfilled —
 *    birth_year stays NULL/honest; the upgrade happens at tier resolution.
 *  - Guest: decided ONCE at first bootstrap after this ships and persisted as
 *    '1' (prior-install evidence found) or '0' (fresh install). Deciding once
 *    closes the race where a fresh install plays a game and would then look
 *    like an existing user on its next launch.
 *
 * Only tier 'unknown' is ever upgraded — a declared child stays a child.
 */

/** Ship moment of the grandfather rule; installs/signups after this are gated. */
export const GRANDFATHER_CUTOFF_MS = Date.parse('2026-07-13T00:00:00.000Z');

/** '1' = existing install (adult), '0' = fresh install (gate applies). */
export const GUEST_GRANDFATHER_KEY = 'lc_age_grandfathered';

/**
 * Long-lived keys a pre-existing guest reliably has. Any one is sufficient.
 * All are written on/soon after first play — none exist on a brand-new install
 * at bootstrap time (which runs before any game can end).
 */
const PRIOR_INSTALL_EVIDENCE_KEYS = [
  'lc_first_played_modes_v1', // written on first play of any mode
  'lexiclash_coins', // guest coin balance
  'lexiclash_coins_history', // coin transaction log
  'boggle_language_explicit', // user explicitly picked a language
] as const;

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function guestGrandfathered(): boolean {
  const store = storage();
  if (!store) return false; // fail closed — worst case the user gets asked
  try {
    const decided = store.getItem(GUEST_GRANDFATHER_KEY);
    if (decided != null) return decided === '1';
    const existing = PRIOR_INSTALL_EVIDENCE_KEYS.some((k) => store.getItem(k) != null);
    store.setItem(GUEST_GRANDFATHER_KEY, existing ? '1' : '0');
    return existing;
  } catch {
    return false;
  }
}

/**
 * Pure cutoff check for an authed profile's created_at — shared by the client
 * hook and the server socket/API resolvers so both sides grandfather the same
 * accounts. Fail-closed on missing/unparsable dates.
 */
export function isGrandfatheredCreatedAt(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  return Number.isFinite(created) && created < GRANDFATHER_CUTOFF_MS;
}

/**
 * Whether an age-undeclared user should be treated as a known adult.
 * Callers apply this ONLY when the computed tier is 'unknown'.
 */
export function resolveGrandfatheredAdult(args: {
  isAuthenticated: boolean;
  profileCreatedAt?: string | null;
}): boolean {
  if (args.isAuthenticated) return isGrandfatheredCreatedAt(args.profileCreatedAt);
  return guestGrandfathered();
}
