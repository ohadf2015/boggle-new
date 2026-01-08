import { NextRequest, NextResponse } from 'next/server';
import type { Language } from '@/shared/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/drills/random-words
 * Get random words from dictionary for drill grid generation
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const language = (searchParams.get('language') || 'en') as Language;
    const count = parseInt(searchParams.get('count') || '15');
    const minLength = parseInt(searchParams.get('minLength') || '3');
    const maxLength = parseInt(searchParams.get('maxLength') || '6');

    // Validate inputs
    const validLanguages: Language[] = ['en', 'he', 'sv', 'es', 'ja'];
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language' },
        { status: 400 }
      );
    }

    // Import dictionary functions
    const { getRandomLongWords, ensureLanguageLoaded } = await import('@/backend/dictionary');
    
    // Ensure dictionary is loaded for this language
    await ensureLanguageLoaded(language);
    
    // Get random words from dictionary
    const words = getRandomLongWords(language, count, minLength, maxLength);

    return NextResponse.json({ words });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error getting random words:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to get random words' },
      { status: 500 }
    );
  }
}
