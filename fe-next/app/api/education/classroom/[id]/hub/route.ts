import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { loadClassHubState } from '@/lib/education/classroomHub';
import { createSupabaseClassHubStore } from '@/lib/education/classroomHubStore';

/**
 * GET /api/education/classroom/[id]/hub
 * The student's class strip: streak in days, whether it played today, and
 * whether this student has already asked for a rematch today.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await context.params;
  try {
    const state = await loadClassHubState(
      createSupabaseClassHubStore(createAdminClient()),
      id,
      user.id,
      new Date().toISOString().slice(0, 10)
    );
    return NextResponse.json(state, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_A_MEMBER') {
      return NextResponse.json({ error: 'Not a member of this classroom' }, { status: 403 });
    }
    logger.error('Class hub state failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
