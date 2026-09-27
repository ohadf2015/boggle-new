/**
 * Async Friend Challenge API
 *
 * Spec: fe-next/docs/specs/2026-05-13-friend-challenge-async-design.md
 *
 * GET  — List async challenges for current user (sent + received).
 * POST — Create challenge (challenger already played, score locked).
 * PUT  — Phase transitions: accept | decline | challenged (friend submits).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import {
  notifyAsyncChallengeReceived,
  notifyAsyncChallengeResult,
  notifyChallengeDeclined,
} from '@/backend/modules/pushNotificationTriggers';

type AsyncStatus =
  | 'draft'
  | 'pending'
  | 'accepted'
  | 'completed'
  | 'declined'
  | 'expired'
  | 'expired_draft'
  | 'expired_unfinished';

type ChallengePhase = 'accept' | 'decline' | 'challenged';

const MAX_SCORE_SANITY = 50_000;
const MAX_WORDS_SANITY = 500;
const FRIEND_INBOX_STATUSES: AsyncStatus[] = [
  'pending',
  'accepted',
  'completed',
  'declined',
  'expired',
  'expired_unfinished',
];

function admin() {
  const client = createAdminClient();
  if (!client) throw new Error('createAdminClient returned null');
  return client;
}

function bad(reason: string, status = 400) {
  return NextResponse.json({ error: reason }, { status });
}

function validateScoreInput(score: unknown, words: unknown): string | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'score must be a finite number';
  if (score < 0) return 'score must be non-negative';
  if (score > MAX_SCORE_SANITY) return 'score exceeds sanity cap';
  if (!Array.isArray(words)) return 'words must be an array';
  if (words.length > MAX_WORDS_SANITY) return 'words length exceeds sanity cap';
  if (words.some((w) => typeof w !== 'string')) return 'words entries must be strings';
  return null;
}

// ============================================================
// GET
// ============================================================

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthedUser(req);
    if (!user) return bad('Unauthorized', 401);

    const supabase = admin();

    const [{ data: sent, error: sentErr }, { data: received, error: recvErr }] = await Promise.all([
      supabase
        .from('async_board_challenges')
        .select('*')
        .eq('challenger_id', user.id)
        .neq('status', 'expired_draft')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('async_board_challenges')
        .select('*')
        .eq('challenged_id', user.id)
        .in('status', FRIEND_INBOX_STATUSES)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (sentErr || recvErr) {
      console.error('[async-challenge GET]', sentErr?.message, recvErr?.message);
      return bad('Failed to fetch challenges', 500);
    }

    return NextResponse.json({ sent: sent ?? [], received: received ?? [] });
  } catch (e) {
    console.error('[async-challenge GET] error', e);
    return bad('Internal server error', 500);
  }
}

// ============================================================
// POST — create challenge (challenger already played)
// ============================================================

interface PostBody {
  friendUserId: string;
  gameMode: 'classic' | 'blast' | 'word-hunt';
  language: string;
  durationSeconds: number;
  letterGrid: string[][];
  gridSize: number;
  gridSeed?: string;
  score: number;
  words: string[];
  bestWord?: string;
  message?: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthedUser(req);
    if (!user) return bad('Unauthorized', 401);

    const body = (await req.json()) as Partial<PostBody>;
    const {
      friendUserId,
      gameMode,
      language,
      durationSeconds,
      letterGrid,
      gridSize,
      gridSeed,
      score,
      words,
      bestWord,
      message,
    } = body;

    if (!friendUserId) return bad('friendUserId required');
    if (friendUserId === user.id) return bad('cannot challenge yourself');
    if (!gameMode || !['classic', 'blast', 'word-hunt'].includes(gameMode)) return bad('invalid gameMode');
    if (!language || typeof language !== 'string') return bad('language required');
    if (!Number.isInteger(durationSeconds) || (durationSeconds ?? 0) < 30 || (durationSeconds ?? 0) > 600) {
      return bad('durationSeconds must be 30-600');
    }
    if (!Array.isArray(letterGrid) || letterGrid.length === 0) return bad('letterGrid required');
    if (!Number.isInteger(gridSize) || (gridSize ?? 0) < 3 || (gridSize ?? 0) > 13) return bad('invalid gridSize');

    const scoreErr = validateScoreInput(score, words);
    if (scoreErr) return bad(scoreErr);

    const supabase = admin();

    const { data: friendship } = await supabase
      .from('friends')
      .select('id')
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${user.id})`,
      )
      .eq('status', 'accepted')
      .maybeSingle();

    if (!friendship) return bad('not friends', 403);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { data: inserted, error: insertErr } = await supabase
      .from('async_board_challenges')
      .insert({
        challenger_id: user.id,
        challenged_id: friendUserId,
        game_mode: gameMode,
        language,
        duration_seconds: durationSeconds,
        letter_grid: letterGrid,
        grid_size: gridSize,
        grid_seed: gridSeed ?? null,
        challenger_score: score,
        challenger_words: words,
        challenger_best_word: bestWord ?? null,
        message: message ?? null,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select('id, challenger_id, challenged_id, challenger_score, game_mode')
      .single();

    if (insertErr || !inserted) {
      console.error('[async-challenge POST]', insertErr?.message);
      return bad('Failed to create challenge', 500);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .maybeSingle();
    const challengerName = profile?.display_name || profile?.username || 'A friend';

    notifyAsyncChallengeReceived(
      friendUserId,
      challengerName,
      inserted.id,
      score as number,
      gameMode,
    ).catch((err) => console.error('[async-challenge POST] push failed', err));

    return NextResponse.json({ challengeId: inserted.id }, { status: 201 });
  } catch (e) {
    console.error('[async-challenge POST] error', e);
    return bad('Internal server error', 500);
  }
}

// ============================================================
// PUT — phase transitions
// ============================================================

interface PutBody {
  score?: number;
  words?: string[];
  bestWord?: string;
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthedUser(req);
    if (!user) return bad('Unauthorized', 401);

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const phase = url.searchParams.get('phase') as ChallengePhase | null;

    if (!id) return bad('id query param required');
    if (!phase || !['accept', 'decline', 'challenged'].includes(phase)) {
      return bad('phase must be one of accept | decline | challenged');
    }

    const supabase = admin();

    const { data: challenge, error: fetchErr } = await supabase
      .from('async_board_challenges')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !challenge) return bad('challenge not found', 404);

    const isChallenger = challenge.challenger_id === user.id;
    const isChallenged = challenge.challenged_id === user.id;
    if (!isChallenger && !isChallenged) return bad('Forbidden', 403);

    if (phase === 'accept') {
      if (!isChallenged) return bad('only the challenged user can accept', 403);
      if (challenge.status !== 'pending') return bad(`cannot accept from status=${challenge.status}`);

      const { error } = await supabase
        .from('async_board_challenges')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return bad('Failed to accept', 500);

      return NextResponse.json({ ok: true });
    }

    if (phase === 'decline') {
      if (!isChallenged) return bad('only the challenged user can decline', 403);
      if (challenge.status !== 'pending') return bad(`cannot decline from status=${challenge.status}`);

      const { error } = await supabase
        .from('async_board_challenges')
        .update({ status: 'declined' })
        .eq('id', id);
      if (error) return bad('Failed to decline', 500);

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .maybeSingle();
      const declinerName = profile?.display_name || profile?.username || 'Your friend';

      notifyChallengeDeclined(challenge.challenger_id, declinerName).catch((err) =>
        console.error('[async-challenge PUT decline] push failed', err),
      );

      return NextResponse.json({ ok: true });
    }

    if (phase === 'challenged') {
      if (!isChallenged) return bad('only the challenged user can submit result', 403);
      if (challenge.status !== 'accepted') return bad(`cannot submit from status=${challenge.status}`);

      const body = (await req.json()) as PutBody;
      const scoreErr = validateScoreInput(body.score, body.words);
      if (scoreErr) return bad(scoreErr);

      const challengedScore = body.score as number;
      const challengerScore = challenge.challenger_score ?? 0;

      let winnerUserId: string | null = null;
      if (challengedScore > challengerScore) winnerUserId = challenge.challenged_id;
      else if (challengerScore > challengedScore) winnerUserId = challenge.challenger_id;

      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('async_board_challenges')
        .update({
          challenged_score: challengedScore,
          challenged_words: body.words ?? [],
          challenged_best_word: body.bestWord ?? null,
          status: 'completed',
          winner_user_id: winnerUserId,
          played_at: nowIso,
          completed_at: nowIso,
        })
        .eq('id', id);
      if (error) return bad('Failed to submit result', 500);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', [challenge.challenger_id, challenge.challenged_id]);
      const byId = new Map<string, { name: string }>();
      (profiles ?? []).forEach((p: { id: string; username: string | null; display_name: string | null }) => {
        byId.set(p.id, { name: p.display_name || p.username || 'Friend' });
      });
      const challengerName = byId.get(challenge.challenger_id)?.name ?? 'Friend';
      const challengedName = byId.get(challenge.challenged_id)?.name ?? 'Friend';

      const challengerDidWin = winnerUserId === challenge.challenger_id;
      const challengedDidWin = winnerUserId === challenge.challenged_id;

      notifyAsyncChallengeResult(
        challenge.challenger_id,
        challengedName,
        id,
        challengerDidWin,
        challengerScore,
        challengedScore,
      ).catch((err) => console.error('[async-challenge PUT challenged] push challenger failed', err));

      notifyAsyncChallengeResult(
        challenge.challenged_id,
        challengerName,
        id,
        challengedDidWin,
        challengedScore,
        challengerScore,
      ).catch((err) => console.error('[async-challenge PUT challenged] push challenged failed', err));

      return NextResponse.json({ ok: true, winnerUserId });
    }

    return bad('unreachable', 500);
  } catch (e) {
    console.error('[async-challenge PUT] error', e);
    return bad('Internal server error', 500);
  }
}
