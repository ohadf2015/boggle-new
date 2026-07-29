/**
 * API Route: /api/admin/community-words/disapprove
 * Disapprove/reject a community word
 * POST: Reject word
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { captureApiError } from '@/utils/sentry';

/**
 * POST - Disapprove/reject a community word
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { word, language, blacklist = false } = body;

    if (!word || !language) {
      return NextResponse.json({ error: 'Word and language are required' }, { status: 400 });
    }

    // Update word_scores to mark as rejected (negative net_score)
    const { data: currentWord, error: fetchError } = await supabase
      .from('word_scores')
      .select('likes_count, dislikes_count')
      .eq('word', word)
      .eq('language', language)
      .single();

    if (fetchError) {
      logger.error('[admin/disapprove] Error fetching word:', fetchError);
      return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }

    // Add enough dislikes to make net_score negative (ensure net_score <= -5 for strong rejection)
    const currentLikes = currentWord?.likes_count || 0;
    const currentDislikes = currentWord?.dislikes_count || 0;
    const currentNet = currentLikes - currentDislikes;
    const dislikesNeeded = Math.max(0, currentNet + 5);

    const { error: updateError } = await supabase
      .from('word_scores')
      .update({
        dislikes_count: currentDislikes + dislikesNeeded,
        last_voted_at: new Date().toISOString()
      })
      .eq('word', word)
      .eq('language', language);

    if (updateError) {
      logger.error('[admin/disapprove] Error updating word:', updateError);
      captureApiError(new Error(updateError.message), '/api/admin/community-words/disapprove', {
        method: 'POST',
        statusCode: 500,
        body: { word, language }
      });
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If blacklist is true, add to blacklist table (optional - implement if table exists)
    if (blacklist) {
      // TODO: Implement blacklist table if needed
      logger.log('[admin/disapprove] Blacklist not yet implemented');
    }

    return NextResponse.json({
      success: true,
      message: `Rejected "${word}" (${language})`
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logger.error('[admin/disapprove] Error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/community-words/disapprove',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
