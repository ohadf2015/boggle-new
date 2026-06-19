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

// ---- Types ----

// Minimal interface for the Supabase query builder chain we use
interface ComboCodexSupabase {
  from(table: string): {
    select(columns: string): {
      eq(col: string, val: string): {
        single(): Promise<{ data: { discovered_combos: string[] } | null; error: unknown }>;
      };
    };
    upsert(
      row: Record<string, unknown>,
      opts: { onConflict: string },
    ): Promise<{ error: unknown }>;
  };
}

interface HandlerResult {
  status: number;
  data: Record<string, unknown>;
}

// ---- Exported pure functions (tested directly) ----

/**
 * Computes the additive union of two combo arrays.
 * Result length is always >= max(existing.length, incoming.length).
 */
export function mergeDiscoveredCombos(
  existing: string[],
  incoming: string[],
): string[] {
  return [...new Set([...existing, ...incoming])];
}

/**
 * GET handler logic — returns discovered combos for the given userId.
 * Auth is validated in the route GET() wrapper before calling this.
 */
export async function handleGetComboCodex(
  userId: string,
  supabase: ComboCodexSupabase,
): Promise<HandlerResult> {
  try {
    const { data, error } = await supabase
      .from('blast_combo_codex')
      .select('discovered_combos')
      .eq('user_id', userId)
      .single();

    // PGRST116 = no rows found — return empty array (not an error state)
    if (error) {
      return {
        status: 200,
        data: { discoveredCombos: [] },
      };
    }

    return {
      status: 200,
      data: { discoveredCombos: data?.discovered_combos ?? [] },
    };
  } catch (err) {
    console.error('[COMBO CODEX API] GET error:', err);
    return { status: 500, data: { error: 'Internal server error' } };
  }
}

/**
 * POST handler logic — merges incoming combos with existing and upserts.
 * Auth is validated in the route POST() wrapper before calling this.
 */
export async function handlePostComboCodex(
  userId: string,
  body: Record<string, unknown>,
  supabase: ComboCodexSupabase,
): Promise<HandlerResult> {
  if (!Array.isArray(body.discoveredCombos)) {
    return {
      status: 400,
      data: { error: 'discoveredCombos must be an array' },
    };
  }

  const incoming = body.discoveredCombos as string[];

  try {
    // Read existing record to compute additive union
    const { data: existing } = await supabase
      .from('blast_combo_codex')
      .select('discovered_combos')
      .eq('user_id', userId)
      .single();

    const existingCombos = existing?.discovered_combos ?? [];
    const merged = mergeDiscoveredCombos(existingCombos, incoming);

    const { error: upsertError } = await supabase
      .from('blast_combo_codex')
      .upsert(
        {
          user_id: userId,
          discovered_combos: merged,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (upsertError) {
      console.error('[COMBO CODEX API] Upsert error:', upsertError);
      return { status: 500, data: { error: 'Failed to save combo codex' } };
    }

    return { status: 200, data: { discoveredCombos: merged } };
  } catch (err) {
    console.error('[COMBO CODEX API] POST error:', err);
    return { status: 500, data: { error: 'Internal server error' } };
  }
}

// ---- Next.js Route handlers ----

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
