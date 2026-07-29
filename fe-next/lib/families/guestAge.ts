/**
 * Guest (unauthenticated) age + safety-acknowledgement persistence.
 *
 * Authenticated users store their age server-side (profiles.birth_year). Guests
 * have no account, so their self-declared birth year lives in localStorage and
 * is replayed to the server via the socket handshake (declaredBirthYear). Policy
 * permits self-declaration as a valid "adult action".
 */

const GUEST_BIRTH_YEAR_KEY = 'lc_guest_birth_year';
const SAFETY_ACK_KEY = 'lc_safety_ack';

/**
 * Fired on the same tab when the guest birth year changes. Same-tab
 * localStorage writes do NOT emit a `storage` event, so any hook instance other
 * than the one that wrote (e.g. AdMobProvider's, which gates ads) would never
 * learn of a mid-session age declaration. Components re-read on this event so a
 * guest who declares under-13 stops seeing ads immediately, no reload.
 */
export const GUEST_AGE_CHANGED_EVENT = 'lc:guest-age-changed';

function hasStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function readGuestBirthYear(): number | null {
  if (!hasStorage()) return null;
  const raw = window.localStorage.getItem(GUEST_BIRTH_YEAR_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

export function writeGuestBirthYear(year: number): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(GUEST_BIRTH_YEAR_KEY, String(year));
  // Notify other hook instances on this tab (storage event only fires cross-tab).
  window.dispatchEvent(new Event(GUEST_AGE_CHANGED_EVENT));
}

export function readSafetyAck(): boolean {
  if (!hasStorage()) return false;
  return window.localStorage.getItem(SAFETY_ACK_KEY) === '1';
}

export function writeSafetyAck(): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(SAFETY_ACK_KEY, '1');
}
