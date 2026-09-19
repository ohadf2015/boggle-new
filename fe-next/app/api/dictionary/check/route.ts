/**
 * API Route: /api/dictionary/check
 * Checks if a single word exists in the dictionary.
 * Used as fallback when client-side IndexedDB cache is unavailable
 * (e.g., Capacitor Android WebView).
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadWordChecker } from '@/lib/server/dictionarySet';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, language } = body;

    if (!word || typeof word !== 'string') {
      return NextResponse.json({ isValid: false, error: 'Missing word' }, { status: 400 });
    }

    const lang = language || 'en';
    if (!['en', 'es', 'he', 'sv', 'ja', 'ru'].includes(lang)) {
      return NextResponse.json({ isValid: false, error: 'Invalid language' }, { status: 400 });
    }

    const normalizedWord = word.toLowerCase().trim();
    if (normalizedWord.length === 0 || normalizedWord.length > 50) {
      return NextResponse.json({ isValid: false });
    }

    const isWord = await loadWordChecker(lang);
    const isValid = isWord ? isWord(normalizedWord) : false;

    return NextResponse.json(
      { isValid, source: 'dictionary' },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        },
      }
    );
  } catch (error) {
    console.error('[dictionary/check] Error:', error);
    return NextResponse.json({ isValid: false, error: 'Server error' }, { status: 500 });
  }
}
