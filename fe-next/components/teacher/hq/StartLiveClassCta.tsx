'use client';

import { useEffect, useState } from 'react';
import { MonitorPlay } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { classroomInvitePayload, classroomJoinUrl } from '@/lib/education/classroomInvitePayload';
import {
  shouldShowStartLiveClassCta,
} from '@/lib/education/startLiveClassCta';
import {
  trackEduAssignmentStartLiveClicked,
  trackEduJoinCodeCopied,
} from '@/lib/education/telemetry';

export interface StartLiveClassCtaProps {
  classroomId: string;
  studentCount: number;
  assignmentCount: number | null;
  joinCode: string;
  onStart: () => void;
  className?: string;
}

/**
 * Persistent HQ / assignment-view CTA: students are in and an assignment
 * exists. Starts the existing classroom-game lobby and copies the roster
 * join code — not a second join panel (GetStudentsInCard / PR #1207).
 */
export function StartLiveClassCta({
  classroomId,
  studentCount,
  assignmentCount,
  joinCode,
  onStart,
  className,
}: StartLiveClassCtaProps) {
  const { t, language } = useLanguage();
  const show = shouldShowStartLiveClassCta({ studentCount, assignmentCount });
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  if (!show) return null;

  const onStartClick = () => {
    trackEduAssignmentStartLiveClicked({ classroomId });
    onStart();
  };

  const onCopy = async () => {
    const payload = classroomInvitePayload(origin, language, joinCode);
    try {
      await navigator.clipboard.writeText(payload);
      trackEduJoinCodeCopied({ classroomId });
      toast.success(t('academy.hq.joinCodeCopied', 'Join link copied'));
    } catch {
      toast.error(t('academy.hq.joinCodeCopied', 'Join link copied'));
    }
  };

  const joinUrl = origin && joinCode ? classroomJoinUrl(origin, language, joinCode) : '';

  return (
    <section
      data-testid="hq-start-live-class"
      className={cn(
        '@container flex shrink-0 flex-col gap-2 rounded-neo-lg border-2 border-neo-cyan/70 bg-neo-navy-light/95 p-3 shadow-hard sm:p-4',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-cyan text-black shadow-hard-sm">
          <MonitorPlay className="size-5" strokeWidth={3} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-neo-display text-base font-black uppercase leading-tight text-neo-white">
            {t('academy.hq.startLiveTitle', 'Play a live class')}
          </h2>
          <p className="mt-1 font-neo-body text-sm font-bold text-neo-white/70 text-pretty">
            {t(
              'academy.hq.startLiveBody',
              'The assignment is out. Start a live game so the class plays together.',
            )}
          </p>
        </div>
      </div>
      {joinCode ? (
        <div className="flex flex-wrap items-center gap-2">
          <code
            data-testid="hq-start-live-join-code"
            className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-2 py-1 font-neo-display text-sm font-black tracking-widest text-neo-lime"
          >
            {joinCode}
          </code>
          <button
            type="button"
            data-testid="hq-start-live-copy"
            onClick={() => void onCopy()}
            className={cn(
              'inline-flex min-h-11 flex-1 items-center justify-center rounded-neo border-2 border-neo-cream/70',
              'bg-neo-navy px-3 font-neo-display text-xs font-black uppercase tracking-wide text-neo-white',
              'hover:-translate-y-0.5 hover:border-neo-cream active:translate-y-0.5',
              'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
            )}
          >
            {t('academy.hq.copyJoinCode', 'Copy join link')}
          </button>
        </div>
      ) : null}
      {joinUrl ? (
        <p data-testid="hq-start-live-join-url" className="truncate font-neo-body text-xs text-neo-white/50">
          {joinUrl}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="hq-start-live-cta"
        onClick={onStartClick}
        className={cn(
          'inline-flex min-h-11 w-full items-center justify-center rounded-neo border-3 border-black',
          'bg-neo-cyan px-4 font-neo-display text-sm font-black uppercase tracking-wide text-black shadow-hard-sm',
          'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
          'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
        )}
      >
        {t('academy.hq.startLiveCta', 'Start live classroom game')}
      </button>
    </section>
  );
}

export default StartLiveClassCta;
