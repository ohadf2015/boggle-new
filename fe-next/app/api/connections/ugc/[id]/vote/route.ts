import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { ensureGuestCookie } from '@/lib/auth/guestCookie';
import { captureApiError } from '@/utils/sentry';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/connections/ugc/[id]/vote
 * Upvote an APPROVED community riddle (one vote per identity). Identity is the
 * authenticated user, else a server-issued signed guest cookie — the client
 * cannot supply or rotate it, so the per-identity uniqueness control holds.
 * upvotes is recomputed from the votes table (source of truth) so it can't drift.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const rl = checkApiRateLimit(request, 'connections-ugc-vote', { maxRequests: 30, windowMs: 60_000 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    // Only approved riddles are votable — pending/rejected aren't public.
    const { data: puzzle } = await admin
      .from('connections_ugc_puzzles')
      .select('status')
      .eq('id', id)
      .maybeSingle();
    if (!puzzle || puzzle.status !== 'approved') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    // Build the response first so a guest cookie (if minted) rides on it.
    const res = NextResponse.json({ success: true });
    const guestId = user ? null : ensureGuestCookie(request, res);

    const { error: voteErr } = await admin.from('connections_ugc_votes').insert({
      puzzle_id: id,
      voter_id: user?.id ?? null,
      voter_guest_fingerprint: user ? null : guestId,
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

    return NextResponse.json({ success: true, alreadyVoted, upvotes }, { headers: res.headers });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/connections/ugc/vote', {
      method: 'POST',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
