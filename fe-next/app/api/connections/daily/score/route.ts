import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { readGuestId, newGuestId, setGuestCookie } from '@/lib/auth/guestCookie';
import { captureApiError } from '@/utils/sentry';
import { validateDailySubmission } from '@/lib/connections/dailyScore';
import { maxDailyScore } from '@/lib/connections/daily';
import { processConnectionsCompletion } from './processCompletion';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * POST /api/connections/daily/score
 * Submit a Word Bridge daily-challenge result. Service-role write; the client's
 * score is clamped and its streak recomputed from the D-1 row (never trusted).
 */
export async function POST(request: NextRequest) {
  const rl = checkApiRateLimit(request, 'connections-daily-score', { maxRequests: 20, windowMs: 60_000 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 });
    }
    const today = todayUTC();

    // Clamp ceiling depends on the (date, locale) the client claims; validate
    // the rest of the body against it.
    const peekDate = typeof body.puzzleDate === 'string' ? body.puzzleDate : today;
    const peekLang = typeof body.language === 'string' ? body.language : 'en';
    const max = maxDailyScore(peekDate, peekLang);
    const v = validateDailySubmission(body, max, today);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const sub = v.value;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Identity is server-authoritative: the authed user, else a signed guest cookie.
    // We NEVER trust a client-supplied fingerprint (it would let an attacker write
    // to another guest's leaderboard row / inflate any identity). A new guest gets a
    // freshly minted id whose signed cookie is set on the final response.
    const existingGuest = user ? null : readGuestId(request);
    const guestId = user ? null : (existingGuest ?? newGuestId());

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    const idCol = user ? 'player_id' : 'guest_fingerprint';
    const idVal = user ? user.id : (guestId as string);

    const { data: profile } = user
      ? await admin.from('profiles').select('avatar_emoji, avatar_color, avatar_image').eq('id', user.id).single()
      : { data: null };

    // Avatar overrides from request body (if supplied).
    const avatarOverrides = {
      avatarEmoji: typeof body.avatarEmoji === 'string' ? body.avatarEmoji : undefined,
      avatarColor: typeof body.avatarColor === 'string' ? body.avatarColor : undefined,
      avatarImage: typeof body.avatarImage === 'string' ? body.avatarImage : undefined,
    };

    // Delegate to the extracted persistence function.
    const result = await processConnectionsCompletion(body, {
      sub,
      idCol,
      idVal,
      userIdForRow: user?.id ?? null,
      guestIdForRow: user ? null : guestId,
      profile,
      avatarOverrides,
      admin,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const out = NextResponse.json({
      success: true,
      action: result.body.action,
      streak: result.body.streak,
      score: result.body.score,
      currentRank: result.body.currentRank,
      totalPlayers: result.body.totalPlayers,
    });
    // Issue the signed cookie for a freshly minted guest (set on the SAME response).
    if (guestId && !existingGuest) setGuestCookie(out, guestId);
    return out;
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/connections/daily/score', {
      method: 'POST',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
