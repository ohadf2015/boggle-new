'use client';

import { useId, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NB_LINK } from '@/components/teacher/nb/nbStyles';
import { LessonPlanPrompt } from '@/components/education/LessonPlanPrompt';
import { FirstGamePlanCard, type FirstGamePlanCardProps } from '@/components/education/FirstGamePlanCard';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface ClassSetupInvitePlanProps {
  classroomId: string;
  /** Null until the join link is known; the calendar link stays hidden until then. */
  calendar: Omit<FirstGamePlanCardProps, 't' | 'className'> | null;
  t: T;
  className?: string;
}

/** The "what next" for a teacher with no students yet: a lesson reminder email, with the calendar export one tap away. */
export function ClassSetupInvitePlan({ classroomId, calendar, t, className }: ClassSetupInvitePlanProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const cardId = useId();
  return (
    <div data-testid="setup-plan" className={cn('flex flex-col gap-2', className)}>
      <LessonPlanPrompt classroomId={classroomId} source="class_setup" reserveSpace />
      {calendar ? (
        <>
          <button
            type="button"
            data-testid="setup-plan-calendar-toggle"
            aria-expanded={calendarOpen}
            aria-controls={cardId}
            onClick={() => setCalendarOpen((open) => !open)}
            className={cn(NB_LINK, 'self-center')}
          >
            <CalendarPlus className="size-4" aria-hidden="true" />
            {t('eduShell.setup.plan.calendarToggle')}
          </button>
          {calendarOpen ? (
            <div id={cardId}>
              <FirstGamePlanCard {...calendar} t={t} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default ClassSetupInvitePlan;
