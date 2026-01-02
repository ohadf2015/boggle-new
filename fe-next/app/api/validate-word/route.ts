/**
 * API Route: /api/validate-word
 * Validates words for single-player mode
 * Supports English, Spanish, Hebrew, Swedish, and Japanese dictionaries
 * Also checks community-validated words (words with 6+ net votes)
 */

import { NextRequest } from 'next/server';
import englishWords from 'an-array-of-english-words';
import spanishWords from 'an-array-of-spanish-words';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { createClient } from '@supabase/supabase-js';

// Pre-build dictionaries at module load (cached by Next.js)
const englishDictionary = new Set(englishWords.map((w: string) => w.toLowerCase()));
const spanishDictionary = new Set(spanishWords.map((w: string) => w.toLowerCase()));

// Supabase client for checking community words
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

/**
 * Check if a word is community-validated (net_score >= 6)
 */
async function checkCommunityWord(word: string, language: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from('word_scores')
      .select('id')
      .eq('word', word)
      .eq('language', language)
      .eq('is_potentially_valid', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[validate-word] Community word check error:', error.message);
      return false;
    }

    return data !== null;
  } catch {
    return false;
  }
}

// Spanish accent normalization - accented vowels to base vowels for dictionary lookup
const spanishAccentMap: Record<string, string> = {
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u'
};

function normalizeSpanishWord(word: string): string {
  return word
    .toLowerCase()
    .split('')
    .map(c => spanishAccentMap[c] || c)
    .join('');
}

function normalizeWord(word: string, language: string): string {
  switch (language) {
    case 'es':
      return normalizeSpanishWord(word);
    case 'en':
    default:
      return word.toLowerCase();
  }
}

// Rate limit config: 300 requests per minute per IP
// Higher limit to accommodate multiple users on same network (family, office, cafe)
const RATE_LIMIT_CONFIG = {
  maxRequests: 300,
  windowMs: 60000,
  blockDurationMs: 300000, // 5 min block if abused
};

// Using Node.js runtime for dictionary caching efficiency
// Edge runtime would reload 11MB+ dictionary on every cold start
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkApiRateLimit(request, 'validate-word', RATE_LIMIT_CONFIG);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();
    const { word, language = 'en' } = body;

    // Basic validation
    if (!word || typeof word !== 'string') {
      return Response.json({
        isValid: false,
        reason: 'Invalid word format',
        source: 'format',
      }, { status: 400 });
    }

    const normalizedWord = normalizeWord(word.trim(), language);

    if (normalizedWord.length < 2) {
      return Response.json({
        isValid: false,
        reason: 'Word must be at least 2 letters',
        source: 'format',
      });
    }

    // Check dictionary based on language
    let isInDictionary = false;
    if (language === 'en' && englishDictionary.has(normalizedWord)) {
      isInDictionary = true;
    } else if (language === 'es' && spanishDictionary.has(normalizedWord)) {
      isInDictionary = true;
    }

    if (isInDictionary) {
      return Response.json({
        isValid: true,
        source: 'dictionary',
      });
    }

    // Check community-validated words (words with 6+ net votes)
    // Returns same response as dictionary words - players shouldn't know the difference
    const isCommunityValid = await checkCommunityWord(normalizedWord, language);
    if (isCommunityValid) {
      return Response.json({
        isValid: true,
        source: 'dictionary',
      });
    }

    // Word not in dictionary or community - return pending
    return Response.json({
      isValid: false,
      reason: 'Word not in dictionary',
      source: 'pending',
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[validate-word] Error:', msg);
    return Response.json({
      isValid: false,
      reason: 'Validation error',
      source: 'format',
    }, { status: 500 });
  }
}
