/**
 * POST /api/drills/submit — submit a drill session result.
 *
 * Thin wrapper over `processBrainDrillCompletion` (pure post-auth pipeline).
 * Route handles HTTP concerns: auth, body parse, idempotency-key header
 * resolution. The pure function is shared with /api/scores/sync for
 * offline-mode award dispatch.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';
import { processBrainDrillCompletion, type DrillSubmitBody } from './processCompletion';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: DrillSubmitBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Idempotency key from header OR from extraData.submissionId. Empty
    // string => no idempotency check (legacy clients).
    const submissionId =
      (body?.extraData && typeof body.extraData === 'object' && 'submissionId' in body.extraData
        ? String((body.extraData as Record<string, unknown>).submissionId ?? '')
        : '') ||
      request.headers.get('idempotency-key') ||
      '';

    const result = await processBrainDrillCompletion(
      body,
      user.id,
      submissionId,
      { supabase, source: 'live' },
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.body);
  } catch (error) {
    const err = error as Error;
    console.error('Unexpected error in drill submit:', err);
    captureApiError(err, '/api/drills/submit', {
      method: 'POST',
      statusCode: 500,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
