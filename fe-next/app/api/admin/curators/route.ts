import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { isSameOrigin } from '@/lib/auth/sameOrigin';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';
import {
  validateAssignmentInput,
  buildAssignmentUpsert,
  buildRevokePatch,
  type AssignmentInput,
} from '@/lib/curator/curatorAdmin';
import { SUPPORTED_LANGUAGES } from '@/lib/curator/curatorScope';

/**
 * Admin management of Language Curator assignments.
 *
 * GET  /api/admin/curators[?language=he]   → { curators: [...] }
 * POST /api/admin/curators
 *   assign: { userId, language, trustTier? }
 *   revoke: { action:'revoke', userId, language, reason? }
 * Admin-only.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyAdminAuth(request);
  if (!auth.success) return auth.response ?? NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });
    const language = request.nextUrl?.searchParams.get('language') ?? undefined;
    const cols = 'curator_id, language, trust_tier, curator_points, active, assigned_at, assigned_by, revoked_at';
    const query = admin
      .from('curator_language_assignments')
      .select(cols)
      .eq('active', true);
    const { data, error } = language && SUPPORTED_LANGUAGES.includes(language as never)
      ? await query.eq('language', language)
      : await query;
    if (error) throw error;
    return NextResponse.json({ curators: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/admin/curators', { method: 'GET' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'cross-origin request rejected' }, { status: 403 });
  }
  const auth = await verifyAdminAuth(request);
  if (!auth.success || !auth.user) {
    return auth.response ?? NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as
      | (Partial<AssignmentInput> & { action?: string; reason?: string })
      | null;
    if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    // Revoke path
    if (body.action === 'revoke') {
      if (typeof body.userId !== 'string' || typeof body.language !== 'string') {
        return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
      }
      const patch = buildRevokePatch(auth.user.id, body.reason ?? null, new Date().toISOString());
      const { error } = await admin
        .from('curator_language_assignments')
        .update(patch)
        .eq('curator_id', body.userId)
        .eq('language', body.language);
      if (error) throw error;
      return NextResponse.json({ ok: true, revoked: true });
    }

    // Assign path
    const input: AssignmentInput = {
      userId: String(body.userId ?? ''),
      language: String(body.language ?? ''),
      trustTier: body.trustTier,
    };
    const valid = validateAssignmentInput(input);
    if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });

    const row = buildAssignmentUpsert(input, auth.user.id);
    const { error } = await admin
      .from('curator_language_assignments')
      .upsert(row, { onConflict: 'curator_id,language' });
    if (error) throw error;

    return NextResponse.json({ ok: true, assigned: true });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/admin/curators', { method: 'POST' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
