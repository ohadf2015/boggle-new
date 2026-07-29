import { createHmac, timingSafeEqual, randomUUID } from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';

/**
 * Server-issued, tamper-proof guest identity.
 *
 * The client must NEVER supply its own guest id — that lets an attacker rotate
 * the value freely and defeat any per-identity uniqueness control (vote
 * stuffing, submission spam). Instead we mint an opaque UUID server-side, sign
 * it (HMAC-SHA256), and store it in an HttpOnly + SameSite=Lax cookie. The
 * client can clear the cookie but can't forge a *valid* new one, so the only
 * way to reset identity is the normal "new browser / cleared cookies" path —
 * which is the same friction a real new visitor has.
 *
 * Token format: `g1.<uuid>.<base64url-hmac(g1.<uuid>)>`
 * Stored identity = the bare `<uuid>` (so the DB never holds the signature).
 */

export const GUEST_COOKIE = 'lc_guest';
const VERSION = 'g1';
const ONE_YEAR_S = 60 * 60 * 24 * 365;

function getSecret(): string {
  // Prefer a dedicated secret; fall back to existing high-entropy secrets so
  // this works without new env config. All are server-only.
  const s =
    process.env.GUEST_COOKIE_SECRET ||
    process.env.BOOST_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('No secret available for guest cookie signing');
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

function makeToken(uuid: string): string {
  const payload = `${VERSION}.${uuid}`;
  return `${payload}.${sign(payload)}`;
}

/** Verify a token and return the bare guest UUID, or null if invalid/forged. */
export function verifyGuestToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [version, uuid, sig] = parts;
  if (version !== VERSION || !uuid) return null;
  const expected = sign(`${version}.${uuid}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return uuid;
}

/** Read a verified guest id from the request cookie, or null if absent/invalid. */
export function readGuestId(request: NextRequest): string | null {
  return verifyGuestToken(request.cookies.get(GUEST_COOKIE)?.value);
}

/** A fresh opaque guest id (unsigned UUID). */
export function newGuestId(): string {
  return randomUUID();
}

/** Set the signed guest cookie for `uuid` on `response`. */
export function setGuestCookie(response: NextResponse, uuid: string): void {
  response.cookies.set(GUEST_COOKIE, makeToken(uuid), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR_S,
  });
}

/**
 * Ensure the response carries a valid guest cookie. Returns the guest id to use.
 * If the request already has a valid one, reuses it; otherwise mints a new one
 * and sets it on the response.
 *
 * NOTE: the cookie is set on the EXACT response object passed — callers must
 * return that same response (copying `response.headers` onto a different
 * NextResponse drops Set-Cookie). For the build-body-last pattern, use
 * readGuestId + newGuestId + setGuestCookie on the final response instead.
 */
export function ensureGuestCookie(request: NextRequest, response: NextResponse): string {
  const existing = readGuestId(request);
  if (existing) return existing;
  const uuid = newGuestId();
  setGuestCookie(response, uuid);
  return uuid;
}
