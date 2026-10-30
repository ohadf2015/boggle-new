import { signPayload, verifyPayload } from '@/lib/adventure/play/attemptToken';

// ponytail: client-side ads have no server-side proof; this only forces a real status→claim round trip
// spanning a plausible ad length. Upgrade path: AdMob SSV callback on native.
export const AD_TICKET_MIN_AGE_MS = 8_000;
const DOMAIN = 'avatar-ad';

interface AdTicket { u: string; t: number }

export function adTicketSecret(): string {
  return process.env.AD_TICKET_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function signAdTicket(userId: string, issuedAt: number, secret: string): string {
  return signPayload({ u: userId, t: issuedAt } satisfies AdTicket, secret, DOMAIN);
}

export function verifyAdTicket(
  ticket: unknown,
  opts: { userId: string; lastClaimAt: string | null; now: number; secret: string },
): boolean {
  const payload = verifyPayload<AdTicket>(ticket, opts.secret, DOMAIN);
  if (!payload || payload.u !== opts.userId || typeof payload.t !== 'number') return false;
  if (opts.now - payload.t < AD_TICKET_MIN_AGE_MS) return false;
  return !opts.lastClaimAt || payload.t > Date.parse(opts.lastClaimAt);
}
