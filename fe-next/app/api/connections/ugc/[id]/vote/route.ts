import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/connections/ugc/[id]/vote
 * Upvote a community riddle (one vote per identity). upvotes is recomputed from
 * the votes table (source of truth) so it can't drift or be inflated.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const rl = checkApiRateLimit(request, 'connections-ugc-vote', { maxRequests: 30, windowMs: 60_000 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

    const body = await request.json().catch(() => null);
    const guestFingerprint = body && typeof body.guestFingerprint === 'string' ? body.guestFingerprint : null;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user && !guestFingerprint) return NextResponse.json({ error: 'identity required' }, { status: 400 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    const { error: voteErr } = await admin.from('connections_ugc_votes').insert({
      puzzle_id: id,
      voter_id: user?.id ?? null,
      voter_guest_fingerprint: user ? null : guestFingerprint,
    });
    const alreadyVoted = !!voteErr && voteErr.code === '23505';
    if (voteErr && !alreadyVoted) throw voteErr;

    // Recompute the count from the source of truth and store it.
    const { count } = await admin
      .from('connections_ugc_votes')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_id', id);
    const upvotes = count ?? 0;
    await admin.from('connections_ugc_puzzles').update({ upvotes }).eq('id', id);

    return NextResponse.json({ success: true, alreadyVoted, upvotes });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/connections/ugc/vote', {
      method: 'POST',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
