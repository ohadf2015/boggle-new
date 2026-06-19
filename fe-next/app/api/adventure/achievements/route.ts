/**
 * Adventure Achievements API
 *
 * GET  - Retrieve persisted adventure achievement counts for the current user
 * POST - Persist adventure achievement counts for the current user
 *
 * Stored in player_progression.adventure_achievement_counts (JSONB).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureApiError } from '@/utils/sentry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ==============================================
// HELPERS
// ==============================================

async function authenticate(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'adventure-achievements', {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return { error: NextResponse.json({ error: 'Too many requests' }, { status: 429 }) };
  }

  const supabase = await createClient();
  const user = await getAuthedUser(request);

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { supabase, userId: user.id };
}

// ==============================================
// GET — fetch achievement counts
// ==============================================

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if ('error' in auth) return auth.error;
  const { supabase, userId } = auth;

  try {
    const { data, error } = await supabase
      .from('player_progression')
      .select('adventure_achievement_counts')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows — treat as empty
      captureApiError(error, 'adventure-achievements-get');
      return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
    }

    return NextResponse.json({
      counts: (data?.adventure_achievement_counts as Record<string, number>) ?? {},
    });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'adventure-achievements-get');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ==============================================
// POST — persist achievement counts
// ==============================================

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if ('error' in auth) return auth.error;
  const { supabase, userId } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('counts' in body) ||
    typeof (body as Record<string, unknown>).counts !== 'object' ||
    (body as Record<string, unknown>).counts === null
  ) {
    return NextResponse.json(
      { error: 'Missing required field: counts (object)' },
      { status: 400 }
    );
  }

  const counts = (body as { counts: Record<string, number> }).counts;

  try {
    const { error } = await supabase.from('player_progression').upsert(
      {
        user_id: userId,
        adventure_achievement_counts: counts,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      captureApiError(error, 'adventure-achievements-post');
      return NextResponse.json({ error: 'Failed to save achievements' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'adventure-achievements-post');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
