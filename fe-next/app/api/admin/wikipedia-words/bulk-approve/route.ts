/**
 * Admin API: Bulk Approve Wikipedia Word Candidates
 * POST /api/admin/wikipedia-words/bulk-approve
 *
 * Adds selected word candidates to the game dictionary (community_words)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { createClient } from '@supabase/supabase-js';
import type { Language } from '@/types';

// Maximum batch size to prevent timeout
const MAX_BATCH_SIZE = 100;

// Allow adequate time for AI validation of batch
export const maxDuration = 90;

interface BulkApproveRequest {
  candidateIds: string[];
  language: Language;
}

interface BulkApproveResult {
  success: boolean;
  approved: number;
  skipped: number;
  failed: number;
  errors: Array<{ word: string; error: string }>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[Admin BulkApprove] POST request received');

  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const body: BulkApproveRequest = await request.json();
    const { candidateIds, language } = body;

    // Validate input
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json(
        { error: 'candidateIds array is required' },
        { status: 400 }
      );
    }

    if (candidateIds.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_SIZE} candidates per batch` },
        { status: 400 }
      );
    }

    if (!language) {
      return NextResponse.json(
        { error: 'language is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase and AI service
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { gameAIService } = await import('@/lib/ai-service');

    // Fetch candidate details
    const { data: candidates, error: fetchError } = await supabase
      .from('wikipedia_word_candidates')
      .select('id, word, interestingness_score, validation_status')
      .in('id', candidateIds);

    if (fetchError) {
      throw new Error(`Failed to fetch candidates: ${fetchError.message}`);
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: 'No candidates found with provided IDs' },
        { status: 404 }
      );
    }

    // Process each candidate
    const result: BulkApproveResult = {
      success: true,
      approved: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (const candidate of candidates) {
      try {
        // Check if already in dictionary
        const existing = await gameAIService.checkDatabaseOnly(candidate.word, language);

        if (existing.source === 'database' && existing.isValid) {
          // Already in dictionary - update status but don't re-add
          result.skipped++;
          console.log(`[BulkApprove] Skipped ${candidate.word} - already in dictionary`);
        } else {
          // Add to dictionary via validateAndSaveWord
          const validationResult = await gameAIService.validateAndSaveWord(candidate.word, language);

          if (validationResult.isValid) {
            result.approved++;
            console.log(`[BulkApprove] Approved ${candidate.word} to dictionary`);
          } else {
            result.failed++;
            result.errors.push({
              word: candidate.word,
              error: validationResult.reason || 'AI validation failed',
            });
          }
        }

        // Update candidate status to 'valid' regardless
        await supabase
          .from('wikipedia_word_candidates')
          .update({ validation_status: 'valid' })
          .eq('id', candidate.id);

      } catch (error) {
        result.failed++;
        result.errors.push({
          word: candidate.word,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`[BulkApprove] Complete: ${result.approved} approved, ${result.skipped} skipped, ${result.failed} failed`);

    return NextResponse.json({
      success: result.failed === 0,
      ...result,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin BulkApprove] Error:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to process bulk approval' },
      { status: 500 }
    );
  }
}
