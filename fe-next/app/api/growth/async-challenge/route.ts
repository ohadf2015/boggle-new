/**
 * Async Challenge API
 *
 * GET  — List challenges for current user (sent + received)
 * POST — Create a new async challenge
 * PUT  — Accept, decline, or submit result for a challenge
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';

function getSupabaseAdmin() {
  return createAdminClient()!;
}

async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

/**
 * GET /api/growth/async-challenge
 * List challenges sent or received by the current user
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sent, error: sentErr } = await getSupabaseAdmin()
      .from('async_challenges')
      .select('*, opponent:opponent_id(id, display_name, avatar_image)')
      .eq('challenger_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (sentErr) {
      console.error('[API] async-challenge GET sent error:', sentErr.message);
      return NextResponse.json({ error: 'Failed to fetch sent challenges' }, { status: 500 });
    }

    const { data: received, error: recvErr } = await getSupabaseAdmin()
      .from('async_challenges')
      .select('*, challenger:challenger_id(id, display_name, avatar_image)')
      .eq('opponent_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (recvErr) {
      console.error('[API] async-challenge GET received error:', recvErr.message);
      return NextResponse.json({ error: 'Failed to fetch received challenges' }, { status: 500 });
    }

    return NextResponse.json({ sent: sent ?? [], received: received ?? [] });
  } catch (error) {
    console.error('[API] async-challenge GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/growth/async-challenge
 * Create a new async challenge
 *
 * Body: { opponentId: string, gameMode: string, gridSize?: number, timeLimit?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { opponentId, gameMode, gridSize, timeLimit } = body;

    if (!opponentId || !gameMode) {
      return NextResponse.json(
        { error: 'opponentId and gameMode are required' },
        { status: 400 }
      );
    }

    if (opponentId === user.id) {
      return NextResponse.json(
        { error: 'Cannot challenge yourself' },
        { status: 400 }
      );
    }

    // Verify opponent exists
    const { data: opponent } = await getSupabaseAdmin()
      .from('profiles')
      .select('id')
      .eq('id', opponentId)
      .single();

    if (!opponent) {
      return NextResponse.json({ error: 'Opponent not found' }, { status: 404 });
    }

    const { data: challenge, error: insertErr } = await getSupabaseAdmin()
      .from('async_challenges')
      .insert({
        challenger_id: user.id,
        opponent_id: opponentId,
        game_mode: gameMode,
        grid_size: gridSize ?? 4,
        time_limit: timeLimit ?? 120,
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[API] async-challenge POST error:', insertErr.message);
      return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 });
    }

    return NextResponse.json({ challenge }, { status: 201 });
  } catch (error) {
    console.error('[API] async-challenge POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/growth/async-challenge
 * Accept, decline, or submit result for a challenge
 *
 * Body: { challengeId: string, action: 'accept' | 'decline' | 'submit', result?: { score: number, wordsFound: string[] } }
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { challengeId, action, result } = body;

    if (!challengeId || !action) {
      return NextResponse.json(
        { error: 'challengeId and action are required' },
        { status: 400 }
      );
    }

    const validActions = ['accept', 'decline', 'submit'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch the challenge
    const { data: challenge, error: fetchErr } = await getSupabaseAdmin()
      .from('async_challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (fetchErr || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Authorization: only challenger or opponent can modify
    const isChallenger = challenge.challenger_id === user.id;
    const isOpponent = challenge.opponent_id === user.id;
    if (!isChallenger && !isOpponent) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'accept') {
      if (!isOpponent) {
        return NextResponse.json({ error: 'Only the opponent can accept' }, { status: 403 });
      }
      if (challenge.status !== 'pending') {
        return NextResponse.json({ error: 'Challenge is not pending' }, { status: 400 });
      }

      const { data: updated, error: updateErr } = await getSupabaseAdmin()
        .from('async_challenges')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', challengeId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: 'Failed to accept challenge' }, { status: 500 });
      }
      return NextResponse.json({ challenge: updated });
    }

    if (action === 'decline') {
      if (!isOpponent) {
        return NextResponse.json({ error: 'Only the opponent can decline' }, { status: 403 });
      }
      if (challenge.status !== 'pending') {
        return NextResponse.json({ error: 'Challenge is not pending' }, { status: 400 });
      }

      const { data: updated, error: updateErr } = await getSupabaseAdmin()
        .from('async_challenges')
        .update({ status: 'declined' })
        .eq('id', challengeId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: 'Failed to decline challenge' }, { status: 500 });
      }
      return NextResponse.json({ challenge: updated });
    }

    if (action === 'submit') {
      if (!result || typeof result.score !== 'number') {
        return NextResponse.json({ error: 'result with score is required for submit' }, { status: 400 });
      }

      if (challenge.status !== 'accepted' && challenge.status !== 'in_progress') {
        return NextResponse.json({ error: 'Challenge must be accepted before submitting' }, { status: 400 });
      }

      const updateField = isChallenger
        ? { challenger_score: result.score, challenger_words: result.wordsFound ?? [] }
        : { opponent_score: result.score, opponent_words: result.wordsFound ?? [] };

      // Determine if both players have submitted
      const otherSubmitted = isChallenger
        ? challenge.opponent_score != null
        : challenge.challenger_score != null;

      let newStatus = 'in_progress';
      if (otherSubmitted) {
        newStatus = 'completed';
      }

      const { data: updated, error: updateErr } = await getSupabaseAdmin()
        .from('async_challenges')
        .update({ ...updateField, status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', challengeId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: 'Failed to submit result' }, { status: 500 });
      }
      return NextResponse.json({ challenge: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[API] async-challenge PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
