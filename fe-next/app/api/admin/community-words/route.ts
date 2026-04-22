/**
 * API Route: /api/admin/community-words
 * Admin endpoint for managing community-submitted words
 * GET: Fetch community words with filters
 * Only accessible to admin users
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { captureApiError } from '@/utils/sentry';

/**
 * Determine word status based on net_score and is_potentially_valid
 */
function getWordStatus(netScore: number, isPotentiallyValid: boolean): string {
  if (isPotentiallyValid) {
    return 'validated';
  } else if (netScore >= 3) {
    return 'pending_review';
  } else if (netScore < 0) {
    return 'rejected';
  }
  return 'pending';
}

/**
 * GET - Fetch community words with filters
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending_review';
    const language = searchParams.get('language');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'net_score';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let query = supabase
      .from('word_scores')
      .select('*', { count: 'exact' });

    // Apply status filter
    if (status !== 'all') {
      if (status === 'validated') {
        query = query.eq('is_potentially_valid', true);
      } else if (status === 'pending_review') {
        query = query.eq('is_potentially_valid', false).gte('net_score', 3);
      } else if (status === 'rejected') {
        query = query.lt('net_score', 0);
      } else if (status === 'pending') {
        query = query.eq('is_potentially_valid', false).gte('net_score', 0).lt('net_score', 3);
      }
    }

    // Apply language filter
    if (language && language !== 'all') {
      query = query.eq('language', language);
    }

    // Apply search filter
    if (search) {
      query = query.ilike('word', `%${search}%`);
    }

    // Apply sorting
    const ascending = sortBy === 'word';
    query = query.order(sortBy, { ascending }).limit(limit);

    const { data, error, count } = await query;

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error('[admin/community-words] Query error:', error);
      captureApiError(new Error(errorMessage), '/api/admin/community-words', {
        method: 'GET',
        statusCode: 500
      });
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    interface WordScoreRow {
      net_score?: number | null;
      is_potentially_valid?: boolean | null;
      [key: string]: unknown;
    }
    const words = ((data || []) as WordScoreRow[]).map((word) => ({
      ...word,
      status: getWordStatus(word.net_score || 0, word.is_potentially_valid || false)
    }));

    // Calculate stats
    const { data: statsData } = await supabase
      .from('word_scores')
      .select('is_potentially_valid, net_score');

    const stats = {
      total: count || 0,
      validated: statsData?.filter(w => w.is_potentially_valid).length || 0,
      pendingReview: statsData?.filter(w => !w.is_potentially_valid && (w.net_score || 0) >= 3).length || 0,
      rejected: statsData?.filter(w => (w.net_score || 0) < 0).length || 0,
      pending: statsData?.filter(w => !w.is_potentially_valid && (w.net_score || 0) >= 0 && (w.net_score || 0) < 3).length || 0
    };

    return NextResponse.json({
      success: true,
      words,
      stats
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('[admin/community-words] Error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/community-words',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
