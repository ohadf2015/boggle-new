import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/admin/trigger-daily-word-generation
 * Manually trigger the daily word selection Edge Function
 * Only accessible to admin users
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Invoke the Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/daily-word-selector`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge Function error:', errorText);
      return NextResponse.json(
        { error: 'Failed to trigger word generation' },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Trigger daily word generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
