import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Re-export types for client use
export interface BoardTheme {
  nameKey: string;
  emoji: string;
  isHoliday: boolean;
}

export interface ThemedWordsResponse {
  words: string[];
  theme: BoardTheme;
}

import type { Language } from '@/shared/types';

// Import the themed words logic from backend
// Note: We need to use dynamic import since this is backend code
async function getThemedWordsWithTheme(
  language: Language,
  count: number,
  minLength: number,
  maxLength: number
): Promise<ThemedWordsResponse> {
  // Import the backend module
  const { getRandomLongWordsWithTheme } = await import('@/backend/dictionary');
  return getRandomLongWordsWithTheme(language, count, minLength, maxLength);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { language = 'en', count = 10, minLength = 3, maxLength = 12 } = body;

    // Validate inputs
    const validLanguages: Language[] = ['en', 'he', 'sv', 'es', 'ja'];
    if (!validLanguages.includes(language as Language)) {
      return NextResponse.json(
        { error: 'Invalid language' },
        { status: 400 }
      );
    }

    const result = await getThemedWordsWithTheme(language as Language, count, minLength, maxLength);

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error getting themed words:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to get themed words' },
      { status: 500 }
    );
  }
}

// Also support GET for simpler usage
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const language = searchParams.get('language') || 'en';
  const count = parseInt(searchParams.get('count') || '10');
  const minLength = parseInt(searchParams.get('minLength') || '3');
  const maxLength = parseInt(searchParams.get('maxLength') || '12');

  // Validate inputs
  const validLanguages: Language[] = ['en', 'he', 'sv', 'es', 'ja'];
  if (!validLanguages.includes(language as Language)) {
    return NextResponse.json(
      { error: 'Invalid language' },
      { status: 400 }
    );
  }

  try {
    const result = await getThemedWordsWithTheme(language as Language, count, minLength, maxLength);
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error getting themed words:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to get themed words' },
      { status: 500 }
    );
  }
}
