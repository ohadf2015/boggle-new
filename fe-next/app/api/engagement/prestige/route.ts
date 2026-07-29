import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import {
  canPrestige,
  getNextPrestigeRewards,
  toRoman,
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
    const rewards = getNextPrestigeRewards(currentPrestige);

    // Use atomic RPC to apply prestige (race-condition safe)
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('apply_prestige', {
        p_player_id: userId,
        p_expected_prestige: currentPrestige,
      });

    if (rpcError) {
      console.error('[PRESTIGE API] RPC error:', rpcError);
      return NextResponse.json({ error: 'Failed to apply prestige' }, { status: 500 });
    }

    // Check if optimistic lock succeeded (rows_affected > 0)
    const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    if (!result || result.rows_affected === 0) {
      return NextResponse.json(
        { error: 'Prestige already applied or conditions changed. Please refresh.' },
        { status: 409 }
      );
    }

    // Update prestige_unlocks separately (JSONB append)
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

    const { error: unlockError } = await supabase
      .from('profiles')
      .update({ prestige_unlocks: newUnlocks })
      .eq('id', userId);

    if (unlockError) {
      console.error('[PRESTIGE API] Failed to save unlocks, retrying once:', unlockError);
      // Retry once — prestige was already applied, rewards must be saved
      const { error: retryError } = await supabase
        .from('profiles')
        .update({ prestige_unlocks: newUnlocks })
        .eq('id', userId);

      if (retryError) {
        console.error('[PRESTIGE API] Retry failed — prestige applied but rewards lost:', retryError);
        captureApiError(new Error(`Prestige rewards lost: ${retryError.message}`), '/api/engagement/prestige', { method: 'POST', userId });
        // Still return success since prestige itself was applied, but flag the issue
        return NextResponse.json({
          success: true,
          newPrestigeLevel,
          newMultiplier: result.new_multiplier,
          rewards,
          rewardsLost: true,
          message: `Prestige ${toRoman(newPrestigeLevel)} achieved! Some rewards may need to be re-synced.`,
        });
      }
    }

    const newMultiplier = result.new_multiplier;

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
