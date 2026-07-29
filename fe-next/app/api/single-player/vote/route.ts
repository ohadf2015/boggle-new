/**
 * Single Player Vote API
 * Handles community word voting for single player mode
 * Allows players to vote on bot words to help build the community dictionary
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { captureApiError } from '@/utils/sentry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Create a simple Supabase client for anonymous operations (no cookies needed)
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Constants from communityWordManager (must match database is_potentially_valid threshold)
const PROMINENT_THRESHOLD = 6;

// Word normalization functions
const hebrewFinalToRegular: Record<string, string> = {
  'ך': 'כ', // Final Kaf -> Regular Kaf
  'ם': 'מ', // Final Mem -> Regular Mem
  'ן': 'נ', // Final Nun -> Regular Nun
  'ף': 'פ', // Final Pe -> Regular Pe
  'ץ': 'צ', // Final Tsadi -> Regular Tsadi
};

function normalizeWord(word: string, language: string): string {
  let normalized = word.toLowerCase().trim();

  // Hebrew-specific normalization: convert final forms to regular forms
  if (language === 'he') {
    normalized = normalized.split('').map(char => hebrewFinalToRegular[char] || char).join('');
  }

  return normalized;
}

interface VoteRequest {
  word: string;
  language: string;
  voteType: 'like' | 'dislike';
  sessionId: string;
}

export async function POST(request: NextRequest) {
  // Rate limit: 30 votes per 60 seconds
  const rateLimitResult = checkApiRateLimit(request, 'single-player-vote', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429 }
    );
  }

  try {
    const body: VoteRequest = await request.json();
    const { word, language, voteType, sessionId } = body;

    // Validate required fields
    if (!word || typeof word !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid word' },
        { status: 400 }
      );
    }

    if (!language || typeof language !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid language' },
        { status: 400 }
      );
    }

    if (!voteType || (voteType !== 'like' && voteType !== 'dislike')) {
      return NextResponse.json(
        { success: false, error: 'Invalid vote type. Must be "like" or "dislike"' },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 8 || sessionId.length > 128) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid session ID' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const normalizedWord = normalizeWord(word, language);
    const guestId = `sp_${sessionId}`;
    const gameCode = `sp_${sessionId}`;

    // Insert the vote
    const { error: insertError } = await supabase
      .from('word_votes')
      .insert({
        word: normalizedWord,
        language,
        game_code: gameCode,
        vote_type: voteType,
        guest_id: guestId,
        is_bot_word: true
      });

    if (insertError) {
      // Check if it's a duplicate vote error
      if (insertError.code === '23505') {
        return NextResponse.json({
          success: false,
          error: 'Already voted on this word'
        });
      }
      console.error('Error recording vote:', insertError.message);
      return NextResponse.json({
        success: false,
        error: insertError.message
      });
    }

    // Check if word crossed the threshold
    const { data: scoreData, error: scoreError } = await supabase
      .from('word_scores')
      .select('net_score, is_potentially_valid')
      .eq('word', normalizedWord)
      .eq('language', language)
      .single();

    if (scoreError && scoreError.code !== 'PGRST116') {
      // Vote was recorded successfully, just couldn't check threshold
      return NextResponse.json({
        success: true,
        isNowValid: false,
        message: `Vote recorded: ${voteType} for "${word}"`
      });
    }

    const isNowValid = scoreData?.is_potentially_valid === true ||
                       (scoreData?.net_score || 0) >= PROMINENT_THRESHOLD;

    return NextResponse.json({
      success: true,
      isNowValid,
      message: `Vote recorded: ${voteType} for "${word}"`
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/single-player/vote', { method: 'POST' });
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in single-player vote API:', errorMessage);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
