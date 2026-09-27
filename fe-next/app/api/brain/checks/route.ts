/**
 * GET /api/brain/checks — the player's Brain Check history, analysed.
 *
 * Only fixed-protocol check runs (extra_data.benchmark = true) are read, so
 * training-level changes can never masquerade as improvement.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureApiError } from '@/utils/sentry';
import { BRAIN_CHECK_DRILLS, summarizeBrainChecks } from '@/shared/utils/brainCheck';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('drill_sessions')
      .select('drill_type, score, duration_seconds, words_found, extra_data, created_at')
      .eq('user_id', user.id)
      .in('drill_type', BRAIN_CHECK_DRILLS)
      .filter('extra_data->>benchmark', 'eq', 'true')
      .order('created_at', { ascending: false })
      .limit(400);
    if (error) throw new Error(error.message);

    return NextResponse.json({ checks: summarizeBrainChecks(data ?? []) });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/brain/checks', { method: 'GET', statusCode: 500 });
    return NextResponse.json({ error: 'Failed to load brain checks' }, { status: 500 });
  }
}
