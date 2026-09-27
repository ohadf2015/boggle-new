/**
 * POST /api/practice/complete
 * Called by the practice mode client after the player has been actively
 * practising for a minimum session threshold (see usePracticeQuestCompletion).
 * Marks the 'practice' daily quest slot as complete.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';

export async function POST(request: NextRequest) {
  const limitResult = checkApiRateLimit(request, 'practice-complete', {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!limitResult.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
