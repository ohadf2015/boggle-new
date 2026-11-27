'use client';

/**
 * The booked state of "Plan your first class": the time, a calendar invite that carries the student
 * join link and a one-tap Start, and the join link itself to copy into the class chat.
 *
 * Nov 2026: new teachers rehearse alone minutes after signup, then leave. The email reminder alone booked
 * nobody (0 lesson_planned in 30 days), and reminder emails send but don't bring teachers back. An event on
 * their own calendar at class time, with the link inside, is the reminder that is there when the class is.
 */
import { useState } from 'react';
import { CalendarPlus, Check, Copy, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_SMALL, NB_STICKER } from '@/components/teacher/nb/nbStyles';
import { buildFirstGameEvent, firstGameStartUrl } from '@/lib/education/firstGamePlan';
import { classroomJoinUrl, joinAddressForDisplay } from '@/lib/education/classroomInvitePayload';
import { downloadIcs } from '@/lib/education/downloadIcs';
import { trackLessonPlanInviteAdded, trackLessonPlanLinkCopied, type LessonPlanInviteSource } from '@/lib/education/lessonPlanInviteTelemetry';

const K = 'eduLiveRoom.hostResults.lessonPlan';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface LessonPlanBookedProps {
  lessonAt: Date;
  /** The booked time as the teacher reads it ("Friday 9:00 AM"). */
  when: string;
  classroom: { id: string; name: string; joinCode: string };
  origin: string;
  language: string;
  source: LessonPlanInviteSource;
  onChange: () => void;
  t: T;
}

export function LessonPlanBooked({ lessonAt, when, classroom, origin, language, source, onChange, t }: LessonPlanBookedProps) {
  const [copied, setCopied] = useState(false);
  const joinUrl = classroomJoinUrl(origin, language, classroom.joinCode);

  const addInvite = (target: 'google' | 'ics') => {
    const event = buildFirstGameEvent({
      classroomId: classroom.id,
      start: lessonAt,
      text: {
        title: t('eduShell.setup.plan.eventTitle', { name: classroom.name }),
        students: t('eduShell.setup.plan.eventStudents', { url: joinUrl, code: classroom.joinCode }),
        start: t('eduShell.setup.plan.eventStart', { url: firstGameStartUrl(origin, language, classroom.id) }),
      },
    });
    if (target === 'google') window.open(event.googleUrl, '_blank', 'noopener,noreferrer');
    else downloadIcs(event.ics, event.filename);
    trackLessonPlanInviteAdded({ target, source });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
    } catch {
      return;
    }
    setCopied(true);
    trackLessonPlanLinkCopied({ source });
  };

  return (
    <div data-testid="lesson-plan-invite" className="flex flex-col gap-3">
      <div data-testid="lesson-plan-saved" role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={cn(NB_STICKER, NB_BLOCK.lime, '-rotate-2 text-sm')}>
          <Check className="size-4" aria-hidden="true" />
          {t(`${K}.booked`)}
        </span>
        <span className="font-neo-display text-lg font-black leading-tight text-edu-ink">{when}</span>
        <button
          type="button"
          onClick={onChange}
          className="min-h-11 font-neo-body text-sm font-bold text-edu-cyan-ink underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          {t(`${K}.change`)}
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" data-testid="lesson-plan-google" onClick={() => addInvite('google')} className={cn(NB_SMALL, NB_BLOCK.cyan, 'min-h-11 w-full sm:w-auto')}>
          <CalendarPlus className="size-4" aria-hidden="true" />
          {t('eduShell.setup.plan.google')}
        </button>
        <button type="button" data-testid="lesson-plan-ics" onClick={() => addInvite('ics')} className={cn(NB_SMALL, NB_BLOCK.cream, 'min-h-11 w-full sm:w-auto')}>
          <Download className="size-4" aria-hidden="true" />
          {t('eduShell.setup.plan.ics')}
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-neo-body text-xs font-bold text-edu-ink/80">{t(`${K}.linkLabel`)}</p>
        <div className="flex flex-wrap items-stretch gap-2">
          <span
            data-testid="lesson-plan-link"
            dir="ltr"
            className="flex min-h-11 min-w-0 grow basis-48 items-center break-all rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-3 font-neo-body text-sm font-black text-neo-black shadow-hard"
          >
            {joinAddressForDisplay(joinUrl)}
          </span>
          <button type="button" data-testid="lesson-plan-copy" onClick={copyLink} className={cn(NB_SMALL, copied ? NB_BLOCK.lime : NB_BLOCK.yellow, 'min-h-11 shrink-0')}>
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {t(copied ? `${K}.copied` : `${K}.copyLink`)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LessonPlanBooked;
