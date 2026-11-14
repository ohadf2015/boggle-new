import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.success) return auth.response!;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data, error } = await supabase.rpc('admin_native_app_stats');
  if (error) {
    console.error('[admin/app-stats] admin_native_app_stats failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // ponytail: store stays null until the Play bulk-report bucket is readable by a service account in prod.
  return NextResponse.json({ app: data, store: null });
}
