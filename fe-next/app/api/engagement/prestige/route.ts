import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import {
  canPrestige,
  getPrestigeMultiplier,
  getNextPrestigeRewards,
  PRESTIGE_CONFIG,
} from '@/backend/modules/xpManager';
import { captureApiError } from '@/utils/sentry';

/**
 * GET /api/engagement/prestige
 * Get current prestige status and rewards preview
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('current_level, prestige_level, prestige_multiplier, prestige_unlocks, total_xp, lifetime_xp')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const currentLevel = profile.current_level || 1;
    const currentPrestige = profile.prestige_level || 0;

    const response = {
      currentLevel,
      prestigeLevel: currentPrestige,
      prestigeMultiplier: profile.prestige_multiplier || 1.0,
      totalXp: profile.total_xp || 0,
      lifetimeXp: profile.lifetime_xp || profile.total_xp || 0,
      canPrestige: canPrestige(currentLevel, currentPrestige),
      maxPrestige: PRESTIGE_CONFIG.MAX_PRESTIGE,
      nextPrestigeRewards: getNextPrestigeRewards(currentPrestige),
      unlockedRewards: profile.prestige_unlocks || [],
    };

    return NextResponse.json(response);
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/engagement/prestige', { method: 'GET' });
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[PRESTIGE API] Error:', errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/engagement/prestige
 * Apply prestige - resets level to 1, grants rewards
 */
export async function POST(_request: NextRequest) {
  // Rate limit: 3 requests per minute (prestige is rare)
  const rateLimitResult = checkApiRateLimit(_request, 'engagement-prestige', {
    maxRequests: 3,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_level, prestige_level, prestige_multiplier, prestige_unlocks, total_xp, lifetime_xp')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const currentLevel = profile.current_level || 1;
    const currentPrestige = profile.prestige_level || 0;

    // Verify eligibility
    if (!canPrestige(currentLevel, currentPrestige)) {
      if (currentLevel < PRESTIGE_CONFIG.REQUIRED_LEVEL) {
        return NextResponse.json(
          { error: `Must reach level ${PRESTIGE_CONFIG.REQUIRED_LEVEL} to prestige` },
          { status: 400 }
        );
      }
      if (currentPrestige >= PRESTIGE_CONFIG.MAX_PRESTIGE) {
        return NextResponse.json(
          { error: 'Already at maximum prestige level' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'Cannot prestige' }, { status: 400 });
    }

    // Calculate new prestige values
    const newPrestigeLevel = currentPrestige + 1;
    const newMultiplier = getPrestigeMultiplier(newPrestigeLevel);
    const rewards = getNextPrestigeRewards(currentPrestige);

    // Build unlocked rewards array
    const existingUnlocks = profile.prestige_unlocks || [];
    const newUnlocks = [
      ...existingUnlocks,
      ...rewards.map(r => ({
        prestigeLevel: newPrestigeLevel,
        type: r.type,
        value: r.value,
        unlockedAt: new Date().toISOString(),
      })),
    ];

    // Update profile - reset XP to 0, level to 1, increment prestige
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        current_level: 1,
        total_xp: 0,
        lifetime_xp: (profile.lifetime_xp || profile.total_xp || 0), // Keep lifetime XP
        prestige_level: newPrestigeLevel,
        prestige_multiplier: newMultiplier,
        prestige_unlocks: newUnlocks,
        // Set the new prestige title
        player_title: PRESTIGE_CONFIG.TITLES[newPrestigeLevel] || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('prestige_level', currentPrestige); // Optimistic lock: prevent double-prestige race

    if (updateError) {
      console.error('[PRESTIGE API] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to apply prestige' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      newPrestigeLevel,
      newMultiplier,
      rewards,
      message: `Congratulations! You are now Prestige ${toRoman(newPrestigeLevel)}!`,
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/engagement/prestige', { method: 'POST' });
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[PRESTIGE API] Error:', errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let result = '';
  for (const [value, numeral] of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}
