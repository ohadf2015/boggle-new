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
}

export function readSafetyAck(): boolean {
  if (!hasStorage()) return false;
  return window.localStorage.getItem(SAFETY_ACK_KEY) === '1';
}

export function writeSafetyAck(): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(SAFETY_ACK_KEY, '1');
}
