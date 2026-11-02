import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureEduServerEvents } from '@/backend/utils/educationTelemetry';
import { EDU_EVENTS } from '@/lib/analytics/eduEvents';
import { checkRateLimitRedis, RATE_LIMIT_KEYS } from '@/backend/redis/rateLimit';
import { isAnyTestAccount } from '@/lib/education/eduTestAccount';
import { createAdminClient } from '@/utils/supabase/admin';
import { lookupEndedClassroomSession } from '../classroom/join/endedSessionCode';

/**
 * POST /api/education/late-join-practice — a student who reached an ended
 * classroom game tapped "Play today's practice round" instead.
 *
 * Records `edu_late_join_practice_started` server-side: students are often
 * guests on school Chromebooks where browser PostHog never fires (see
 * buildClassroomJoinRefusedEvent). The classroom id comes from the server's own
 * ended-session record, never from the client. Always 204 and the answer says
 * nothing about the code, so this is no oracle for finished session codes.
 */
const CODE_RE = /^[A-Z0-9]{6}$/;
const DOORS = new Set(['join_flow']);
const PER_MINUTE = 20;

export async function POST(request: NextRequest) {
  try {
    let body: { gameCode?: unknown; door?: unknown } = {};
    try {
      body = JSON.parse((await request.text()) || '{}');
    } catch {
      body = {};
    }
    const gameCode = typeof body.gameCode === 'string' ? body.gameCode.trim().toUpperCase() : '';
    if (!CODE_RE.test(gameCode)) return new NextResponse(null, { status: 204 });
    const door = typeof body.door === 'string' && DOORS.has(body.door) ? body.door : 'join_flow';

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const { limited } = await checkRateLimitRedis(RATE_LIMIT_KEYS.api(`late-join-practice:${ip}`), {
      maxRequests: PER_MINUTE,
      windowMs: 60_000,
    });
    if (limited) return new NextResponse(null, { status: 204 });

    const [user, ended] = await Promise.all([
      getAuthedUser(request).catch(() => null),
      lookupEndedClassroomSession(gameCode),
    ]);
    const classroomId = ended?.classroomId ?? null;

    let isTestAccount = false;
    try {
      const admin = createAdminClient();
      let teacherId: string | null = null;
      if (admin && classroomId) {
        const { data } = await admin.from('classrooms').select('teacher_id').eq('id', classroomId).maybeSingle();
        teacherId = (data as { teacher_id?: string } | null)?.teacher_id ?? null;
      }
      isTestAccount = await isAnyTestAccount(admin, [teacherId, user?.id ?? null]);
    } catch {
      isTestAccount = false;
    }

    captureEduServerEvents([
      {
        distinctId: user?.id ?? `anonymous-${gameCode}`,
        event: EDU_EVENTS.latePracticeStarted,
        properties: {
          game_code: gameCode,
          classroom_id: classroomId,
          reason: 'SESSION_ENDED',
          // False when the ended-session record already expired (4h TTL): the screen still showed.
          session_verified: classroomId !== null,
          door,
          practice: 'daily_word_hunt',
          is_guest: !user,
          is_test_account: isTestAccount,
        },
      },
    ]);
  } catch {
    /* analytics only */
  }
  return new NextResponse(null, { status: 204 });
}
