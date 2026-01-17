/**
 * Admin API: Wikipedia Word Candidates
 * GET /api/admin/wikipedia-words?date=YYYY-MM-DD&language=en
 * POST /api/admin/wikipedia-words - Add custom word
 *
 * Returns word candidates for admin review and management
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import {
  getWordCandidatesForAdmin,
  adminAddWordCandidate
} from '@/backend/services/wikipediaWordPopulator';
import { triggerWikipediaWordPopulation } from '@/backend/services/cronScheduler';
import type { Language } from '@/shared/types/game';

const SUPPORTED_LANGUAGES: Language[] = ['en', 'he', 'sv', 'ja', 'es', 'fr', 'de'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const language = (searchParams.get('language') || 'en') as Language;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD' },
      { status: 400 }
    );
  }

  // Validate language
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return NextResponse.json(
      { error: `Unsupported language. Use: ${SUPPORTED_LANGUAGES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const candidates = await getWordCandidatesForAdmin(language, new Date(date));

    return NextResponse.json({
      success: true,
      data: {
        date,
        language,
        candidates,
        total: candidates.length
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Wikipedia] Error fetching candidates:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to fetch word candidates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const body = await request.json();
    const { action, date, language, word, candidateId, status } = body;

    // Validate language
    if (language && !SUPPORTED_LANGUAGES.includes(language as Language)) {
      return NextResponse.json(
        { error: `Unsupported language. Use: ${SUPPORTED_LANGUAGES.join(', ')}` },
        { status: 400 }
      );
    }

    switch (action) {
      case 'add': {
        // Add custom word candidate
        if (!word || !language || !date) {
          return NextResponse.json(
            { error: 'Missing required fields: word, language, date' },
            { status: 400 }
          );
        }

        const result = await adminAddWordCandidate(
          language as Language,
          new Date(date),
          word,
          'admin'
        );

        if (!result.success) {
          return NextResponse.json(
            { error: 'Failed to add word candidate' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Word "${word}" added successfully`,
          id: result.id
        });
      }

      case 'populate': {
        // Trigger Wikipedia word population
        const targetDate = date ? new Date(date) : new Date();
        const targetLanguage = language as Language | undefined;

        const result = await triggerWikipediaWordPopulation(targetDate, targetLanguage);

        return NextResponse.json({
          success: result.success,
          results: result.results
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use: add, populate` },
          { status: 400 }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Wikipedia] Error processing request:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
