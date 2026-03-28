/**
 * Adventure Inventory API
 *
 * GET - Fetch player's collected items
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
