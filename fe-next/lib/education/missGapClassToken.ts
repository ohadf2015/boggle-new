/**
 * Signed class token for a miss-gap homework link (`?k=`).
 *
 * The class key is guessable text, so the token is what proves a link came from
 * the teacher who owns that key. Minted only by the progress route for the
 * owning teacher; required by the complete route before any write.
 */
import { signPayload, verifyPayload } from '../adventure/play/attemptToken';
import { getParentReportSecret } from './parentReportToken';
import { normalizeMissGapClassKey, MAX_CLASS_TOKEN } from './missGapClassKey';

export { MAX_CLASS_TOKEN };

const DOMAIN = 'miss-gap-class';
const VERSION = 1;

interface MissGapClassTokenPayload {
  classKey: string;
  v: number;
}

/** Throws when the secret is not configured — callers log and omit the token. */
export function signMissGapClassToken(classKey: string): string {
  const payload: MissGapClassTokenPayload = {
    classKey: normalizeMissGapClassKey(classKey),
    v: VERSION,
  };
  return signPayload(payload, getParentReportSecret(), DOMAIN);
}

export function verifyMissGapClassToken(token: unknown, classKey: string): boolean {
  if (typeof token !== 'string' || !token || token.length > MAX_CLASS_TOKEN) return false;
  let secret: string;
  try {
    secret = getParentReportSecret();
  } catch {
    return false;
  }
  const payload = verifyPayload<MissGapClassTokenPayload>(token, secret, DOMAIN);
  return (
    !!payload &&
    payload.v === VERSION &&
    typeof payload.classKey === 'string' &&
    payload.classKey === normalizeMissGapClassKey(classKey)
  );
}

export type ClassTokenStatus = 'valid' | 'absent' | 'invalid';

/** `absent` is a link shared before tokens existed; `invalid` is a forgery or a tamper. */
export function classTokenStatus(token: unknown, classKey: string): ClassTokenStatus {
  if (token == null || (typeof token === 'string' && !token.trim())) return 'absent';
  return verifyMissGapClassToken(token, classKey) ? 'valid' : 'invalid';
}
