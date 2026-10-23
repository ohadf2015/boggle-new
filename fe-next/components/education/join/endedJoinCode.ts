'use server';

import { headers } from 'next/headers';
import { checkRateLimitRedis, RATE_LIMIT_KEYS } from '@/backend/redis/rateLimit';
import { lookupEndedClassroomSession } from '@/app/api/education/classroom/join/endedSessionCode';

const CODE_RE = /^[A-Z0-9]{6}$/;
const LOOKUPS_PER_MINUTE = 20;

export async function isEndedJoinCode(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!CODE_RE.test(normalized)) return false;
  // Without a cap this is a yes/no oracle for guessing finished session codes.
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const { limited } = await checkRateLimitRedis(RATE_LIMIT_KEYS.api(`ended-code:${ip}`), {
    maxRequests: LOOKUPS_PER_MINUTE,
    windowMs: 60_000,
  });
  if (limited) return false;
  return (await lookupEndedClassroomSession(normalized)) !== null;
}
