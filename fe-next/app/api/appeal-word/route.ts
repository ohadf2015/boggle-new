/**
 * Appeal Word API
 *
 * POST /api/appeal-word
 *
 * Allows players to appeal rejected words from multiplayer results.
 * Records the appeal in invalid_word_submissions for admin review.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { captureApiError } from '@/utils/sentry';

interface AppealWordResponse {
  success: boolean;
  error?: string;
}

// Rate limiting: 20 appeals per minute per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_MAX_ENTRIES = 5000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    if (rateLimitMap.size > RATE_LIMIT_MAX_ENTRIES) {
      for (const [key, val] of rateLimitMap) {
        if (now > val.resetTime) rateLimitMap.delete(key);
      }
    }
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
}

export async function POST(request: NextRequest): Promise<NextResponse<AppealWordResponse>> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') || 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { word, language } = body;

    if (!word || typeof word !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing or invalid word' }, { status: 400 });
    }

    if (!language || typeof language !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing or invalid language' }, { status: 400 });
    }

    const normalizedWord = word.toLowerCase().trim();

    if (normalizedWord.length < 3) {
      return NextResponse.json({ success: false, error: 'Word too short to appeal' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: true });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.rpc('record_word_appeal', {
      p_word: normalizedWord,
      p_language: language,
    });

    if (error) {
      console.warn(`[AppealWord] Failed to record appeal for "${normalizedWord}": ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/appeal-word', { method: 'POST' });
    console.error('[AppealWord] Error:', (error as Error).message);
    return NextResponse.json({ success: true });
  }
}
