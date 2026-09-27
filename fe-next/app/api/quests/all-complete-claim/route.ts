/**
 * All Quests Complete Claim API — POST handler.
 *
 * Server-side idempotent reward claim when daily + weekly quests both complete.
 * Grants 250 XP + 200 coins atomically, protected by all_quests_complete_celebrated flag.
 *
 * Returns { claimed: boolean; xpReward: number; coinReward: number }.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';

export async function POST(request: NextRequest) {
  const rate = checkApiRateLimit(request, 'quests-all-complete-claim', {
    maxRequests: 30,
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

    const { checkAndClaimAllQuestsComplete } = await import('@/backend/modules/dailyMissionsManager');
    const result = await checkAndClaimAllQuestsComplete(user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'quests/all-complete-claim');
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
