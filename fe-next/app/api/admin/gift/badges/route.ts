import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';

/**
 * GET /api/admin/gift/badges
 * Get all available badges for admin gift attachment
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Check admin auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

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
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch all active badges
    const { data: badges, error: badgesError } = await supabase
      .from('collectible_items')
      .select('id, name_key, description_key, icon, image_url, rarity')
      .eq('category', 'badge')
      .eq('is_active', true)
      .order('rarity', { ascending: false })
      .order('sort_order', { ascending: true });

    if (badgesError) {
      console.error('Error fetching badges:', badgesError);
      captureApiError(new Error(badgesError.message), '/api/admin/gift/badges', {
        method: 'GET',
        userId: user.id,
        statusCode: 500,
      });
      return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      badges: badges || [],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in GET /api/admin/gift/badges:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/admin/gift/badges',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
