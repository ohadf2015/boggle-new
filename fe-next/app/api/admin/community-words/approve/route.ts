/**
 * API Route: /api/admin/community-words/approve
 * Approve a community word and optionally add to dictionary
 * POST: Approve word
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { captureApiError } from '@/utils/sentry';

/**
 * POST - Approve a community word
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
    const { word, language, addToDictionary = true } = body;

    if (!word || !language) {
      return NextResponse.json({ error: 'Word and language are required' }, { status: 400 });
    }

    // Update word_scores to mark as validated
    // Set likes_count high enough to trigger is_potentially_valid = true
    const { data: currentWord, error: fetchError } = await supabase
      .from('word_scores')
      .select('likes_count, dislikes_count')
      .eq('word', word)
      .eq('language', language)
      .single();

    if (fetchError) {
      console.error('[admin/approve] Error fetching word:', fetchError);
      return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }

    // Add enough likes to cross the threshold (6+ net score)
    const currentLikes = currentWord?.likes_count || 0;
    const currentDislikes = currentWord?.dislikes_count || 0;
    const currentNet = currentLikes - currentDislikes;
    const likesNeeded = Math.max(0, 6 - currentNet);

    const { error: updateError } = await supabase
      .from('word_scores')
      .update({
        likes_count: currentLikes + likesNeeded,
        last_voted_at: new Date().toISOString()
      })
      .eq('word', word)
      .eq('language', language);

    if (updateError) {
      console.error('[admin/approve] Error updating word:', updateError);
      captureApiError(new Error(updateError.message), '/api/admin/community-words/approve', {
        method: 'POST',
        statusCode: 500,
        body: { word, language }
      });
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If addToDictionary is true, persist to approved dictionary file
    if (addToDictionary) {
      try {
        const { addToCommunityCache } = await import('@/backend/modules/communityWordManager');
        await addToCommunityCache(word, language);
      } catch (error) {
        console.warn('[admin/approve] Failed to add to dictionary cache:', error);
        // Continue - word is still approved in database
      }
    }

    return NextResponse.json({
      success: true,
      message: `Approved "${word}" (${language})`
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('[admin/approve] Error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/community-words/approve',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
