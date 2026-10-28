import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';

const cache = new Map<number, { rows: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Read-only paid-campaign funnel for the admin insights row. No writes. */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const daysRaw = parseInt(new URL(request.url).searchParams.get('days') ?? '14', 10);
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 90) : 14;

  const cached = cache.get(days);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ rows: cached.rows });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data, error } = await supabase.rpc('admin_paid_campaign_funnel', { p_days: days });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = Array.isArray(data) ? data : [];
  cache.set(days, { rows, timestamp: Date.now() });
  return NextResponse.json({ rows });
}
