/**
 * Adventure Purchase API
 *
 * POST - Purchase an upgrade or forge a rune
 * Persists gold, upgrades, rune fragments, and rune inventory to DB.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { gold, upgrades, runeFragments, runes } = body;

    if (typeof gold !== 'number' || gold < 0) {
      return NextResponse.json({ error: 'Invalid gold value' }, { status: 400 });
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    const updateData: Record<string, unknown> = {
      gold,
      updated_at: new Date().toISOString(),
    };

    if (upgrades && typeof upgrades === 'object') {
      updateData.upgrades = upgrades;
    }

    if (typeof runeFragments === 'number') {
      updateData.rune_fragments = runeFragments;
    }

    if (Array.isArray(runes)) {
      updateData.runes = runes;
    }

    const { error: updateError } = await supabase
      .from('player_progression')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) {
      console.error('[ADVENTURE PURCHASE API] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to save purchase' }, { status: 500 });
    }

    return NextResponse.json({ success: true, gold });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ADVENTURE PURCHASE API] Error:', errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
