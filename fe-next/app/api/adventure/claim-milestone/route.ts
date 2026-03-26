/**
 * Word Album Milestone Claim API
 *
 * POST — Claim a word album milestone reward.
 * Server validates: milestone target reached, not already claimed.
 * Awards gold + XP, adds milestone to claimed list.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { WORD_ALBUM_MILESTONES } from '@/lib/adventure/wordAlbum';
import { captureApiError } from '@/utils/sentry';

export async function POST(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'adventure-claim-milestone', {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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

    const { milestoneTarget } = body;
    if (typeof milestoneTarget !== 'number') {
      return NextResponse.json({ error: 'Invalid milestone target' }, { status: 400 });
    }

    // Validate milestone exists
    const milestone = WORD_ALBUM_MILESTONES.find(m => m.target === milestoneTarget);
    if (!milestone) {
      return NextResponse.json({ error: 'Unknown milestone' }, { status: 400 });
    }

    // Fetch current state
    const { data: prog, error: fetchError } = await supabase
      .from('player_progression')
      .select('gold, xp, word_album, word_album_claimed_milestones')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !prog) {
      return NextResponse.json({ error: 'Progression not found' }, { status: 404 });
    }

    const wordCount = (prog.word_album as string[] ?? []).length;
    const claimed = (prog.word_album_claimed_milestones as number[]) ?? [];

    // Validate: word count meets target
    if (wordCount < milestone.target) {
      return NextResponse.json({ error: 'Not enough words for this milestone' }, { status: 400 });
    }

    // Validate: not already claimed
    if (claimed.includes(milestone.target)) {
      return NextResponse.json({ error: 'Milestone already claimed' }, { status: 400 });
    }

    // Award rewards
    const newGold = (prog.gold as number ?? 0) + milestone.gold;
    const newXp = (prog.xp as number ?? 0) + milestone.xp;
    const newClaimed = [...claimed, milestone.target];

    // Optimistic lock: check gold AND ensure this milestone hasn't been claimed yet (Bug C7).
    // The `not.cs` filter rejects the update if the target milestone is already in the array,
    // preventing a race where two concurrent requests both pass the in-memory check above.
    const { data: updatedRow, error: updateError } = await supabase
      .from('player_progression')
      .update({
        gold: newGold,
        xp: newXp,
        word_album_claimed_milestones: newClaimed,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('gold', prog.gold as number ?? 0)
      .not('word_album_claimed_milestones', 'cs', `{${milestone.target}}`)
      .select()
      .single();

    if (updateError) {
      console.error('[CLAIM MILESTONE API] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to claim milestone' }, { status: 500 });
    }

    if (!updatedRow) {
      return NextResponse.json(
        { error: 'Concurrent modification detected — please retry' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      gold: newGold,
      xp: newXp,
      claimedMilestones: newClaimed,
      reward: { gold: milestone.gold, xp: milestone.xp, badge: milestone.badge },
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/adventure/claim-milestone', { method: 'POST' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
