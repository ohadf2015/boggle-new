import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';

const COMEBACK_TIERS = [
  { minDays: 3, maxDays: 6, xpMultiplier: 1.5, durationHours: 48, hints: 2, streakFreezes: 1 },
  { minDays: 7, maxDays: 13, xpMultiplier: 2.0, durationHours: 72, hints: 3, streakFreezes: 1 },
  { minDays: 14, maxDays: 29, xpMultiplier: 2.5, durationHours: 96, hints: 5, streakFreezes: 2 },
  { minDays: 30, maxDays: Infinity, xpMultiplier: 3.0, durationHours: 168, hints: 10, streakFreezes: 3, title: 'THE_RETURNED' },
] as const;

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
 * GET /api/engagement/comeback
 * Check if the authenticated user is eligible for a comeback bonus
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient()!;
    const { data: engagement } = await supabase
      .from('player_engagement')
      .select('last_played_at, comeback_bonus_expires_at')
      .eq('player_id', userId)
      .single();

    if (!engagement?.last_played_at) {
      return NextResponse.json({ eligible: false });
    }

    // Already has an active bonus
    if (engagement.comeback_bonus_expires_at && new Date(engagement.comeback_bonus_expires_at) > new Date()) {
      return NextResponse.json({ eligible: false, active: true, expiresAt: engagement.comeback_bonus_expires_at });
    }

    const lastPlayed = new Date(engagement.last_played_at);
    const daysAway = Math.floor((Date.now() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24));
    const tier = COMEBACK_TIERS.find(t => daysAway >= t.minDays && daysAway <= t.maxDays);

    if (!tier) {
      return NextResponse.json({ eligible: false, daysAway });
    }

    return NextResponse.json({
      eligible: true,
      daysAway,
      tier: {
        xpMultiplier: tier.xpMultiplier,
        durationHours: tier.durationHours,
        hints: tier.hints,
        streakFreezes: tier.streakFreezes,
        title: 'title' in tier ? tier.title : undefined,
        message: `${tier.xpMultiplier}x XP for ${tier.durationHours} hours`,
      },
    });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/engagement/comeback',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json({ error: 'Failed to check comeback status' }, { status: 500 });
  }
}

/**
 * POST /api/engagement/comeback
 * Claim the comeback bonus for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient()!;
    const { data: engagement } = await supabase
      .from('player_engagement')
      .select('last_played_at, comeback_bonus_expires_at')
      .eq('player_id', userId)
      .single();

    if (!engagement?.last_played_at) {
      return NextResponse.json({ error: 'Not eligible' }, { status: 400 });
    }

    if (engagement.comeback_bonus_expires_at && new Date(engagement.comeback_bonus_expires_at) > new Date()) {
      return NextResponse.json({ error: 'Bonus already active' }, { status: 400 });
    }

    const lastPlayed = new Date(engagement.last_played_at);
    const daysAway = Math.floor((Date.now() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24));
    const tier = COMEBACK_TIERS.find(t => daysAway >= t.minDays && daysAway <= t.maxDays);

    if (!tier) {
      return NextResponse.json({ error: 'Not eligible for comeback bonus' }, { status: 400 });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + tier.durationHours);

    // Update engagement: XP multiplier + streak freezes
    const { data: currentEngagement } = await supabase
      .from('player_engagement')
      .select('streak_freezes_available')
      .eq('player_id', userId)
      .single();

    await supabase
      .from('player_engagement')
      .update({
        comeback_bonus_claimed: true,
        comeback_bonus_expires_at: expiresAt.toISOString(),
        comeback_xp_multiplier: tier.xpMultiplier,
        streak_freezes_available: (currentEngagement?.streak_freezes_available || 0) + tier.streakFreezes,
      })
      .eq('player_id', userId);

    // Grant free hints
    if (tier.hints > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('free_hints_available')
        .eq('id', userId)
        .single();

      await supabase
        .from('profiles')
        .update({ free_hints_available: (profile?.free_hints_available || 0) + tier.hints })
        .eq('id', userId);
    }

    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
      bonus: {
        xpMultiplier: tier.xpMultiplier,
        durationHours: tier.durationHours,
        hints: tier.hints,
        streakFreezes: tier.streakFreezes,
        title: 'title' in tier ? tier.title : undefined,
        message: `${tier.xpMultiplier}x XP for ${tier.durationHours} hours`,
      },
    });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/engagement/comeback',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({ error: 'Failed to claim comeback bonus' }, { status: 500 });
  }
}
