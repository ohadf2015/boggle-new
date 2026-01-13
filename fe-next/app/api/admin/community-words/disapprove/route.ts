/**
 * API Route: /api/admin/community-words/disapprove
 * Disapprove/reject a community word
 * POST: Reject word
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Get Supabase admin client
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Check if request has valid admin authorization
 */
async function isAdminRequest(request: NextRequest): Promise<{ isAdmin: boolean; userId?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { isAdmin: false };
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAdmin: false };
  }

  const token = authHeader.substring(7);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { isAdmin: false };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    return { isAdmin: false };
  }

  return { isAdmin: true, userId: user.id };
}

/**
 * POST - Disapprove/reject a community word
 */
export async function POST(request: NextRequest) {
  try {
    const { isAdmin } = await isAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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
      console.error('[admin/disapprove] Error fetching word:', fetchError);
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
      console.error('[admin/disapprove] Error updating word:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If blacklist is true, add to blacklist table (optional - implement if table exists)
    if (blacklist) {
      // TODO: Implement blacklist table if needed
      console.log('[admin/disapprove] Blacklist not yet implemented');
    }

    return NextResponse.json({
      success: true,
      message: `Rejected "${word}" (${language})`
    });

  } catch (error) {
    console.error('[admin/disapprove] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
