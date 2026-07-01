import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';

// Calendar rewards configuration (mirrored from engagementManager)
interface CalendarReward {
  day: number;
  type: 'xp' | 'hints' | 'streak_freeze' | 'mystery_box' | 'exclusive_title';
  amount?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  titleId?: string;
  isMilestone?: boolean;
}

const CALENDAR_REWARDS: CalendarReward[] = [
  { day: 1, type: 'xp', amount: 50 },
  { day: 2, type: 'xp', amount: 75 },
  { day: 3, type: 'hints', amount: 2 },
  { day: 4, type: 'xp', amount: 100 },
  { day: 5, type: 'xp', amount: 125 },
  { day: 6, type: 'hints', amount: 3 },
  { day: 7, type: 'mystery_box', rarity: 'common', isMilestone: true },
  { day: 8, type: 'xp', amount: 150 },
  { day: 9, type: 'xp', amount: 175 },
  { day: 10, type: 'streak_freeze', amount: 1 },
  { day: 11, type: 'xp', amount: 200 },
  { day: 12, type: 'xp', amount: 225 },
  { day: 13, type: 'hints', amount: 4 },
  { day: 14, type: 'mystery_box', rarity: 'rare', isMilestone: true },
  { day: 15, type: 'xp', amount: 250 },
  { day: 16, type: 'xp', amount: 275 },
  { day: 17, type: 'hints', amount: 5 },
  { day: 18, type: 'xp', amount: 300 },
  { day: 19, type: 'xp', amount: 325 },
  { day: 20, type: 'streak_freeze', amount: 2 },
  { day: 21, type: 'mystery_box', rarity: 'epic', isMilestone: true },
  { day: 22, type: 'xp', amount: 350 },
  { day: 23, type: 'xp', amount: 375 },
  { day: 24, type: 'hints', amount: 6 },
  { day: 25, type: 'xp', amount: 400 },
  { day: 26, type: 'xp', amount: 425 },
  { day: 27, type: 'hints', amount: 7 },
  { day: 28, type: 'exclusive_title', titleId: 'DEDICATED_PLAYER', isMilestone: true },
  { day: 29, type: 'xp', amount: 500 },
  { day: 30, type: 'mystery_box', rarity: 'legendary', isMilestone: true },
  { day: 31, type: 'xp', amount: 750 },
];

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
    const user = await getAuthedUser(request);
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
      .single();

    // Reset calendar if new month or no record exists
    if (!engagement || engagement.calendar_month !== currentMonth || engagement.calendar_year !== currentYear) {
      await supabase
        .from('player_engagement')
        .upsert({
          player_id: userId,
          calendar_month: currentMonth,
          calendar_year: currentYear,
          calendar_days_claimed: [],
        });

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

    const supabase = createAdminClient()!;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    // Get current calendar status
    const { data: engagement } = await supabase
      .from('player_engagement')
      .select('calendar_month, calendar_year, calendar_days_claimed')
      .eq('player_id', userId)
      .single();

    let daysClaimed: number[] = [];

    // Handle new month or missing record
    if (!engagement || engagement.calendar_month !== currentMonth || engagement.calendar_year !== currentYear) {
      await supabase
        .from('player_engagement')
        .upsert({
          player_id: userId,
          calendar_month: currentMonth,
          calendar_year: currentYear,
          calendar_days_claimed: [],
        });
    } else {
      daysClaimed = engagement.calendar_days_claimed || [];
    }

    // Check if already claimed today
    if (daysClaimed.includes(currentDay)) {
      return NextResponse.json(
        { error: 'Already claimed today' },
        { status: 400 }
      );
    }

    // Get reward for today
    const reward = CALENDAR_REWARDS[currentDay - 1];
    if (!reward) {
      return NextResponse.json(
        { error: 'No reward for this day' },
        { status: 400 }
      );
    }

    // Update claimed days
    const newDaysClaimed = [...daysClaimed, currentDay];
    await supabase
      .from('player_engagement')
      .update({ calendar_days_claimed: newDaysClaimed })
      .eq('player_id', userId);

    // Apply reward based on type
    let appliedReward: unknown = reward;

    switch (reward.type) {
      case 'xp': {
        const { error: xpRewardError } = await supabase.rpc('increment_player_xp', {
          p_player_id: userId,
          p_xp_amount: reward.amount,
        });
        if (xpRewardError) {
          console.error('Error granting calendar XP reward:', xpRewardError);
        }
        appliedReward = { type: 'xp', amount: reward.amount };
        break;
      }

      case 'hints':
        // Get current hints count and increment
        const { data: profile } = await supabase
          .from('profiles')
          .select('free_hints_available')
          .eq('id', userId)
          .single();

        await supabase
          .from('profiles')
          .update({ free_hints_available: (profile?.free_hints_available || 0) + (reward.amount || 0) })
          .eq('id', userId);
        appliedReward = { type: 'hints', amount: reward.amount };
        break;

      case 'streak_freeze':
        // Get current freezes and increment
        const { data: engagementData } = await supabase
          .from('player_engagement')
          .select('streak_freezes_available')
          .eq('player_id', userId)
          .single();

        await supabase
          .from('player_engagement')
          .update({ streak_freezes_available: (engagementData?.streak_freezes_available || 0) + (reward.amount || 0) })
          .eq('player_id', userId);
        appliedReward = { type: 'streak_freeze', amount: reward.amount };
        break;

      case 'mystery_box':
        appliedReward = { type: 'mystery_box', rarity: reward.rarity };
        break;

      case 'exclusive_title':
        appliedReward = { type: 'title', titleId: reward.titleId };
        break;
    }

    return NextResponse.json({
      success: true,
      reward,
      appliedReward,
      nextReward: CALENDAR_REWARDS[currentDay] || null,
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
