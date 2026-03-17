/**
 * Avatar Premium Parts API
 *
 * GET - Fetch the authenticated user's owned premium avatar parts
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('premium_avatar_parts')
      .eq('id', user.id)
      .single();

    if (fetchError || !profile) {
      // No profile yet — return empty array (not an error)
      return NextResponse.json({ premiumAvatarParts: [] });
    }

    return NextResponse.json({
      premiumAvatarParts: profile.premium_avatar_parts ?? [],
    });
  } catch (error) {
    console.error('[AVATAR PREMIUM-PARTS API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
