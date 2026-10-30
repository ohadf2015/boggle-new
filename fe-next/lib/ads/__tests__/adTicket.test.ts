import { describe, it, expect } from 'vitest';
import { signAdTicket, verifyAdTicket, AD_TICKET_MIN_AGE_MS } from '../adTicket';

const SECRET = 'test-secret';
const T0 = Date.parse('2026-10-30T12:00:00Z');

describe('ad ticket', () => {
  it('given a ticket old enough for the ad to have played, when verified, then it passes', () => {
    const ticket = signAdTicket('user-1', T0, SECRET);
    expect(verifyAdTicket(ticket, { userId: 'user-1', lastClaimAt: null, now: T0 + AD_TICKET_MIN_AGE_MS, secret: SECRET })).toBe(true);
  });

  it('given a ticket claimed sooner than any ad could play, when verified, then it fails', () => {
    const ticket = signAdTicket('user-1', T0, SECRET);
    expect(verifyAdTicket(ticket, { userId: 'user-1', lastClaimAt: null, now: T0 + 1000, secret: SECRET })).toBe(false);
  });

  it("given another player's ticket, when verified, then it fails", () => {
    const ticket = signAdTicket('user-2', T0, SECRET);
    expect(verifyAdTicket(ticket, { userId: 'user-1', lastClaimAt: null, now: T0 + 60_000, secret: SECRET })).toBe(false);
  });

  it('given a ticket issued before the last claim, when reused, then it fails', () => {
    const ticket = signAdTicket('user-1', T0, SECRET);
    const lastClaimAt = new Date(T0 + 30_000).toISOString();
    expect(verifyAdTicket(ticket, { userId: 'user-1', lastClaimAt, now: T0 + 60_000, secret: SECRET })).toBe(false);
  });

  it('given a tampered or missing ticket, when verified, then it fails', () => {
    const ticket = signAdTicket('user-1', T0, SECRET);
    const opts = { userId: 'user-1', lastClaimAt: null, now: T0 + 60_000, secret: SECRET };
    expect(verifyAdTicket(ticket.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')), opts)).toBe(false);
    expect(verifyAdTicket(undefined, opts)).toBe(false);
    expect(verifyAdTicket(ticket, { ...opts, secret: 'other' })).toBe(false);
  });
});
