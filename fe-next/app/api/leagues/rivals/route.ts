import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { loadLeagueNeighbors } from '@/lib/rivals/leagueRivals';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';

/**
 * GET /api/leagues/rivals
 * The nearest public-named players above and below the current player
 * in their weekly league standings (Named Rivals feature).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser(request).catch(() => null);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = await createClient();
    return NextResponse.json(await loadLeagueNeighbors(supabase, user.id));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/leagues/rivals error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
