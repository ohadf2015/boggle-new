'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import {
  trackFirstRoundGuideClicked,
  trackFirstRoundGuideShown,
} from '@/lib/education/firstRoundGuideTelemetry';
import { RehearseWithBotsButton } from '../home/RehearseWithBotsButton';
import { PANEL, SECONDARY_BUTTON } from '../home/homeStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export const FIRST_ROUND_MINUTES = 2;

export interface FirstRoundGuideProps {
  classroomId: string;
  language: string;
  t: T;
}

/**
 * "Run your first round" — the guided step right after a class exists and before
 * anyone has joined: practise privately against bots, put the code up, start a
 * 2-minute round. In-app only; fires shown/clicked events per step.
 */
export function FirstRoundGuide({ classroomId, language, t }: FirstRoundGuideProps) {
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    trackFirstRoundGuideShown({ surface: 'class_ready', locale: language });
  }, [language]);

  const startHref = teacherHostHref(language, { classroomId, minutes: FIRST_ROUND_MINUTES });
  const steps = ['step1', 'step2', 'step3'] as const;

  return (
    <section
      data-testid="first-round-guide"
      aria-labelledby="first-round-guide-title"
      className={cn(PANEL, 'flex w-full max-w-md flex-col gap-3 p-4 text-start')}
    >
      <h2 id="first-round-guide-title" className="font-neo-display text-lg font-black text-neo-cream">
        {t('eduShell.setup.firstRound.title')}
      </h2>
      <ol className="flex flex-col gap-2">
        {steps.map((key, i) => (
          <li key={key} data-testid={`first-round-step-${i + 1}`} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-7 shrink-0 place-items-center rounded-full border-[2px] border-neo-cream/60 font-neo-display text-sm font-black text-neo-cream"
            >
              {i + 1}
            </span>
            <span className="font-neo-body text-sm text-neo-cream/85">{t(`eduShell.setup.firstRound.${key}`)}</span>
          </li>
        ))}
      </ol>
      <RehearseWithBotsButton
        classroomId={classroomId}
        source="class"
        language={language}
        t={t}
        onStart={() => trackFirstRoundGuideClicked({ surface: 'class_ready', locale: language, step: 'practice_bots' })}
      />
      <Link
        href={startHref}
        data-testid="setup-start-game"
        data-hero="false"
        onClick={() => trackFirstRoundGuideClicked({ surface: 'class_ready', locale: language, step: 'start_round' })}
        className={cn(SECONDARY_BUTTON, 'w-full')}
      >
        <Play className="size-5" aria-hidden="true" />
        {t('eduShell.setup.firstRound.start')}
      </Link>
    </section>
  );
}

export default FirstRoundGuide;
