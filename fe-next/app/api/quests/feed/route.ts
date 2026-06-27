/**
 * Quest Achievement Feed API — GET handler.
 *
 * Returns the latest brag-worthy quest completions (PvP wins + Grand Slams) so
 * players see "X just beat a human rival" and chase the same goals. Cached
 * briefly (no realtime). Auth required (the feed is shown in-app to players).
 *
 * Returns { success: true, entries: QuestAchievementEntry[] }.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';

export async function GET(request: NextRequest) {
  const rate = checkApiRateLimit(request, 'quests-feed', {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!rate.success) {
    const retryAfter = rate.retryAfter ?? 60;
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { getRecentAchievements } = await import('@/backend/modules/questFeedManager');
    const entries = await getRecentAchievements(20);
    return NextResponse.json(
      { success: true, entries },
      // Brief shared cache — the feed is identical for everyone; avoids hammering
      // the DB while staying fresh enough for social proof.
      { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' } },
    );
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'quests/feed');
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
