/**
 * Adventure Purchase API
 *
 * POST - Purchase an upgrade by ID
 * Server-side validation: fetches current gold/upgrades from DB,
 * verifies cost from upgradeConfig, deducts gold, and persists.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { purchaseUpgrade, getUpgrade, type UpgradeState } from '@/lib/adventure/upgradeConfig';
import { captureApiError } from '@/utils/sentry';

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per minute
  const rateLimitResult = checkApiRateLimit(request, 'adventure-purchase', {
    maxRequests: 10,
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
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { upgradeId } = body;

    if (typeof upgradeId !== 'string' || !getUpgrade(upgradeId)) {
      return NextResponse.json({ error: 'Invalid upgrade ID' }, { status: 400 });
    }

    // Fetch current progression from DB (server is source of truth)
    const { data: progression, error: fetchError } = await supabase
      .from('player_progression')
      .select('gold, upgrades, current_world')
      .eq('user_id', userId)
      .single();

    if (fetchError || !progression) {
      return NextResponse.json({ error: 'Progression not found' }, { status: 404 });
    }

    const currentGold = (progression.gold as number) ?? 0;
    const currentUpgrades = (progression.upgrades as UpgradeState) ?? {};
    const currentWorld = (progression.current_world as number) || 0;

    // Enforce world unlock requirement — prevent buying upgrades before reaching the required world
    // Skip check if current_world is not yet tracked (0 = unknown, allow all purchases)
    const upgrade = getUpgrade(upgradeId as string);
    if (upgrade && currentWorld > 0 && upgrade.unlockWorld > currentWorld) {
      return NextResponse.json(
        { error: `Upgrade requires world ${upgrade.unlockWorld}, currently at world ${currentWorld}` },
        { status: 403 }
      );
    }

    // Server-side purchase validation using shared config
    const result = purchaseUpgrade(currentUpgrades, upgradeId, currentGold);
    if (!result) {
      return NextResponse.json({ error: 'Cannot afford upgrade or already maxed' }, { status: 400 });
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from('player_progression')
      .update({
        gold: result.gold,
        upgrades: result.state,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('gold', currentGold) // optimistic lock: prevent double-purchase race
      .select('gold, upgrades')
      .maybeSingle();

    if (updateError) {
      console.error('[ADVENTURE PURCHASE API] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to save purchase' }, { status: 500 });
    }

    // Optimistic lock failed — concurrent purchase changed gold between read and write
    if (!updatedRow) {
      return NextResponse.json({ error: 'Purchase conflict, please retry' }, { status: 409 });
    }

    return NextResponse.json({ success: true, gold: updatedRow.gold, upgrades: updatedRow.upgrades });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/adventure/purchase', { method: 'POST' });
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ADVENTURE PURCHASE API] Error:', errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
