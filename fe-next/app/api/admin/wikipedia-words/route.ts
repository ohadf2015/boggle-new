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
  adminAddWordCandidate,
  syncLocalJSONToDatabase
} from '@/backend/services/wikipediaWordPopulator';
import { triggerWikipediaWordPopulation } from '@/backend/services/cronScheduler';
import type { Language } from '@/shared/types/game';

// Allow 90 seconds for Wikipedia API calls + AI scoring
// Wikipedia API can be slow (30s timeout per request + retries)
// With 7 languages in parallel, some may timeout and retry
export const maxDuration = 90;

const SUPPORTED_LANGUAGES: Language[] = ['en', 'he', 'sv', 'ja', 'es', 'fr', 'de'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('[Admin Wikipedia] GET request received');

  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    console.log('[Admin Wikipedia] GET auth failed:', authResult.error);
    return authResult.response!;
  }
  console.log('[Admin Wikipedia] GET auth passed for user:', authResult.user?.email);

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
  console.log('[Admin Wikipedia] POST request received');
  const startTime = Date.now();

  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    console.log('[Admin Wikipedia] POST auth failed:', authResult.error);
    return authResult.response!;
  }
  console.log('[Admin Wikipedia] POST auth passed for user:', authResult.user?.email);

  try {
    const body = await request.json();
    const { action, date, language, word, candidateId, status } = body;
    console.log('[Admin Wikipedia] POST action:', action, 'language:', language, 'date:', date);

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
        console.log('[Admin Wikipedia] Starting population trigger...');
        const targetDate = date ? new Date(date) : new Date();
        const targetLanguage = language as Language | undefined;

        const result = await triggerWikipediaWordPopulation(targetDate, targetLanguage);

        const duration = Date.now() - startTime;
        console.log(`[Admin Wikipedia] Population completed in ${duration}ms, success:`, result.success);

        return NextResponse.json({
          success: result.success,
          results: result.results
        });
      }

      case 'sync-json': {
        // Sync local JSON files to database
        console.log('[Admin Wikipedia] Starting JSON sync...');
        const targetLanguage = language as Language | undefined;

        const result = await syncLocalJSONToDatabase(targetLanguage);

        const duration = Date.now() - startTime;
        console.log(`[Admin Wikipedia] JSON sync completed in ${duration}ms, success:`, result.success);

        return NextResponse.json({
          success: result.success,
          results: result.results
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use: add, populate, sync-json` },
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
