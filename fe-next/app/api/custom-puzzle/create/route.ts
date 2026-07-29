import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generatePuzzleCode, calculateCustomPuzzleScore } from '@/utils/customPuzzle';
import { normalizeHebrewFinalLetters } from '@/utils/dailyChallenge/constants';
import type { LetterGrid, Language } from '@/types';

interface CreatePuzzleRequest {
  language: Language;
  targetWord: string;
  grid: LetterGrid;
  displayName: string;
  guestFingerprint?: string;
  // Creator's first play results - Optional if creating without playing
  creatorSolved?: boolean;
  creatorAttemptsUsed?: number;
  creatorWordsDiscovered?: number;
  creatorLifeRemaining?: number;
}

export async function POST(request: Request) {
  try {
    const body: CreatePuzzleRequest = await request.json();
    const {
      language,
      targetWord,
      grid,
      displayName,
      guestFingerprint,
      creatorSolved,
      creatorAttemptsUsed,
      creatorWordsDiscovered,
      creatorLifeRemaining,
    } = body;

    // Validate required fields
    if (!language || !targetWord || !grid || !displayName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate target word length
    if (targetWord.length < 3 || targetWord.length > 10) {
      return NextResponse.json(
        { error: 'Target word must be 3-10 characters' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user if available
    const { data: { user } } = await supabase.auth.getUser();

    // Generate unique puzzle code
    let puzzleCode = generatePuzzleCode();
    let attempts = 0;
    const maxAttempts = 5;

    // Ensure code is unique
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('custom_puzzles')
        .select('id')
        .eq('puzzle_code', puzzleCode)
        .single();

      if (!existing) break;
      puzzleCode = generatePuzzleCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Failed to generate unique puzzle code' },
        { status: 500 }
      );
    }

    // Calculate creator's efficiency score
    const creatorEfficiencyScore = creatorSolved !== undefined 
      ? calculateCustomPuzzleScore(
        creatorSolved,
        creatorAttemptsUsed || 0,
        creatorWordsDiscovered || 0,
        creatorLifeRemaining || 0
      )
      : 0;

    // Normalize Hebrew final letters before storing
    // This ensures the stored target word matches the grid letters
    const normalizedTargetWord = language === 'he'
      ? normalizeHebrewFinalLetters(targetWord.toUpperCase())
      : targetWord.toUpperCase();

    // Create the puzzle
    const { data: puzzle, error } = await supabase
      .from('custom_puzzles')
      .insert({
        puzzle_code: puzzleCode,
        creator_id: user?.id || null,
        creator_guest_fingerprint: user ? null : (guestFingerprint || null),
        creator_display_name: displayName,
        language,
        target_word: normalizedTargetWord,
        grid,
        creator_solved: creatorSolved || false,
        creator_attempts_used: creatorAttemptsUsed || 0,
        creator_efficiency_score: creatorEfficiencyScore,
      })
      .select()
      .single();

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error('Error creating puzzle:', errorMessage);
      return NextResponse.json(
        { error: 'Failed to create puzzle' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      puzzleCode,
      puzzleId: puzzle.id,
      creatorEfficiencyScore,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Create puzzle error:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
