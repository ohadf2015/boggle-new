import { NextResponse } from 'next/server';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import { lookupLiveGameForClassroom } from '@/lib/education/liveGameForClassroom';
import { countEndedCodeTries, countRecentEndedCodeTries, clearEndedCodeTries } from '../../join/endedSessionCode';

/** GET: how many students tried an ended session code of this class since its last game. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorizeClassroomOwner(req, id);
  if (!auth.ok) return auth.response;

  const classroomId = auth.classroom.id;
  // The 10-minute lobby line must survive a new room. Clearing it here would
  // hide "students tried to join" at the only moment the teacher can act.
  const recentCount = await countRecentEndedCodeTries(classroomId);
  if (await lookupLiveGameForClassroom(classroomId).catch(() => null)) {
    await clearEndedCodeTries(classroomId);
    return NextResponse.json({ count: 0, recentCount });
  }
  return NextResponse.json({ count: await countEndedCodeTries(classroomId), recentCount });
}
