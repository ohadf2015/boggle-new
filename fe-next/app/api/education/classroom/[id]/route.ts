import { NextResponse } from 'next/server';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import { classroomDeleteClient, deleteOwnedClassroom } from '@/lib/education/deleteOwnedClassroom';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';

/**
 * DELETE /api/education/classroom/[id]
 * Owning teacher only. Deletes rounds first (their FK is SET NULL, so a bare
 * classroom delete would orphan reports), then the classroom — memberships
 * cascade. One retry on a transient error; already-gone is success.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorizeClassroomOwner(req, id);
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'service role key not configured' }, { status: 500 });
  }

  // Postgrest builders are thenables, not Promises, so the structural adapter
  // type does not accept SupabaseClient directly; the runtime shape matches.
  const client = classroomDeleteClient(admin as unknown as Parameters<typeof classroomDeleteClient>[0]);
  const outcome = await deleteOwnedClassroom(client, auth.classroom.id);
  if (!outcome.ok) {
    logger.error('[classroom-delete] failed', outcome.error);
    return NextResponse.json(
      { ok: false, error: outcome.error?.message ?? 'Could not delete classroom' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, alreadyDeleted: outcome.alreadyDeleted });
}
