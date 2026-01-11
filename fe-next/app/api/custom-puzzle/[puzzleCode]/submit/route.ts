import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isValidPuzzleCode, calculateCustomPuzzleScore } from '@/utils/customPuzzle';

interface RouteParams {
  params: Promise<{ puzzleCode: string }>;
}

interface AttemptWord {
  word: string;
  feedback: Array<{
    letter: string;
    feedback: 'green' | 'yellow' | 'gray';
    position: number;
  }>;
  timestamp: number;
}

interface WordDiscovered {
  word: string;
  timestamp: number;
  lifeGained: number;
  tokensGained: number;
}

interface SubmitAttemptRequest {
  displayName: string;
  avatarEmoji?: string;
  avatarColor?: string;
  avatarImage?: string;
  countryCode?: string;
  guestFingerprint?: string;
  solved: boolean;
  attemptsUsed: number;
  targetWord: string;
  attemptWords: AttemptWord[];
  // Survival mode fields
  wordsDiscovered?: WordDiscovered[];
  lifeRemaining?: number;
  clueTokensEarned?: number;
  clueTokensSpent?: number;
  hintsUnlocked?: number;
  efficiencyScore?: number;
}

/**
 * POST /api/custom-puzzle/[puzzleCode]/submit
 * Submit an attempt for a custom puzzle
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { puzzleCode } = await params;
    const body: SubmitAttemptRequest = await request.json();
    const {
      displayName,
      avatarEmoji,
      avatarColor,
      avatarImage,
      countryCode,
      guestFingerprint,
      solved,
      attemptsUsed,
      targetWord,
      attemptWords,
      wordsDiscovered,
      lifeRemaining,
      clueTokensEarned,
      clueTokensSpent,
      hintsUnlocked,
      efficiencyScore: providedEfficiencyScore,
    } = body;

    if (!isValidPuzzleCode(puzzleCode)) {
      return NextResponse.json(
        { error: 'Invalid puzzle code format' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!displayName || !targetWord || !attemptWords || attemptsUsed === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate attempts range
    if (attemptsUsed < 1 || attemptsUsed > 10) {
      return NextResponse.json(
        { error: 'Attempts must be between 1 and 10' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user if available
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profileData } = user
      ? await supabase.from('profiles').select('avatar_emoji, avatar_color, avatar_image, profile_picture_url').eq('id', user.id).single()
      : { data: null };

    // Fetch the puzzle to verify it exists
    const { data: puzzle, error: puzzleError } = await supabase
      .from('custom_puzzles')
      .select('id, puzzle_code, target_word, creator_id, creator_guest_fingerprint, creator_efficiency_score')
      .eq('puzzle_code', puzzleCode.toLowerCase())
      .single();

    if (puzzleError || !puzzle) {
      return NextResponse.json(
        { error: 'Puzzle not found' },
        { status: 404 }
      );
    }

    // Verify target word matches
    if (puzzle.target_word.toUpperCase() !== targetWord.toUpperCase()) {
      return NextResponse.json(
        { error: 'Invalid target word for this puzzle' },
        { status: 400 }
      );
    }

    // Calculate player's efficiency score
    const efficiencyScore = providedEfficiencyScore !== undefined
      ? providedEfficiencyScore
      : calculateCustomPuzzleScore(
          solved,
          attemptsUsed,
          wordsDiscovered?.length || 0,
          lifeRemaining || 0
        );

    // Insert attempt (uses unique constraint to prevent duplicates)
    const insertData: any = {
      puzzle_id: puzzle.id,
      player_id: user?.id || null,
      guest_fingerprint: user ? null : (guestFingerprint || null),
      display_name: displayName,
      avatar_emoji: avatarEmoji || profileData?.avatar_emoji || '🎯',
      avatar_color: avatarColor || profileData?.avatar_color || '#6366f1',
      avatar_image: avatarImage || profileData?.avatar_image || undefined,
      profile_picture_url: profileData?.profile_picture_url || undefined,
      country_code: countryCode || undefined,
      solved,
      attempts_used: attemptsUsed,
      target_word: targetWord.toUpperCase(),
      attempt_words: attemptWords,
      completed_at: new Date().toISOString(),
    };

    // Add survival mode fields if present
    if (wordsDiscovered !== undefined) {
      insertData.words_discovered = wordsDiscovered;
    }
    if (lifeRemaining !== undefined) {
      insertData.life_remaining = Math.round(lifeRemaining);
    }
    if (clueTokensEarned !== undefined) {
      insertData.clue_tokens_earned = Math.round(clueTokensEarned);
    }
    if (clueTokensSpent !== undefined) {
      insertData.clue_tokens_spent = Math.round(clueTokensSpent);
    }
    if (hintsUnlocked !== undefined) {
      insertData.hints_unlocked = Math.round(hintsUnlocked);
    }
    if (efficiencyScore !== undefined) {
      insertData.efficiency_score = Math.round(efficiencyScore);
    }

    const { data: attemptData, error: attemptError } = await supabase
      .from('custom_puzzle_attempts')
      .insert(insertData)
      .select()
      .single();

    if (attemptError) {
      // Check for unique constraint violation (already submitted)
      if (attemptError.code === '23505') {
        return NextResponse.json({
          success: true,
          alreadySubmitted: true,
          efficiencyScore,
        });
      }
      console.error('Error submitting attempt:', attemptError);
      return NextResponse.json(
        { error: 'Failed to submit attempt' },
        { status: 500 }
      );
    }

    // Check if they beat the creator
    const beatCreator = efficiencyScore > puzzle.creator_efficiency_score;

    return NextResponse.json({
      success: true,
      alreadySubmitted: false,
      data: attemptData,
      efficiencyScore,
      beatCreator,
      creatorScore: puzzle.creator_efficiency_score,
    });
  } catch (error) {
    console.error('Submit attempt error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
