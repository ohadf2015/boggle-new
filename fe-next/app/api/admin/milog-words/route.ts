/**
 * API Route: /api/admin/milog-words
 * Admin endpoint for viewing milog-verified Hebrew words
 * GET: Fetch words verified against milog.co.il with stats
 * Only accessible to admin users
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { captureApiError } from '@/utils/sentry';

type MilogStatus = 'verified' | 'not_found' | 'error' | 'pending' | 'rejected_type' | null;

interface MilogWord {
  id: string;
  word: string;
  milog_status: MilogStatus;
  milog_verified_at: string | null;
  milog_url: string | null;
  milog_attempts: number;
  submission_count: number;
  approved_at: string | null;
  milog_word_type: string | null;
  milog_rejected_reason: string | null;
}

/**
 * GET - Fetch milog-verified words with filters
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
    const status = searchParams.get('status') || 'all'; // verified, not_found, promoted, pending, all
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query - only fetch Hebrew words that have been processed by milog
    let query = supabase
      .from('invalid_word_submissions')
      .select('id, word, milog_status, milog_verified_at, milog_url, milog_attempts, submission_count, approved_at, milog_word_type, milog_rejected_reason', { count: 'exact' })
      .eq('language', 'he')
      .neq('milog_status', null); // Only words that have been verified

    // Apply status filter
    if (status === 'verified') {
      query = query.eq('milog_status', 'verified');
    } else if (status === 'not_found') {
      query = query.eq('milog_status', 'not_found');
    } else if (status === 'promoted') {
      query = query.not('approved_at', 'is', null);
    } else if (status === 'pending') {
      query = query.eq('milog_status', 'pending');
    } else if (status === 'rejected_type') {
      query = query.eq('milog_status', 'rejected_type');
    }

    // Apply search filter
    if (search) {
      query = query.ilike('word', `%${search}%`);
    }

    // Order by verification date (most recent first)
    query = query.order('milog_verified_at', { ascending: false, nullsFirst: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error('[admin/milog-words] Query error:', error);
      captureApiError(new Error(errorMessage), '/api/admin/milog-words', {
        method: 'GET',
        statusCode: 500
      });
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // Calculate stats
    const { data: statsData } = await supabase
      .from('invalid_word_submissions')
      .select('milog_status, approved_at')
      .eq('language', 'he')
      .neq('milog_status', null);

    const stats = {
      total: statsData?.length || 0,
      verified: statsData?.filter((w: { milog_status: MilogStatus }) => w.milog_status === 'verified').length || 0,
      notFound: statsData?.filter((w: { milog_status: MilogStatus }) => w.milog_status === 'not_found').length || 0,
      promoted: statsData?.filter((w: { approved_at: string | null }) => w.approved_at !== null).length || 0,
      pending: statsData?.filter((w: { milog_status: MilogStatus }) => w.milog_status === 'pending').length || 0,
      rejectedType: statsData?.filter((w: { milog_status: MilogStatus }) => w.milog_status === 'rejected_type').length || 0,
    };

    return NextResponse.json({
      success: true,
      words: data as MilogWord[],
      stats,
      pagination: {
        total: count || 0,
        limit,
        offset,
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('[admin/milog-words] Error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/milog-words',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
