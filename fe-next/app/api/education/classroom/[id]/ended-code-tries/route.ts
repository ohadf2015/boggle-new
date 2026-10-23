import { NextResponse } from 'next/server';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import { lookupLiveGameForClassroom } from '@/lib/education/liveGameForClassroom';
import { countEndedCodeTries, clearEndedCodeTries } from '../../join/endedSessionCode';

/** GET: how many students tried an ended session code of this class since its last game. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorizeClassroomOwner(req, id);
  if (!auth.ok) return auth.response;

  const classroomId = auth.classroom.id;
  if (await lookupLiveGameForClassroom(classroomId).catch(() => null)) {
    await clearEndedCodeTries(classroomId);
    return NextResponse.json({ count: 0 });
  }
  return NextResponse.json({ count: await countEndedCodeTries(classroomId) });
}
