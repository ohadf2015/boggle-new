import type { NextRequest } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { deriveGuestUsername } from '@/lib/education/guestStudent';

export const GUEST_NAME_MAX = 40;

/** Typed name shown to teachers and on projected boards: no control/format chars, one line, capped. */
export function sanitizeGuestName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, GUEST_NAME_MAX)
    .trim();
}

export function guestSignInData(name: string): Record<string, string> {
  const data: Record<string, string> = { full_name: name };
  const username = deriveGuestUsername(name);
  if (username) data.username = username;
  return data;
}

// A class of ~50 behind one school NAT joins inside a minute, with retries.
export function joinRateLimited(request: NextRequest): boolean {
  return !checkApiRateLimit(request, 'classroom-join', { maxRequests: 180, windowMs: 60_000 }).success;
}

export const JOIN_MISS_LIMIT = 200;
const JOIN_MISS_WINDOW_MS = 10 * 60_000;
const misses = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: NextRequest): string {
  const h = request.headers;
  return (
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    'unknown'
  );
}

function liveMisses(ip: string, now: number) {
  const entry = misses.get(ip);
  if (!entry || entry.resetAt <= now) {
    misses.delete(ip);
    return null;
  }
  return entry;
}

/** Past the miss budget, every code is refused, hits included, so guessing learns nothing. */
export function joinMissBudgetSpent(request: NextRequest, now = Date.now()): boolean {
  return (liveMisses(clientIp(request), now)?.count ?? 0) >= JOIN_MISS_LIMIT;
}

export function recordJoinMiss(request: NextRequest, now = Date.now()): void {
  const ip = clientIp(request);
  const entry = liveMisses(ip, now);
  if (entry) entry.count += 1;
  else misses.set(ip, { count: 1, resetAt: now + JOIN_MISS_WINDOW_MS });
  if (misses.size > 10_000) {
    for (const [k, v] of misses) if (v.resetAt <= now) misses.delete(k);
  }
}
