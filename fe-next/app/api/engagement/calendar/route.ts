import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';
import { CALENDAR_REWARDS } from '@/lib/engagement/calendarRewards';
import { claimCalendarDay } from '@/lib/engagement/claimCalendarReward.server';

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || request.cookies.get('sb-access-token')?.value;

  if (!token) return null;

  const supabase = createAdminClient()!;
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return user.id;
}

/**
 * GET /api/engagement/calendar
 * Get calendar status for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Local JWT verify (sub-ms) — callers send a Bearer via authFetch. Read-only
    // GET; POST keeps getUserIdFromRequest (remote) for mutation safety.
    const user = await getAuthedUser(request, { writes: true });
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    const supabase = await createAdminClient()!;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    const { data: engagement } = await supabase
      .from('player_engagement')
      .select('calendar_month, calendar_year, calendar_days_claimed')
      .eq('player_id', userId)
      .maybeSingle();

    // A new month or a missing row reads as an empty calendar; the claim starts the month.
    if (!engagement || engagement.calendar_month !== currentMonth || engagement.calendar_year !== currentYear) {
      return NextResponse.json({
        month: currentMonth,
        year: currentYear,
        daysClaimed: [],
        currentDay,
        canClaimToday: true,
        rewards: CALENDAR_REWARDS.slice(0, Math.min(31, getDaysInMonth(currentMonth, currentYear))),
      });
    }

    const daysClaimed = engagement.calendar_days_claimed || [];
    const canClaimToday = !daysClaimed.includes(currentDay);

    return NextResponse.json({
      month: currentMonth,
      year: currentYear,
      daysClaimed,
      currentDay,
      canClaimToday,
      rewards: CALENDAR_REWARDS.slice(0, Math.min(31, getDaysInMonth(currentMonth, currentYear))),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[API] Calendar GET error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/engagement/calendar',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Failed to get calendar status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/engagement/calendar
 * Claim today's calendar reward
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Everything paid is decided here from the server's date and the verified
    // user; the request body is never read.
    const result = await claimCalendarDay(createAdminClient()!, userId);
    if (result.status === 'none') {
      return NextResponse.json({ error: 'No reward for this day' }, { status: 400 });
    }
    if (result.status === 'already') {
      return NextResponse.json({ error: 'Already claimed today' }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      reward: result.reward,
      appliedReward: result.appliedReward,
      nextReward: result.nextReward,
      levelUp: result.levelUp ?? null,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[API] Calendar POST error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/engagement/calendar',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Failed to claim reward' },
      { status: 500 }
    );
  }
}
