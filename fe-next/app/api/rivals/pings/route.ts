import { NextResponse, type NextRequest } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import { loadIncomingPings } from '@/lib/rivals/pingServer';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ pings: [] }, { headers: NO_STORE });

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  try {
    const pings = await loadIncomingPings(db, user.id);
    return NextResponse.json({ pings }, { headers: NO_STORE });
  } catch (err) {
    captureApiError(err as Error, '/api/rivals/pings');
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
