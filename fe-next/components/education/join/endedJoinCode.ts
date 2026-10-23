'use server';

import { lookupEndedClassroomSession } from '@/app/api/education/classroom/join/endedSessionCode';

const CODE_RE = /^[A-Z0-9]{6}$/;

export async function isEndedJoinCode(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!CODE_RE.test(normalized)) return false;
  return (await lookupEndedClassroomSession(normalized)) !== null;
}
