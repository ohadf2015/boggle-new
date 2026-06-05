import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';
import { SUPPORTED_LANGUAGES } from '@/lib/curator/curatorScope';

const STATUSES = ['proposed', 'ratified', 'rejected', 'reverted'];

/**
 * GET /api/admin/curator-proposals[?status=proposed&language=he]
 *   → { proposals: [...] } — the admin review inbox. Defaults to status=proposed.
 * Admin-only.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyAdminAuth(request);
  if (!auth.success) return auth.response ?? NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    const params = new URL(request.url).searchParams;
    const statusParam = params.get('status');
    const status = statusParam && STATUSES.includes(statusParam) ? statusParam : 'proposed';
    const language = params.get('language');

    let query = admin
      .from('curator_proposals')
      .select('id, curator_id, language, kind, target_ref, payload, status, created_at')
      .eq('status', status);
    if (language && SUPPORTED_LANGUAGES.includes(language as never)) {
      query = query.eq('language', language);
    }
    const { data, error } = await query.order('created_at', { ascending: true }).limit(200);
    if (error) throw error;

    return NextResponse.json({ proposals: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/admin/curator-proposals', { method: 'GET' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
