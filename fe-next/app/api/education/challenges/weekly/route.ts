import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { z } from 'zod';
import logger from '@/utils/logger';
import {
  getWeeklyQuests,
  assignWeeklyQuests,
  claimQuestReward,
} from '@/lib/supabase/education';

const claimBodySchema = z.object({
  questId: z.string().uuid(),
});

/**
 * GET /api/education/challenges/weekly
 * Returns this week's quests for the authenticated player.
 * Auto-assigns quests if none exist for the current week.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: quests, error } = await getWeeklyQuests(user.id);
    if (error) {
      logger.error('GET weekly quests error:', error);
      return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
    }

    // Auto-assign if none exist for this week
    if (quests.length === 0) {
      const { data: assigned, error: assignError } = await assignWeeklyQuests(user.id);
      if (assignError) {
        logger.error('Auto-assign weekly quests error:', assignError);
        return NextResponse.json({ error: 'Failed to assign quests' }, { status: 500 });
      }
      return NextResponse.json({ quests: assigned ?? [] });
    }

    return NextResponse.json({ quests });
  } catch (err) {
    logger.error('GET /api/education/challenges/weekly error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/education/challenges/weekly
 * Claims the reward for a completed weekly quest.
 * Body: { questId: string }
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

    const { questId } = parseResult.data;

    const { data: reward, error } = await claimQuestReward(questId, user.id);
    if (error) {
      logger.error('Claim quest reward error:', error);
      const status =
        error.message === 'Quest not found' || error.message === 'Weekly quests not available yet'
          ? 404
          : error.message === 'Player ID mismatch'
            ? 403
            : error.message === 'Quest not completed' || error.message === 'Quest already claimed'
              ? 409
              : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ reward });
  } catch (err) {
    logger.error('POST /api/education/challenges/weekly error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
