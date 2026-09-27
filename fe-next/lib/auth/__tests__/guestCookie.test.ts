import { describe, it, expect, beforeAll } from 'vitest';
import { verifyGuestToken, readGuestId, ensureGuestCookie, GUEST_COOKIE } from '../guestCookie';

// Minimal NextRequest/NextResponse cookie shims (we only touch .cookies).
function reqWith(cookie?: string) {
  const map = new Map<string, { value: string }>();
  if (cookie) map.set(GUEST_COOKIE, { value: cookie });
  return {
    cookies: { get: (k: string) => map.get(k) },
  } as unknown as import('next/server').NextRequest;
}
function emptyRes() {
  const store = new Map<string, { value: string; opts: unknown }>();
  return {
    cookies: { set: (k: string, value: string, opts: unknown) => store.set(k, { value, opts }) },
    _store: store,
  } as unknown as import('next/server').NextResponse & { _store: Map<string, { value: string; opts: unknown }> };
}

beforeAll(() => {
  process.env.GUEST_COOKIE_SECRET = 'test-secret-please-ignore';
});

describe('guestCookie', () => {
  it('mints a signed token that verifies back to its uuid', () => {
    const req = reqWith();
    const res = emptyRes();
    const id = ensureGuestCookie(req, res as never);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const setEntry = (res as never as { _store: Map<string, { value: string }> })._store.get(GUEST_COOKIE)!;
    expect(verifyGuestToken(setEntry.value)).toBe(id);
  });

  it('sets HttpOnly + SameSite=Lax cookie options', () => {
    const res = emptyRes();
    ensureGuestCookie(reqWith(), res as never);
    const opts = (res as never as { _store: Map<string, { opts: { httpOnly: boolean; sameSite: string } }> })._store.get(GUEST_COOKIE)!.opts;
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
  });

  it('rejects a forged token (tampered uuid, valid-looking sig)', () => {
    const res = emptyRes();
    ensureGuestCookie(reqWith(), res as never);
    const good = (res as never as { _store: Map<string, { value: string }> })._store.get(GUEST_COOKIE)!.value;
    const [v, , sig] = good.split('.');
    const forged = `${v}.11111111-1111-1111-1111-111111111111.${sig}`;
    expect(verifyGuestToken(forged)).toBeNull();
  });

  it('rejects malformed / empty tokens', () => {
    expect(verifyGuestToken(undefined)).toBeNull();
    expect(verifyGuestToken('')).toBeNull();
    expect(verifyGuestToken('garbage')).toBeNull();
    expect(verifyGuestToken('g1.only-two-parts')).toBeNull();
  });

  it('reuses an existing valid cookie instead of minting a new one', () => {
    const res1 = emptyRes();
    const id = ensureGuestCookie(reqWith(), res1 as never);
    const token = (res1 as never as { _store: Map<string, { value: string }> })._store.get(GUEST_COOKIE)!.value;

    const res2 = emptyRes();
    const id2 = ensureGuestCookie(reqWith(token), res2 as never);
    expect(id2).toBe(id);
    // no new cookie should have been set on reuse
    expect((res2 as never as { _store: Map<string, unknown> })._store.size).toBe(0);
  });

  it('readGuestId returns null when no cookie present', () => {
    expect(readGuestId(reqWith())).toBeNull();
  });
});
