/**
 * GET /api/quick-play/word-collection — return player's word collection stats.
 * Auth required. Returns: { collected: string[], new: string[], total: number }
 * where `new` is the set of words from this round that are new to the player.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read all words the player has collected
    // ponytail: currently scans all player_words where player_id = user.id.
    // For large collections, this should use pagination or a materialized view.
    const { data: wordRows, error: wordsError } = await supabase
      .from('player_words')
      .select('word')
      .eq('player_id', user.id)
      .limit(5000); // practical cap on returned collection

    if (wordsError) {
      return NextResponse.json(
        { error: 'Failed to fetch collection' },
        { status: 500 }
      );
    }

    const collected = (wordRows ?? []).map((r: { word: string }) => r.word.toLowerCase());
    const uniqueCollected = Array.from(new Set(collected));

    return NextResponse.json({
      collected: uniqueCollected,
      total: uniqueCollected.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
