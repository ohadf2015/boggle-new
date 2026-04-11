/**
 * Record Invalid Word API
 *
 * POST /api/invalid-word/record
 *
 * Records invalid word submissions from all game modes for admin review.
 * Uses the same backend function as multiplayer mode.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import type { Language } from '@/types';
import { captureApiError } from '@/utils/sentry';

/** Valid reasons for invalid word submissions */
type InvalidWordReason = 'not_on_board' | 'not_in_dictionary' | 'peer_rejected' | 'too_short';

/** Valid game modes */
type GameMode = 'multiplayer' | 'adventure' | 'daily_word_hunt' | 'single_player' | 'drill';

interface RecordInvalidWordRequest {
  word: string;
  language: Language;
  reason: InvalidWordReason;
  gameMode?: GameMode;
}

interface RecordInvalidWordResponse {
  success: boolean;
  error?: string;
}

// Rate limiting: simple in-memory counter per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP
const RATE_LIMIT_MAX_ENTRIES = 10000; // Cap map size to prevent OOM

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // Evict expired entries inline when map is large instead of a separate interval
    if (rateLimitMap.size > RATE_LIMIT_MAX_ENTRIES) {
      for (const [key, val] of rateLimitMap) {
        if (now > val.resetTime) rateLimitMap.delete(key);
      }
    }
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * POST handler for recording invalid words
 */
export async function POST(request: NextRequest): Promise<NextResponse<RecordInvalidWordResponse>> {
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown';

  // Check rate limit
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json() as Partial<RecordInvalidWordRequest>;
    const { word, language, reason, gameMode } = body;

    // Input validation
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

    if (!reason || !['not_on_board', 'not_in_dictionary', 'peer_rejected', 'too_short'].includes(reason)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid reason' },
        { status: 400 }
      );
    }

    // Normalize word
    const normalizedWord = word.toLowerCase().trim();

    // Skip very short words (likely typos) - same logic as backend
    if (normalizedWord.length < 2) {
      return NextResponse.json({ success: true }); // Silent success for short words
    }

    // Skip if reason is 'too_short' (we don't need to track these)
    if (reason === 'too_short') {
      return NextResponse.json({ success: true });
    }

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Silently succeed if Supabase is not configured (non-critical feature)
      logger.warn('[InvalidWord] Supabase not configured, skipping record');
      return NextResponse.json({ success: true });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use the same RPC function as the backend
    const { error } = await supabase.rpc('record_invalid_word_submission', {
      p_word: normalizedWord,
      p_language: language,
      p_reason: reason,
    });

    if (error) {
      // Log error but still return success (non-critical functionality)
      logger.warn(`[InvalidWord] Failed to record "${normalizedWord}" (${reason}): ${error.message}`);
      // Still return success - this is non-critical
      return NextResponse.json({ success: true });
    }

    logger.log(`[InvalidWord] Recorded "${normalizedWord}" (${language}, ${reason}, ${gameMode || 'unknown'})`);
    return NextResponse.json({ success: true });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/invalid-word/record', { method: 'POST' });
    const err = error as Error;
    logger.error('[InvalidWord] Error:', err.message);
    // Return success even on error - this is non-critical functionality
    return NextResponse.json({ success: true });
  }
}
