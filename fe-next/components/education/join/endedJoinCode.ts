'use server';

import { headers } from 'next/headers';
import { checkRateLimitRedis, RATE_LIMIT_KEYS } from '@/backend/redis/rateLimit';
import { readEndedClassroomSession } from '@/app/api/education/classroom/join/endedSessionCode';

const CODE_RE = /^[A-Z0-9]{6}$/;
const LOOKUPS_PER_MINUTE = 20;

export type EndedJoinCodeStatus = 'ended' | 'not_ended' | 'unverified';

export async function endedJoinCodeStatus(code: string): Promise<EndedJoinCodeStatus> {
  const normalized = code.trim().toUpperCase();
  if (!CODE_RE.test(normalized)) return 'not_ended';
  // Without a cap this is a yes/no oracle for guessing finished session codes.
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const { limited } = await checkRateLimitRedis(RATE_LIMIT_KEYS.api(`ended-code:${ip}`), {
    maxRequests: LOOKUPS_PER_MINUTE,
    windowMs: 60_000,
  });
  // A class behind one school IP trips this; "could not check" must never read as "wrong code".
  if (limited) return 'unverified';
  try {
    return (await readEndedClassroomSession(normalized)) !== null ? 'ended' : 'not_ended';
  } catch {
    return 'unverified';
  }
}

export async function isEndedJoinCode(code: string): Promise<boolean> {
  return (await endedJoinCodeStatus(code)) === 'ended';
}
