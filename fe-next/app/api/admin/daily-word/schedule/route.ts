import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { Language } from '@/types';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Check admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
