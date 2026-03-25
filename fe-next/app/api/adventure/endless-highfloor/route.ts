/**
 * Endless Mode High Floor API
 *
 * POST - Save new high floor if it beats the current record
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { captureApiError } from '@/utils/sentry';

export async function POST(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'adventure-endless-highfloor', {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  try {
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { floor } = body;
    if (typeof floor !== 'number' || floor < 1 || floor > 9999) {
      return NextResponse.json({ error: 'Invalid floor' }, { status: 400 });
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Only update if new floor beats current record (SQL-level guard)
    const { data, error } = await supabase
      .from('player_progression')
      .update({
        endless_high_floor: floor,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .lt('endless_high_floor', floor)
      .select('endless_high_floor')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[ENDLESS HIGHFLOOR API] Update error:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated: !!data,
      highFloor: data?.endless_high_floor ?? floor,
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/adventure/endless-highfloor', { method: 'POST' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
