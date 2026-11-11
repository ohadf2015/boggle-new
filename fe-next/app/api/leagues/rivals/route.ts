import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { loadLeagueNeighbors } from '@/lib/rivals/leagueRivals';

/**
 * GET /api/leagues/rivals?userId=<uuid>
 * The nearest public-named players above and below the current player
 * in their weekly league standings (Named Rivals feature).
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    const supabase = await createClient();
    return NextResponse.json(await loadLeagueNeighbors(supabase, userId));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/leagues/rivals error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
