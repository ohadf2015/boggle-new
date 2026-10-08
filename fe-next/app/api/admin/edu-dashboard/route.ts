/**
 * API Route: GET /api/admin/edu-dashboard?window=7|30|90
 *
 * Education KPIs for the admin dashboard. Service-role reads (eduDashboardRows), test
 * accounts and machine requests dropped in prepareEduDashboardInput, then aggregated
 * by buildEduDashboard.
 *
 * classroom_rounds is not applied in every environment yet. A missing table comes back
 * as `roundsAvailable: false` with the rounds KPIs null, never as a 500 or a zero.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { buildEduDashboard } from '@/lib/admin/eduDashboard';
import { prepareEduDashboardInput } from '@/lib/admin/eduDashboardInput';
import { fetchEduRawRows } from '@/lib/admin/eduDashboardRows';
import type { WindowDays } from '@/lib/admin/eduMetrics';

const DAY_MS = 86_400_000;

function parseWindow(url: string): WindowDays {
  const raw = new URL(url).searchParams.get('window');
  return raw === '30' ? 30 : raw === '90' ? 90 : 7;
}

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const windowDays = parseWindow(request.url);
  const nowMs = Date.now();
  const sinceIso = new Date(nowMs - 2 * windowDays * DAY_MS).toISOString();

  const fetched = await fetchEduRawRows(supabase, sinceIso);
  if (!fetched.ok) {
    return NextResponse.json({ error: fetched.error }, { status: 500 });
  }

  const input = prepareEduDashboardInput(fetched.raw, nowMs, windowDays);
  return NextResponse.json(buildEduDashboard(input));
}
