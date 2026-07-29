import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { isSameOrigin } from '@/lib/auth/sameOrigin';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';
import { promoteWordToScores } from '@/backend/modules/wordPromotion';
import { awardCoinsServer } from '@/backend/services/economy/awardCoins';
import { computeRatifyReward } from '@/lib/curator/curatorProposal';
import type { CuratorProposalKind } from '@/lib/curator/curatorScope';

const VOTES_FOR_APPROVAL = 10;

/**
 * POST /api/admin/curator-proposals/[id]/ratify   { decision?: 'ratify' | 'reject' }
 *
 * Admin resolves a curator's proposal. On ratify the effect is applied via the
 * EXISTING content paths (promoteWordToScores / connections_puzzle_reviews) and
 * the curator earns the reward: prestige points are bumped unconditionally;
 * coins are best-effort (a failed economy call never blocks the ratification).
 *
 * Idempotent: a proposal whose status is not 'proposed' is a no-op, so retries
 * or double-clicks can't promote a word twice or pay coins twice.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'cross-origin request rejected' }, { status: 403 });
  }
  const auth = await verifyAdminAuth(request);
  if (!auth.success || !auth.user) {
    return auth.response ?? NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const adminId = auth.user.id;

  try {
    const body = (await request.json().catch(() => ({}))) as { decision?: string };
    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    const { data: proposal } = await admin
      .from('curator_proposals')
      .select('id, curator_id, language, kind, target_ref, payload, status')
      .eq('id', id)
      .single();
    if (!proposal) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Idempotent guard: only still-open proposals can be acted on.
    if (proposal.status !== 'proposed') {
      return NextResponse.json({ ok: true, alreadyResolved: true, status: proposal.status });
    }

    const now = new Date().toISOString();
    const curatorId = proposal.curator_id as string;
    const lang = proposal.language as string;

    // Reject path: finalise without applying an effect or a reward.
    if (body.decision === 'reject') {
      await admin
        .from('curator_proposals')
        .update({ status: 'rejected', ratified_by: adminId, ratified_at: now })
        .eq('id', id);
      return NextResponse.json({ ok: true, status: 'rejected' });
    }

    // ---- Apply the effect via existing content paths ----
    const kind = proposal.kind as CuratorProposalKind;
    const target = proposal.target_ref as string;
    const payload = (proposal.payload ?? {}) as Record<string, unknown>;

    if (kind === 'word_approve') {
      await promoteWordToScores(admin, target, lang, {
        votes: VOTES_FOR_APPROVAL,
        submitter: 'admin_approved',
      });
      await admin
        .from('invalid_word_submissions')
        .update({ approved_at: now, approved_by: adminId })
        .eq('word', target)
        .eq('language', lang);
    } else if (kind === 'puzzle_verdict') {
      const { data: puzzle } = await admin
        .from('connections_puzzles')
        .select('word1, bridge, word2')
        .eq('id', target)
        .single();
      if (puzzle) {
        await admin.from('connections_puzzle_reviews').upsert(
          {
            puzzle_id: target,
            language: lang,
            word1: puzzle.word1,
            word2: puzzle.word2,
            bridge: puzzle.bridge,
            verdict: String(payload.verdict ?? 'unsure'),
            note: (payload.note as string) ?? null,
            reviewed_by: adminId,
            reviewed_at: now,
          },
          { onConflict: 'puzzle_id' }
        );
      }
    }
    // word_reject / word_flag_invalid are advisory — recorded by the proposal
    // itself, no master-content write.

    // ---- Reward: prestige points always, coins best-effort ----
    const { data: assignment } = await admin
      .from('curator_language_assignments')
      .select('curator_points')
      .eq('curator_id', curatorId)
      .eq('language', lang)
      .single();
    const currentPoints = (assignment?.curator_points as number) ?? 0;
    const reward = computeRatifyReward(kind, currentPoints);

    await admin
      .from('curator_language_assignments')
      .update({ curator_points: reward.newPoints })
      .eq('curator_id', curatorId)
      .eq('language', lang);

    if (reward.coinBonus > 0) {
      try {
        await awardCoinsServer(curatorId, reward.coinBonus, 'curator_ratification', {
          proposal_id: id,
        });
      } catch (coinErr) {
        // Non-fatal: the curator keeps their points; coins can be reconciled later.
        captureApiError(
          coinErr instanceof Error ? coinErr : new Error(String(coinErr)),
          '/api/admin/curator-proposals/ratify#coins',
          { method: 'POST' }
        );
      }
    }

    await admin
      .from('curator_proposals')
      .update({
        status: 'ratified',
        ratified_by: adminId,
        ratified_at: now,
        points_awarded: reward.points,
        reward_granted: true,
      })
      .eq('id', id);

    return NextResponse.json({
      ok: true,
      status: 'ratified',
      points: reward.points,
      coinBonus: reward.coinBonus,
    });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/admin/curator-proposals/ratify',
      { method: 'POST' }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
