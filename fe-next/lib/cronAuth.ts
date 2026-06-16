import { timingSafeEqual } from 'crypto';

interface HeaderCarrier {
  headers: { get(name: string): string | null };
}

/**
 * Verify a cron request's shared secret.
 *
 * FAIL-CLOSED: returns false when `CRON_SECRET` is unset/empty, so a deploy
 * that forgot to configure the secret can NOT be triggered by anyone (the old
 * inline checks skipped auth entirely when the env var was missing).
 *
 * Accepts the secret via `x-cron-secret` (bare) or `Authorization`
 * (bare or `Bearer <secret>`). Comparison is constant-time.
 */
export function isAuthorizedCronRequest(request: HeaderCarrier): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false; // fail closed — no secret configured

  const raw =
    request.headers.get('x-cron-secret') || request.headers.get('authorization');
  if (!raw) return false;

  const candidate = raw.startsWith('Bearer ') ? raw.slice('Bearer '.length) : raw;

  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false; // timingSafeEqual throws on length mismatch
  return timingSafeEqual(a, b);
}
