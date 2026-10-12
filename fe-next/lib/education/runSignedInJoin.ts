/**
 * I/O for the signed-in invite join. The decision lives in `signedInJoin`;
 * this file only reads the session, calls the classroom join route, and
 * looks up the assignment the redirect should open.
 */

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { isQaEmail } from '@/backend/utils/educationRoundTelemetry';
import { captureEduServerEvents } from '@/backend/utils/educationTelemetry';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';
import {
  completeSignedInJoin,
  hasAuthSessionCookie,
  isAutoJoinCode,
  isJoinLocale,
  pickAssignment,
  type AssignmentPick,
  type SignedInJoinOutcome,
  type SignedInJoinUser,
} from '@/lib/education/signedInJoin';

async function hasSession(): Promise<boolean> {
  const jar = await cookies();
  return hasAuthSessionCookie(jar.getAll().map((cookie) => cookie.name));
}

async function currentUser(): Promise<SignedInJoinUser | null> {
  // Cookie session. getAuthedUser's bearer fast-path does not apply on a
  // document request; the slow path reads the same cookies this page has.
  const user = await getAuthedUser(new Request('https://www.lexiclash.live/join'));
  if (!user) return null;
  return { id: user.id, email: user.email };
}

async function joinClassroom(code: string): Promise<SignedInJoinOutcome> {
  const { POST } = await import('@/app/api/education/classroom/join/route');
  const res = await POST(
    new NextRequest('https://www.lexiclash.live/api/education/classroom/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ joinCode: code }),
    })
  );
  let body: { classroomId?: unknown; alreadyMember?: unknown; gameCode?: unknown } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    return { ok: false };
  }
  if (!res.ok || typeof body.classroomId !== 'string' || body.classroomId.length === 0) {
    return { ok: false };
  }
  const gameCode =
    typeof body.gameCode === 'string' && /^[A-Z0-9]{6}$/.test(body.gameCode) ? body.gameCode : null;
  return {
    ok: true,
    classroomId: body.classroomId,
    alreadyMember: body.alreadyMember === true,
    gameCode,
  };
}

async function findAssignment(classroomId: string): Promise<AssignmentPick | null> {
  // Same read as practice/lessons: a student's own session is not a reliable
  // way to see lesson_assignments (RLS is assignment-shaped and has hidden
  // this list before). No service-role key → the lesson list, not a guessed id.
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from('lesson_assignments')
    .select('lesson_id, practice_focus, due_date, created_at')
    .eq('classroom_id', classroomId);
  if (error || !data) return null;
  return pickAssignment(data);
}

export interface RunSignedInJoinDeps {
  hasSession: () => Promise<boolean>;
  currentUser: () => Promise<SignedInJoinUser | null>;
  join: (code: string) => Promise<SignedInJoinOutcome>;
  findAssignment: (classroomId: string) => Promise<AssignmentPick | null>;
  capture: (events: Parameters<typeof captureEduServerEvents>[0]) => void;
  isTestAccount: (email: string | null | undefined) => boolean;
}

const realDeps: RunSignedInJoinDeps = {
  hasSession,
  currentUser,
  join: joinClassroom,
  findAssignment,
  capture: captureEduServerEvents,
  isTestAccount: isQaEmail,
};

/**
 * Returns the redirect href, or null when this request should render the
 * join form (guest, bad code, classroom full, join failed).
 * Never throws — a failure here must still leave the student a form to tap.
 */
export async function autoJoinSignedInStudent(
  locale: string,
  rawCode: string,
  deps: RunSignedInJoinDeps = realDeps
): Promise<string | null> {
  try {
    if (!isJoinLocale(locale) || !isAutoJoinCode(rawCode)) return null;
    // Guests are the common QR scan. Do not pay for an auth round-trip, and
    // do not mint a session, before they have typed a name.
    if (!(await deps.hasSession())) return null;
    const user = await deps.currentUser();
    if (!user?.id) return null;
    return await completeSignedInJoin({
      locale,
      code: rawCode,
      user,
      isTestAccount: deps.isTestAccount(user.email),
      join: deps.join,
      findAssignment: deps.findAssignment,
      capture: deps.capture,
    });
  } catch (err) {
    logger.error('Signed-in classroom auto-join failed:', err);
    return null;
  }
}
