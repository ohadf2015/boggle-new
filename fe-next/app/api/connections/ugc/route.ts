import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';

/**
 * GET /api/connections/ugc?language=he&limit=50
 * Approved community riddles, ranked by upvotes (the dynamic ranking).
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const language = url.searchParams.get('language');
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    let q = admin
      .from('connections_ugc_puzzles')
      .select('id, word1, word2, bridge, language, upvotes, creator_display_name, created_at')
      .eq('status', 'approved')
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);
    if (language) q = q.eq('language', language);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json(
      { success: true, riddles: data ?? [] },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
    );
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/connections/ugc', { method: 'GET' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
