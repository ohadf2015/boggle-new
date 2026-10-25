/**
 * Education XP Persistence API
 *
 * POST - Persist education practice XP to the database.
 * Previously, education XP was tracked only in React state and lost on refresh.
 * This route saves it to the profiles table via increment_player_xp RPC.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';
import { claimOnce } from '@/lib/server/claimOnce';
import { resolveRecordXpGrant } from '@/lib/education/recordXpPolicy';
import { CONNECTIONS_DAILY_XP_CEILING, reserveDailyXp } from '@/lib/education/recordXpDailyCeiling';

interface RecordEducationXpRequest {
  xpAmount: number;
  lessonId: string;
  activityType: string;
}

export async function POST(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'education-record-xp', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter ?? 60) } }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { xpAmount, lessonId, activityType } = body as unknown as RecordEducationXpRequest;

    if (typeof xpAmount !== 'number' || !Number.isFinite(xpAmount) || xpAmount <= 0) {
      return NextResponse.json({ error: 'Invalid xpAmount' }, { status: 400 });
    }

    if (typeof lessonId !== 'string' || !lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 });
    }

    const grant = resolveRecordXpGrant(activityType, lessonId, xpAmount);
    if (grant.kind === 'rejected' || grant.xp < 1) {
      return NextResponse.json({ error: 'Invalid activityType' }, { status: 400 });
    }

    const userId = user.id;
    // A school shares one IP; this is the per-student budget (a solve takes far longer than 5s).
    const perUser = checkApiRateLimit(request, `education-record-xp:${userId}`, { maxRequests: 12, windowMs: 60_000 });
    if (!perUser.success) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    }

    const day = new Date().toISOString().slice(0, 10);
    let xpToGrant = grant.xp;
    if (grant.kind === 'connections') {
      const allowed = await reserveDailyXp(userId, day, grant.xp, CONNECTIONS_DAILY_XP_CEILING);
      if (allowed === 'unavailable') {
        return NextResponse.json({ error: 'Try again shortly' }, { status: 503 });
      }
      if (allowed < 1) {
        return NextResponse.json({ success: true, xpEarned: 0, dailyCapReached: true });
      }
      xpToGrant = allowed;
    }

    if (grant.kind === 'daily_chest') {
      const claim = await claimOnce(`edu-daily-chest:${userId}:${day}`, 60 * 60 * 48);
      if (claim === 'unavailable') {
        return NextResponse.json({ error: 'Try again shortly' }, { status: 503 });
      }
      if (claim === 'taken') {
        return NextResponse.json({ success: true, xpEarned: 0, alreadyClaimed: true });
      }
    }

    // Sync XP to main profiles table
    const { data: xpData, error: xpError } = await supabase.rpc('increment_player_xp', {
      p_player_id: userId,
      p_xp_amount: xpToGrant,
    });

    if (xpError) {
      console.error('[EDUCATION RECORD-XP] XP increment error:', xpError);
      return NextResponse.json({ error: 'Failed to save XP' }, { status: 500 });
    }

    let newTotalXp = xpToGrant;
    let newLevel = 1;

    if (xpData && (xpData as unknown[]).length > 0) {
      const xpRow = (xpData as Record<string, unknown>[])[0];
      newTotalXp = Number(xpRow.new_total_xp);
      newLevel = xpRow.new_level as number;
    }

    // Update last_game_at for activity tracking
    void supabase
      .from('profiles')
      .update({ last_game_at: new Date().toISOString() })
      .eq('id', userId);

    return NextResponse.json({
      success: true,
      xpEarned: xpToGrant,
      newTotalXp,
      newLevel,
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/education/record-xp', { method: 'POST' });
    console.error('[EDUCATION RECORD-XP] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
