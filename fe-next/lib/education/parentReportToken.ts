/**
 * Signed, stateless "parent report" link.
 *
 * A teacher generates a link a parent can open with no account, scoped to ONE
 * student in ONE classroom. No DB row backs the link — it's an HMAC-SHA256
 * token over `{ studentId, classroomId, exp }`. The actual sign/verify
 * plumbing (base64url(JSON payload) + '.' + base64url(hmac), domain-tagged,
 * constant-time compared) is `signPayload`/`verifyPayload` from
 * `lib/adventure/play/attemptToken.ts` — the same generic pair `runToken.ts`
 * already reuses inside adventure — tagged here with domain `'parent-report'`
 * so a parent-report token can never be replayed as an adventure token or
 * vice versa.
 *
 * FAIL CLOSED: with no `PARENT_REPORT_SECRET` configured, signing throws
 * (a route must 500 + log, never silently issue an unsigned/guessable link)
 * and verifying always returns null (never treats a missing secret as "skip
 * the check"). This is a dedicated secret, not shared with adventure or any
 * other feature — rotating it only ever invalidates parent-report links.
 */
import { signPayload, verifyPayload } from '../adventure/play/attemptToken';

const DAY_MS = 24 * 60 * 60 * 1000;
const DOMAIN = 'parent-report';

/** How long a parent report link stays valid. */
export const PARENT_REPORT_TOKEN_DAYS = 30;

export interface ParentReportTokenPayload {
  studentId: string;
  classroomId: string;
  /** Expiry, epoch ms. */
  exp: number;
}

function getSecret(): string {
  const secret = process.env.PARENT_REPORT_SECRET;
  if (!secret) throw new Error('PARENT_REPORT_SECRET is not configured');
  return secret;
}

/**
 * Mint a parent report token for `studentId` in `classroomId`.
 * Throws if `PARENT_REPORT_SECRET` is not configured — callers (API routes)
 * must catch and respond 500 + log, never fall back to an unsigned link.
 */
export function signParentReportToken(
  studentId: string,
  classroomId: string,
  nowMs: number = Date.now(),
  days: number = PARENT_REPORT_TOKEN_DAYS,
): string {
  const secret = getSecret();
  const payload: ParentReportTokenPayload = {
    studentId,
    classroomId,
    exp: nowMs + days * DAY_MS,
  };
  return signPayload(payload, secret, DOMAIN);
}

/**
 * Verify a parent report token. Returns the payload when the signature is
 * valid AND the token has not expired, else null. Never throws — a missing
 * secret or a malformed/tampered/expired token all resolve to null.
 */
export function verifyParentReportToken(
  token: unknown,
  nowMs: number = Date.now(),
): ParentReportTokenPayload | null {
  if (typeof token !== 'string') return null;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null; // fail closed: no secret configured -> nothing verifies
  }

  const payload = verifyPayload<ParentReportTokenPayload>(token, secret, DOMAIN);
  if (
    !payload ||
    typeof payload.studentId !== 'string' ||
    typeof payload.classroomId !== 'string' ||
    typeof payload.exp !== 'number'
  ) {
    return null;
  }

  if (payload.exp <= nowMs) return null; // expired (exclusive: exact instant = expired)

  return payload;
}

/**
 * Build the shareable parent-report URL, same idiom as `classroomJoinUrl`.
 * The link embeds the teacher's CURRENT UI language as the default — the
 * report page itself offers the other 5 locales so the parent can switch to
 * their own without the teacher having to guess it up front.
 */
export function parentReportUrl(origin: string, language: string, token: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/${language}/report/${token}`;
}
