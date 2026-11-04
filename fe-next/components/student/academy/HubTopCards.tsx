'use client';

import type { ReactNode } from 'react';
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
  /** Shown at the start of the row (the chest badge), even before the data lands. */
  lead?: ReactNode;
  /** False while the hub's data is still loading: only the lead shows. */
  ready?: boolean;
  /** A short screen: homework due wins the one card slot over the checklist. */
  oneCard?: boolean;
}

/** The cards under the HUD: first-day goals until they are done (or homework is waiting), then Today. */
export function HubTopCards({ goals, classroomId, warmup, due, chestOpen, streak, streakDoneToday, lead, ready = true, oneCard = false }: Props) {
  const showToday = !!warmup || isFirstDayDone(goals);
  // The due card keeps its reminder telemetry; for the warm-up homework it simply opens the warm-up drill.
  const dueIsWarmup = !!due && !!warmup && due.assignmentId === warmup.assignmentId;
  const checklist = !(oneCard && due);
  return (
    <div data-testid="academy-top-row" className="mx-auto mt-1.5 flex min-h-12 w-full max-w-xl items-center gap-2">
      {/* As wide as the chest's longest tag (ru), so the tag never reaches the screen edge or the card. */}
      {lead && <div className="flex w-[5.75rem] shrink-0 justify-center">{lead}</div>}
      {ready && (
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {checklist && (showToday ? (
            <TodayCard items={buildTodayItems({ warmup, chestOpen, streak, streakDoneToday })} warmup={dueIsWarmup ? null : warmup} />
          ) : (
            <FirstDayCard goals={goals} hasClass={!!classroomId} chestArt={!lead} />
          ))}
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
      )}
    </div>
  );
}
