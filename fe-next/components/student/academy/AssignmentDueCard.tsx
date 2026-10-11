'use client';

/**
 * Assignment due reminder — the student-side nudge for open classroom homework.
 *
 * Two flavors of the SAME card, decided by assignmentDueReminder.ts:
 * - 'due_soon': due within 24h. Persistent while the window holds; calm yellow.
 * - 'overdue': past due. The hub only mounts this when the 1/day nudge throttle
 *   allowed it, so mounting IS the nudge — red, urgent, links straight to the
 *   assignment.
 *
 * Telemetry fires here on mount (not on every hub render), deduped against
 * effect double-invocation so one card impression is one PostHog event.
 */

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AlarmClock, CalendarClock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  daysOverdue,
  type AssignmentDueKind,
} from '@/lib/education/assignmentDueReminder';
import {
  trackEduAssignmentOverdue,
  trackEduAssignmentReminderShown,
} from '@/lib/education/telemetry';

export interface AssignmentDueCardProps {
  assignmentId: string;
  classroomId?: string | null;
  title: string;
  href: string;
  dueDate: string;
  kind: AssignmentDueKind;
}

/** "Due in 3h" / "Due in 45m" for the soon kind; overduedays for the late kind. */
export function dueCardTimeText(
  kind: AssignmentDueKind,
  dueDate: string,
  now: number = Date.now(),
): { key: string; fallback: string; params: Record<string, number> } {
  const due = Date.parse(dueDate);
  if (kind === 'overdue' || !Number.isFinite(due)) {
    return {
      key: 'student.assignments.overdueBy',
      fallback: 'Overdue by {days}d',
      params: { days: daysOverdue(dueDate, now) },
    };
  }
  const minutes = Math.max(1, Math.ceil((due - now) / 60000));
  if (minutes < 60) {
    return { key: 'student.assignments.dueInMinutes', fallback: 'Due in {minutes}m', params: { minutes } };
  }
  return { key: 'student.assignments.dueInHours', fallback: 'Due in {hours}h', params: { hours: Math.ceil(minutes / 60) } };
}

export function AssignmentDueCard({
  assignmentId,
  classroomId,
  title,
  href,
  dueDate,
  kind,
}: AssignmentDueCardProps) {
  const { t } = useLanguage();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (kind === 'overdue') {
      trackEduAssignmentOverdue({ assignmentId, classroomId, daysOverdue: daysOverdue(dueDate) });
    } else {
      const due = Date.parse(dueDate);
      const hoursUntilDue = Number.isFinite(due) ? Math.max(1, Math.ceil((due - Date.now()) / 3600000)) : 0;
      trackEduAssignmentReminderShown({ assignmentId, classroomId, hoursUntilDue });
    }
  }, [kind, assignmentId, classroomId, dueDate]);

  const time = dueCardTimeText(kind, dueDate);
  const Icon = kind === 'overdue' ? AlarmClock : CalendarClock;
  const tone = kind === 'overdue'
    ? 'border-neo-red bg-neo-red/15'
    : 'border-neo-yellow bg-neo-yellow/10';

  return (
    <Link
      href={href}
      data-testid="assignment-due-card"
      data-kind={kind}
      className={`pointer-events-auto flex items-center gap-2 rounded-[14px] border-2 p-1.5 text-neo-white shadow-hard-sm ${tone}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-neo-black ${kind === 'overdue' ? 'bg-neo-red text-neo-white' : 'bg-neo-yellow text-neo-black'}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-neo-body text-xs font-bold leading-tight">{title}</span>
        <span className={`block font-neo-body text-[11px] font-bold uppercase tracking-wide ${kind === 'overdue' ? 'text-neo-red' : 'text-neo-yellow'}`}>
          {t(time.key, time.fallback, time.params)}
        </span>
      </span>
      <span className="shrink-0 rounded-lg border-2 border-neo-black bg-neo-white px-2 py-1 font-neo-body text-[11px] font-black uppercase text-neo-black">
        {t('student.assignments.doIt', 'Do it')}
      </span>
    </Link>
  );
}
