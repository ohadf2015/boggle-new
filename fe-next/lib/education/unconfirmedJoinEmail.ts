/**
 * A typo'd school address never confirms, so the student cannot sign back in
 * and the classroom stays empty. Correction is allowed only for a one- or
 * two-character edit of an address that is still unconfirmed — anything wider
 * is a new signup, not a fix, and a confirmed account is never rewritten.
 */

export const JOIN_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isPlausibleEmail(raw: string): boolean {
  const email = normalizeEmail(raw);
  return email.length > 0 && email.length <= 254 && EMAIL_RE.test(email);
}

/** Classic Levenshtein. Addresses are short; the matrix stays tiny. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

export type CorrectionDecision = 'invalid' | 'same' | 'not_a_typo' | 'ok';

/** True when `next` is a 1- or 2-character fix of `current`. Checked before any lookup. */
export function correctionDecision(current: string, next: string): CorrectionDecision {
  if (!isPlausibleEmail(current) || !isPlausibleEmail(next)) return 'invalid';
  const from = normalizeEmail(current);
  const to = normalizeEmail(next);
  if (from === to) return 'same';
  const distance = editDistance(from, to);
  if (distance < 1 || distance > 2) return 'not_a_typo';
  return 'ok';
}

export interface AuthEmailRow {
  id: string;
  emailConfirmedAt: string | null;
}

export type CorrectionApply = 'invalid' | 'not_a_typo' | 'noop' | 'correct' | 'lookup_failed';

/**
 * What the join recovery route should do. A missing or already-confirmed
 * account is a noop so the response cannot be used to enumerate accounts.
 */
export function correctionApply(
  decision: CorrectionDecision,
  user: AuthEmailRow | null,
  lookupFailed = false,
): CorrectionApply {
  if (decision === 'invalid' || decision === 'same') return 'invalid';
  if (decision === 'not_a_typo') return 'not_a_typo';
  if (lookupFailed) return 'lookup_failed';
  if (!user || user.emailConfirmedAt) return 'noop';
  return 'correct';
}

export function signedInNeedsRecovery(user: {
  email?: string | null;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean;
} | null): boolean {
  if (!user || user.is_anonymous || !user.email) return false;
  return !user.email_confirmed_at;
}

export function joinConfirmRedirect(origin: string, locale: string | undefined, joinCode: string | undefined): string {
  const loc = (JOIN_LOCALES as readonly string[]).includes(locale ?? '') ? locale : 'en';
  const base = origin.replace(/\/+$/, '');
  const code = joinCode && /^[A-Z0-9]{6}$/.test(joinCode) ? joinCode : '';
  return code ? `${base}/${loc}/join/${code}` : `${base}/${loc}/auth/callback`;
}
