import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { readGuestId, newGuestId, setGuestCookie } from '@/lib/auth/guestCookie';
import { captureApiError } from '@/utils/sentry';
import { validateUgcSubmission } from '@/lib/connections/ugc';

/**
 * POST /api/connections/ugc/submit
 * Suggest a community Word Bridge riddle. Lands 'pending' for moderation.
 */
export async function POST(request: NextRequest) {
  const rl = checkApiRateLimit(request, 'connections-ugc-submit', { maxRequests: 10, windowMs: 60_000 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const body = await request.json().catch(() => null);
    const v = validateUgcSubmission(body);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const sub = v.value;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Authorship identity is server-authoritative: authed user, else a signed guest
    // cookie. A client-supplied fingerprint is never trusted (it would let an attacker
    // attribute submissions to — or impersonate — any guest). New guests are minted here.
    const existingGuest = user ? null : readGuestId(request);
    const guestId = user ? null : (existingGuest ?? newGuestId());

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    const { data, error } = await admin
      .from('connections_ugc_puzzles')
      .insert({
        creator_id: user?.id ?? null,
        creator_guest_fingerprint: user ? null : guestId,
        creator_display_name: sub.displayName,
        word1: sub.word1,
        word2: sub.word2,
        bridge: sub.bridge,
        language: sub.language,
        status: 'pending',
      })
      .select('id, status')
      .single();
    if (error) throw error;

    const out = NextResponse.json({ success: true, id: data.id, status: data.status });
    if (guestId && !existingGuest) setGuestCookie(out, guestId);
    return out;
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/connections/ugc/submit', {
      method: 'POST',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
