import { NextResponse } from 'next/server';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { teacherHasProAccess } from '@/lib/education/accessTrialServer';

/** Null when the teacher has paid Pro or a live access trial; otherwise the 402 to return. */
export async function requireTeacherPro(userId: string): Promise<NextResponse | null> {
  const subscription = await checkTeacherSubscription(userId);
  if (await teacherHasProAccess(userId, subscription)) return null;
  return NextResponse.json({ ok: false, error: 'Teacher Pro required' }, { status: 402 });
}
