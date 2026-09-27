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

    if (typeof xpAmount !== 'number' || xpAmount <= 0 || xpAmount > 1000) {
      return NextResponse.json({ error: 'Invalid xpAmount: must be 1-1000' }, { status: 400 });
    }

    if (typeof lessonId !== 'string' || !lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 });
    }

    // Keep in sync with PracticeSessionXp['type'] in backend/modules/educationXpManager.ts
    const validTypes = [
      'flashcard',
      'solo_board',
      'lesson_completion',
      'matching',
      'spelling',
      'blitz',
      'duel',
      'duel_async',
      'duel_realtime',
      'daily_challenge',
      'connections',
    ];
    if (!validTypes.includes(activityType)) {
      return NextResponse.json({ error: 'Invalid activityType' }, { status: 400 });
    }

    const userId = user.id;

    // Sync XP to main profiles table
    const { data: xpData, error: xpError } = await supabase.rpc('increment_player_xp', {
      p_player_id: userId,
      p_xp_amount: xpAmount,
    });

    if (xpError) {
      console.error('[EDUCATION RECORD-XP] XP increment error:', xpError);
      return NextResponse.json({ error: 'Failed to save XP' }, { status: 500 });
    }

    let newTotalXp = xpAmount;
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
      xpEarned: xpAmount,
      newTotalXp,
      newLevel,
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/education/record-xp', { method: 'POST' });
    console.error('[EDUCATION RECORD-XP] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
