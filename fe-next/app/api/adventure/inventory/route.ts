/**
 * Adventure Inventory API
 *
 * GET - Fetch player's collected items
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';

export async function GET(request: Request) {
  // Local JWT verify (sub-ms) when fetchWithAuth sends a Bearer; cookie fallback
  // otherwise. Read-only. Query keeps the cookie client so RLS still applies.
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from('player_inventory')
    .select('item_id, item_type, category, rarity, quantity, source_world, source_level, earned_at')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false });

  if (error) {
    console.error('[ADVENTURE INVENTORY API] Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }

  return NextResponse.json({ items: items ?? [] });
}
