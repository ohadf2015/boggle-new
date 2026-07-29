import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import logger from '@/utils/logger';
import {
  getDailyChallenges,
  assignDailyChallenges,
  claimChallengeReward,
} from '@/lib/supabase/education';

const claimBodySchema = z.object({
  challengeId: z.string().uuid(),
});

/**
 * GET /api/education/challenges/daily
 * Returns today's daily challenges for the authenticated player.
 * Auto-assigns challenges if none exist for today.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: challenges, error } = await getDailyChallenges(user.id);
    if (error) {
      logger.error('GET daily challenges error:', error);
      return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });
    }

    // Auto-assign if none exist for today
    if (challenges.length === 0) {
      const { data: assigned, error: assignError } = await assignDailyChallenges(user.id);
      if (assignError) {
        logger.error('Auto-assign daily challenges error:', assignError);
        return NextResponse.json({ error: 'Failed to assign challenges' }, { status: 500 });
      }
      return NextResponse.json({ challenges: assigned ?? [] });
    }

    return NextResponse.json({ challenges });
  } catch (err) {
    logger.error('GET /api/education/challenges/daily error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/education/challenges/daily
 * Claims the reward for a completed daily challenge.
 * Body: { challengeId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = claimBodySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { challengeId } = parseResult.data;

    const { data: reward, error } = await claimChallengeReward(challengeId, user.id);
    if (error) {
      logger.error('Claim challenge reward error:', error);
      const status =
        error.message === 'Challenge not found' ? 404
        : error.message === 'Player ID mismatch' ? 403
        : error.message === 'Challenge not completed' || error.message === 'Challenge already claimed'
          ? 409
          : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ reward });
  } catch (err) {
    logger.error('POST /api/education/challenges/daily error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
