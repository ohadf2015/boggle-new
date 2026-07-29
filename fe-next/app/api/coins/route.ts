import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';
import { getPostHogServer } from '@/lib/posthog';

// Server-side coin amount limits to prevent abuse
// Daily rewards: base(25) + efficiency(50) + streak(100*10=1000) + streakBonus ≈ up to ~1500
// Game rewards: capped at MAX_GAME_REWARD (500) in coinManager.ts
const MAX_COIN_AWARD = 2000;
const MAX_COIN_SPEND = 10000;

/**
 * POST /api/coins
 * Sync or spend coins through server-side proxy.
 * Validates auth, caps amounts, and provides audit trail.
 *
 * Body: { amount: number, reason: string, metadata?: Record<string, string | number> }
 * - Positive amount = add coins (capped at MAX_COIN_AWARD)
 * - Negative amount = spend coins (capped at MAX_COIN_SPEND)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, reason, metadata } = body;

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (typeof reason !== 'string' || reason.length === 0 || reason.length > 200) {
      return NextResponse.json(
        { error: 'Invalid reason' },
        { status: 400 }
      );
    }

    // Cap amounts to prevent abuse
    if (amount > 0 && amount > MAX_COIN_AWARD) {
      return NextResponse.json(
        { error: 'Amount exceeds maximum award limit' },
        { status: 400 }
      );
    }

    if (amount < 0 && Math.abs(amount) > MAX_COIN_SPEND) {
      return NextResponse.json(
        { error: 'Amount exceeds maximum spend limit' },
        { status: 400 }
      );
    }

    // Sanitize metadata
    const safeMetadata = metadata && typeof metadata === 'object'
      ? Object.fromEntries(
          Object.entries(metadata)
            .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
            .slice(0, 10)
        )
      : {};

    // Rewarded-ad grants use the capped RPC — enforces 10 watches/day server-side,
    // atomically, preventing localStorage bypass or direct-POST farming.
    const isAdReward = reason === 'Watched Ad' && amount > 0;
    const rpcName = isAdReward ? 'award_ad_coins' : 'sync_coins';
    const { data, error } = await supabase.rpc(rpcName, {
      p_user_id: user.id,
      p_amount: amount,
      p_reason: reason,
      p_metadata: safeMetadata,
    });

    if (error) {
      captureApiError(new Error(error.message), '/api/coins', {
        method: 'POST',
        userId: user.id,
        statusCode: 500,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to process coin transaction' },
        { status: 500 }
      );
    }

    const result = data?.[0];
    if (!result?.success) {
      return NextResponse.json(
        { success: false, error: result?.error_message || 'Transaction failed' },
        { status: 400 }
      );
    }

    const eventName = amount > 0 ? 'coins_awarded' : 'coins_spent';
    getPostHogServer()?.capture({
      distinctId: user.id,
      event: eventName,
      properties: {
        amount: Math.abs(amount),
        reason,
        new_balance: result.new_balance,
      },
    });

    return NextResponse.json({
      success: true,
      newBalance: result.new_balance,
    });
  } catch (err) {
    captureApiError(
      err instanceof Error ? err : new Error('Unknown coin API error'),
      '/api/coins',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/coins
 * Get user's current coin balance through server-side proxy.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('total_coins, lifetime_coins_earned')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Failed to fetch balance' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      coins: data.total_coins || 0,
      lifetime: data.lifetime_coins_earned || 0,
    });
  } catch (err) {
    captureApiError(
      err instanceof Error ? err : new Error('Unknown coin API error'),
      '/api/coins',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
