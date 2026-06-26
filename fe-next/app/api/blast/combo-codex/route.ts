/**
 * Combo Codex API
 *
 * POST - Merge incoming discovered combos with existing (additive union, never shrinks)
 * GET  - Fetch discovered combos for current authenticated user
 *
 * Schema: blast_combo_codex
 *   user_id uuid PRIMARY KEY REFERENCES auth.users(id)
 *   discovered_combos text[] NOT NULL DEFAULT '{}'
 *   updated_at timestamptz NOT NULL DEFAULT now()
 *
 * NOTE: Run migration fe-next/supabase/migrations/20260304010000_add_blast_combo_codex.sql
 *       via `npm run db:migrate` before deploying.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { handleGetComboCodex, handlePostComboCodex, type ComboCodexSupabase } from './_handlers';

/**
 * POST /api/blast/combo-codex
 * Merges incoming discovered combos with server record (additive union, never shrinks).
 */
export async function POST(request: NextRequest) {
  // Rate limit: 30 requests per minute
  const rateLimitResult = checkApiRateLimit(request, 'blast-combo-codex', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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

    const supabase = createAdminClient()!;
    const result = await handlePostComboCodex(user.id, body, supabase as unknown as ComboCodexSupabase);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/blast/combo-codex', { method: 'POST' });
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[COMBO CODEX API] Unexpected error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/blast/combo-codex
 * Returns discovered combos for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'blast-combo-codex', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const user = await getAuthedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient()!;
    const result = await handleGetComboCodex(user.id, supabase as unknown as ComboCodexSupabase);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/blast/combo-codex', { method: 'GET' });
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[COMBO CODEX API] Unexpected error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
