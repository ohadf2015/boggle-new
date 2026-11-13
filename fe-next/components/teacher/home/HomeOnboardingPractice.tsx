'use client';

import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_SMALL } from '../nb/nbStyles';
import { RehearseWithBotsButton } from './RehearseWithBotsButton';

type T = (key: string, params?: Record<string, string | number>) => string;

/** Before the first class: rehearse a round with bots, no class needed. */
export function HomeOnboardingPractice({ language, t }: { language: string; t: T }) {
  return (
    <div data-testid="home-onboarding-practice" className="flex flex-col gap-2 rounded-neo-lg border-[3px] border-dashed border-white/55 p-3 sm:flex-row sm:items-center sm:gap-3">
      <p className="min-w-0 flex-1 font-neo-body text-sm font-semibold leading-snug text-white">
        <span className="block font-neo-display text-base font-black">{t('eduShell.home.practice.title')}</span>
        {t('eduShell.home.practice.body')}
      </p>
      <RehearseWithBotsButton
        classroomId={undefined}
        source="hq"
        language={language}
        t={t}
        withSeat
        label={t('eduShell.home.practice.cta')}
        buttonClassName={cn(NB_SMALL, NB_BLOCK.cyan)}
        className="shrink-0"
      />
    </div>
  );
}
