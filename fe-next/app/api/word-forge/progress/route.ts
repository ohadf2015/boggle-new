/**
 * Word Forge Progress API
 *
 * GET - Fetch current user's Word Forge meta-progression
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('word_forge_progress')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows — that's fine for new players
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }

    if (!data) {
      // New player — return defaults
      return NextResponse.json({
        success: true,
        progress: {
          totalXp: 0,
          unlockTier: 0,
          highestRound: 0,
          totalRuns: 0,
          runsWon: 0,
          bestRunScore: 0,
          maxRuneSlots: 5,
          lastPlayedAt: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      progress: {
        totalXp: data.total_xp,
        unlockTier: data.unlock_tier,
        highestRound: data.highest_round,
        totalRuns: data.total_runs,
        runsWon: data.runs_won,
        bestRunScore: data.best_run_score,
        maxRuneSlots: data.max_rune_slots,
        lastPlayedAt: data.last_played_at,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
