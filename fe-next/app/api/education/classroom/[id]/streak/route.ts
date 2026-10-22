import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { loadClassStreak } from '@/lib/education/classroomHub';
import { createSupabaseClassHubStore } from '@/lib/education/classroomHubStore';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await context.params;
  try {
    const admin = createAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY unset');
    const { data: owned, error } = await admin
      .from('classrooms')
      .select('id')
      .eq('id', id)
      .eq('teacher_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!owned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const streak = await loadClassStreak(
      createSupabaseClassHubStore(admin),
      id,
      new Date().toISOString().slice(0, 10)
    );
    return NextResponse.json(streak, { status: 200 });
  } catch (err) {
    logger.error('Class streak failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
