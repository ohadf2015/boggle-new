/**
 * Word Forge Run Completion API
 *
 * POST - Save run results and update meta-progression (XP, unlocks, stats)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { calculateRunXp, getUnlockTier } from '@/lib/wordForge/scoring';
import { captureApiError } from '@/utils/sentry';

interface RunCompletionBody {
  highestRound: number;
  totalWords: number;
  totalScore: number;
  won: boolean;
  bestWord: string;
  bestWordScore: number;
  runeIds: string[];
  roundHistory: Array<{
    round: number;
    score: number;
    target: number;
    passed: boolean;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const rateLimitResult = checkApiRateLimit(request, 'word-forge-complete', {
      maxRequests: 10,
      windowMs: 60000,
    });
    if (!rateLimitResult.success) return rateLimitResponse(rateLimitResult);

    // Auth (user-scoped client — identity only)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Progression writes use the service-role client: word_forge_progress RLS
    // blocks direct client writes so users can't self-grant total_xp /
    // unlock_tier (which gate rune unlocks). Server owns XP authority.
    const db = createAdminClient();
    if (!db) {
      captureApiError(new Error('Service role client unavailable'), 'word-forge-complete-noadmin');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Parse body
    const body: RunCompletionBody = await request.json();
    const { highestRound, totalWords, totalScore, won } = body;

    // Validate
    if (!highestRound || highestRound < 1 || highestRound > 100) {
      return NextResponse.json({ error: 'Invalid highestRound' }, { status: 400 });
    }
    if (totalScore < 0 || totalWords < 0) {
      return NextResponse.json({ error: 'Invalid score/words' }, { status: 400 });
    }

    // Calculate XP
    const xpEarned = calculateRunXp(highestRound, totalWords, totalScore, won);

    // Get or create progression record
    const { data: existing } = await db
      .from('word_forge_progress')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const now = new Date().toISOString();

    if (existing) {
      // Update existing
      const newTotalXp = existing.total_xp + xpEarned;
      const newUnlockTier = getUnlockTier(newTotalXp);

      const { error: updateError } = await db
        .from('word_forge_progress')
        .update({
          total_xp: newTotalXp,
          unlock_tier: newUnlockTier,
          highest_round: Math.max(existing.highest_round, highestRound),
          total_runs: existing.total_runs + 1,
          runs_won: won ? existing.runs_won + 1 : existing.runs_won,
          best_run_score: Math.max(existing.best_run_score, totalScore),
          last_played_at: now,
          updated_at: now,
        })
        .eq('user_id', user.id);

      if (updateError) {
        captureApiError(updateError, 'word-forge-complete-update');
        return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        xpEarned,
        totalXp: newTotalXp,
        unlockTier: newUnlockTier,
        newHighest: highestRound > existing.highest_round,
        newBestScore: totalScore > existing.best_run_score,
      });
    } else {
      // Create new record
      const unlockTier = getUnlockTier(xpEarned);

      const { error: insertError } = await db
        .from('word_forge_progress')
        .insert({
          user_id: user.id,
          total_xp: xpEarned,
          unlock_tier: unlockTier,
          highest_round: highestRound,
          total_runs: 1,
          runs_won: won ? 1 : 0,
          best_run_score: totalScore,
          max_rune_slots: 5,
          last_played_at: now,
        });

      if (insertError) {
        captureApiError(insertError, 'word-forge-complete-insert');
        return NextResponse.json({ error: 'Failed to create progress' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        xpEarned,
        totalXp: xpEarned,
        unlockTier,
        newHighest: true,
        newBestScore: true,
      });
    }
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), 'word-forge-complete');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
