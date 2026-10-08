import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { requestClassRematch } from '@/lib/education/classroomHub';
import { createSupabaseClassHubStore } from '@/lib/education/classroomHubStore';

/**
 * POST /api/education/classroom/[id]/rematch
 * "Ask your teacher for a rematch." Records the ask only: no message body, so a
 * child cannot send free text to a teacher through this door.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await context.params;
  try {
    const outcome = await requestClassRematch(
      createSupabaseClassHubStore(createAdminClient()),
      id,
      user.id,
      new Date().toISOString().slice(0, 10)
    );
    if (outcome === 'not_member') {
      return NextResponse.json({ error: 'Not a member of this classroom' }, { status: 403 });
    }
    return NextResponse.json({ status: outcome }, { status: 200 });
  } catch (err) {
    logger.error('Rematch request failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
