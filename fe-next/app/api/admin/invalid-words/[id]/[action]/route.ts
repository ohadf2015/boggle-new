/**
 * API Route: POST /api/admin/invalid-words/[id]/[action]
 * Approve or reject individual invalid word submissions.
 * Actions: 'approve' | 'reject'
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { captureApiError } from '@/utils/sentry';

const VALID_ACTIONS = new Set(['approve', 'reject']);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { id, action } = await params;

    if (!VALID_ACTIONS.has(action)) {
      return NextResponse.json(
        { error: `Invalid action "${action}". Must be "approve" or "reject".` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Verify the submission exists
    const { data: submission, error: fetchError } = await supabase
      .from('invalid_word_submissions')
      .select('id, word, language, submission_count, approved_at')
      .eq('id', id)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Mark as approved
      const { error: updateError } = await supabase
        .from('invalid_word_submissions')
        .update({
          approved_at: new Date().toISOString(),
          approved_by: authResult.user?.id || 'admin',
        })
        .eq('id', id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Add to word_scores so the word is recognized in gameplay
      const votesNeeded = Math.max(10, Math.min((submission.submission_count || 1) * 2, 20));
      await supabase
        .from('word_scores')
        .upsert(
          {
            word: submission.word,
            language: submission.language,
            likes_count: votesNeeded,
            dislikes_count: 0,
            first_submitter: 'admin_approved',
            last_voted_at: new Date().toISOString(),
          },
          { onConflict: 'word,language' }
        );

      // Remove from blacklist if present
      await supabase
        .from('bot_word_blacklist')
        .delete()
        .eq('word', submission.word)
        .eq('language', submission.language);

      logger.log(`[Admin] Approved word: "${submission.word}" (${submission.language}) by ${authResult.user?.email}`);

      return NextResponse.json({
        success: true,
        action: 'approved',
        word: submission.word,
        language: submission.language,
      });
    }

    // action === 'reject'
    const { error: rejectError } = await supabase
      .from('invalid_word_submissions')
      .update({
        rejected_at: new Date().toISOString(),
        rejected_by: authResult.user?.id || 'admin',
      })
      .eq('id', id);

    if (rejectError) {
      // If rejected_at column doesn't exist, just delete the submission
      await supabase
        .from('invalid_word_submissions')
        .delete()
        .eq('id', id);
    }

    logger.log(`[Admin] Rejected word: "${submission.word}" (${submission.language}) by ${authResult.user?.email}`);

    return NextResponse.json({
      success: true,
      action: 'rejected',
      word: submission.word,
      language: submission.language,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logger.error('[admin/invalid-words/action] Error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/invalid-words/[id]/[action]',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
