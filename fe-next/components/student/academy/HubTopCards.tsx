'use client';

import type { AssignmentDueKind } from '@/lib/education/assignmentDueReminder';
import { FirstDayCard } from './FirstDayCard';
import { isFirstDayDone, type FirstDayGoal } from './firstDayGoals';
import { AssignmentDueCard } from './AssignmentDueCard';
import { TodayCard } from './TodayCard';
import { buildTodayItems, type StudentWarmup } from './todayItems';

export interface HubDue {
  assignmentId: string;
  title: string;
  href: string;
  dueDate: string;
  kind: AssignmentDueKind;
}

interface Props {
  goals: FirstDayGoal[];
  classroomId: string | null;
  warmup: StudentWarmup | null;
  due: HubDue | null;
  chestOpen: boolean;
  streak: number;
  streakDoneToday: boolean;
}

/** The cards under the HUD: first-day goals until they are done (or homework is waiting), then Today. */
export function HubTopCards({ goals, classroomId, warmup, due, chestOpen, streak, streakDoneToday }: Props) {
  const showToday = !!warmup || isFirstDayDone(goals);
  // The due card keeps its reminder telemetry; for the warm-up homework it simply opens the warm-up drill.
  const dueIsWarmup = !!due && !!warmup && due.assignmentId === warmup.assignmentId;
  return (
    <div className="mx-auto mt-1.5 flex w-full max-w-xl flex-col gap-1.5">
      {showToday ? (
        <TodayCard items={buildTodayItems({ warmup, chestOpen, streak, streakDoneToday })} warmup={dueIsWarmup ? null : warmup} />
      ) : (
        <FirstDayCard goals={goals} hasClass={!!classroomId} />
      )}
      {due && (
        <AssignmentDueCard
          assignmentId={due.assignmentId}
          classroomId={classroomId}
          title={due.title}
          href={dueIsWarmup && warmup ? warmup.href : due.href}
          dueDate={due.dueDate}
          kind={due.kind}
        />
      )}
    </div>
  );
}
