import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { captureApiError } from '@/utils/sentry';
import type { Language } from '@/types';

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
    const language = searchParams.get('language') as Language;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!language) {
      return NextResponse.json({ error: 'Language is required' }, { status: 400 });
    }

    let query = supabase
      .from('daily_target_words')
      .select('*')
      .eq('language', language)
      .order('puzzle_date', { ascending: true });

    if (startDate) {
      query = query.gte('puzzle_date', startDate);
    }

    if (endDate) {
      query = query.lte('puzzle_date', endDate);
    } else {
      // Default to showing future words if no range specified
      // But maybe we want to see history too?
      // If no end date, maybe limit to 100?
      query = query.limit(100);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error fetching schedule:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/daily-word/schedule',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
