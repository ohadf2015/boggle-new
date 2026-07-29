/**
 * Adventure Level Completion API — POST handler.
 *
 * Thin wrapper over `processAdventureCompletion` (pure post-auth pipeline).
 * Route owns HTTP concerns: rate-limit, auth, body parse, Zod validation.
 * The pure function is shared with /api/scores/sync for offline-mode award
 * dispatch (Phase 1b, see docs/plans/2026-05-11-offline-mode-phase-1b-...).
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';
import { validateRequestBody } from './validation';
import { processAdventureCompletion } from './processCompletion';

export async function POST(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'adventure-complete', {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    const retryAfter = rateLimitResult.retryAfter ?? 60;
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
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

    const validation = validateRequestBody(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await processAdventureCompletion(
      validation.data,
      user.id,
      { supabase, source: 'live' },
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.body);
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/adventure/complete', { method: 'POST' });
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ADVENTURE COMPLETE API] Error:', errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
