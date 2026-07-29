import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isValidPuzzleCode } from '@/utils/customPuzzle';

interface RouteParams {
  params: Promise<{ puzzleCode: string }>;
}

interface SearchParams {
  playerId?: string;
  guestFingerprint?: string;
}

/**
 * GET /api/custom-puzzle/[puzzleCode]/stats
 * Get aggregate statistics for a custom puzzle
 * Optionally include personal stats if playerId or guestFingerprint provided
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { puzzleCode } = await params;
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId') || undefined;
    const guestFingerprint = searchParams.get('guestFingerprint') || undefined;

    if (!isValidPuzzleCode(puzzleCode)) {
      return NextResponse.json(
        { error: 'Invalid puzzle code format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch aggregate stats from view
    const { data: stats, error: statsError } = await supabase
      .from('custom_puzzle_stats')
      .select('*')
      .eq('puzzle_code', puzzleCode.toLowerCase())
      .single();

    if (statsError) {
      console.error('Custom puzzle stats error:', statsError);
      // Return empty stats if puzzle hasn't been played yet
      const { data: puzzle } = await supabase
        .from('custom_puzzles')
        .select('puzzle_code, creator_display_name, target_word, created_at, creator_efficiency_score, language')
        .eq('puzzle_code', puzzleCode.toLowerCase())
        .single();

      if (!puzzle) {
        return NextResponse.json(
          { error: 'Puzzle not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        stats: {
          puzzleCode: puzzle.puzzle_code,
          creatorDisplayName: puzzle.creator_display_name,
          targetWord: puzzle.target_word,
          language: puzzle.language,
          createdAt: puzzle.created_at,
          creatorEfficiencyScore: puzzle.creator_efficiency_score,
          totalAttempts: 0,
          totalSolved: 0,
          solveRate: 0,
          avgAttemptsSolved: null,
          avgEfficiencyScore: null,
          maxEfficiencyScore: null,
          attemptDistribution: {},
          beatCreatorCount: 0,
        },
      });
    }

    // Build attempt distribution object
    const attemptDistribution: Record<string, number> = {};
    for (let i = 1; i <= 10; i++) {
      attemptDistribution[i.toString()] = stats[`solved_in_${i}`] || 0;
    }

    interface PersonalStats {
      solved: boolean;
      attemptsUsed: number;
      efficiencyScore: number;
      percentile: number;
      rank?: number | null;
      beatCreator: boolean;
      completedAt: string | null;
    }
    interface StatsResponse {
      success: true;
      stats: {
        puzzleCode: string;
        creatorDisplayName: string;
        targetWord: string;
        language: string;
        createdAt: string;
        creatorEfficiencyScore: number;
        totalAttempts: number;
        totalSolved: number;
        solveRate: number;
        avgAttemptsSolved: number | null;
        avgEfficiencyScore: number | null;
        maxEfficiencyScore: number | null;
        avgLifeRemaining: number | null;
        avgWordsDiscovered: number | null;
        attemptDistribution: Record<string, number>;
        beatCreatorCount: number;
        yourStats?: PersonalStats;
      };
    }
    const response: StatsResponse = {
      success: true,
      stats: {
        puzzleCode: stats.puzzle_code,
        creatorDisplayName: stats.creator_display_name,
        targetWord: stats.target_word,
        language: stats.language,
        createdAt: stats.created_at,
        creatorEfficiencyScore: stats.creator_efficiency_score,
        totalAttempts: stats.total_attempts || 0,
        totalSolved: stats.total_solved || 0,
        solveRate: stats.solve_rate || 0,
        avgAttemptsSolved: stats.avg_attempts_solved || null,
        avgEfficiencyScore: stats.avg_efficiency_score || null,
        maxEfficiencyScore: stats.max_efficiency_score || null,
        avgLifeRemaining: stats.avg_life_remaining || null,
        avgWordsDiscovered: stats.avg_words_discovered || null,
        attemptDistribution,
        beatCreatorCount: stats.beat_creator_count || 0,
      },
    };

    // If playerId or guestFingerprint provided, get their personal stats
    if (playerId || guestFingerprint) {
      const code = puzzleCode.toLowerCase();
      const idFilter = playerId
        ? { column: 'player_id' as const, value: playerId }
        : { column: 'guest_fingerprint' as const, value: guestFingerprint! };

      // Fetch attempt and rank in parallel
      const [attemptResult, rankResult] = await Promise.all([
        supabase
          .from('custom_puzzle_attempts')
          .select('solved, attempts_used, efficiency_score, completed_at')
          .eq('puzzle_code', code)
          .eq(idFilter.column, idFilter.value)
          .single(),
        supabase
          .from('custom_puzzle_leaderboard')
          .select('rank_position')
          .eq('puzzle_code', code)
          .eq(idFilter.column, idFilter.value)
          .single(),
      ]);

      const yourAttempt = attemptResult.data;

      if (yourAttempt && yourAttempt.solved) {
        const rank = rankResult.data?.rank_position;

        // Calculate percentile
        let percentile = 0;
        const totalSolved = stats.total_solved || 0;
        if (rank && totalSolved > 0) {
          const playersBehindYou = totalSolved - rank;
          percentile = Math.round((playersBehindYou / totalSolved) * 100);
        }

        // Check if they beat the creator
        const beatCreator = yourAttempt.efficiency_score > stats.creator_efficiency_score;

        response.stats.yourStats = {
          solved: yourAttempt.solved,
          attemptsUsed: yourAttempt.attempts_used,
          efficiencyScore: yourAttempt.efficiency_score,
          percentile,
          rank,
          beatCreator,
          completedAt: yourAttempt.completed_at,
        };
      } else if (yourAttempt) {
        response.stats.yourStats = {
          solved: yourAttempt.solved,
          attemptsUsed: yourAttempt.attempts_used,
          efficiencyScore: yourAttempt.efficiency_score,
          percentile: 0,
          beatCreator: false,
          completedAt: yourAttempt.completed_at,
        };
      }
    }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Custom puzzle stats error:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
