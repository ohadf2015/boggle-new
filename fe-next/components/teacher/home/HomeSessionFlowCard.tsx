'use client';

import { Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/supabase/education/types';
import type { GradeBand } from '@/lib/education/library';
import { sessionFlowSteps, type SessionFlowStep } from '@/lib/education/sessionTemplates';
import type { RailSession } from '@/lib/education/homeSessionRail';
import { catalogueEntry } from '@/components/education/ClassroomModeCatalogueData';
import { gradeBandsLabel } from '@/components/teacher/StarterPacksSection.data';
import { OUTLINE_BUTTON } from './homeStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export const FLOW_ART: Record<SessionFlowStep, string> = {
  learn: '/mascot/edu/flow/flow-learn-512.webp',
  solo: '/mascot/edu/flow/flow-solo-512.webp',
  live: '/mascot/edu/flow/flow-class-512.webp',
};

export const LANGUAGE_NAME_KEY: Record<Language, string> = {
  en: 'languages.english',
  he: 'languages.hebrew',
  sv: 'languages.swedish',
  ja: 'languages.japanese',
  es: 'languages.spanish',
  ru: 'languages.russian',
};

export interface HomeSessionFlowCardProps {
  item: RailSession;
  language: Language;
  gradeBand: GradeBand | null;
  href: string;
  t: T;
  testId?: string;
}

export function HomeSessionFlowCard({ item, language, gradeBand, href, t, testId = 'home-session-card' }: HomeSessionFlowCardProps) {
  const { session } = item;
  const mode = catalogueEntry(session.mode);
  const modeName = mode ? t(mode.nameKey) : '';
  const steps = sessionFlowSteps(session);
  const label = (step: SessionFlowStep) => (step === 'live' ? t('eduShell.home.flow.live', { mode: modeName }) : t(`eduShell.home.flow.${step}`));

  return (
    <li
      data-testid={testId}
      className="group relative flex w-[min(20rem,85vw)] shrink-0 snap-start flex-col gap-2.5 [@media(max-height:820px),(max-width:639px)]:gap-1.5 rounded-neo-lg border-2 border-neo-cream/35 bg-neo-navy-light p-3 max-sm:p-2.5 transition-colors duration-150 focus-within:border-neo-cream/60 hover:border-neo-cream/60 motion-reduce:transition-none @2xl:w-auto"
    >
      <div className="flex items-center gap-2.5 [@media(max-height:820px),(max-width:639px)]:pe-24">
        {mode ? (
          <span className="relative size-12 shrink-0 overflow-hidden rounded-neo border-2 border-neo-cream/35">
            <Image src={mode.cover} alt="" fill sizes="48px" className="object-cover" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-neo-display text-base font-bold leading-tight text-neo-cream">{t(session.nameKey)}</h3>
          <p className="mt-0.5 flex flex-wrap gap-x-1.5 font-neo-body text-xs font-semibold text-neo-cream/70">
            <span data-testid="home-session-minutes">{t('education.modePicker.minutes', { count: item.minutes })}</span>
            <span aria-hidden="true" className="max-sm:hidden">·</span>
            <span data-testid="home-session-grade" className="max-sm:hidden">{gradeBand ? t(`eduLibrary.grade.${gradeBand}`) : gradeBandsLabel(session.gradeBands, t)}</span>
            <span aria-hidden="true" className="max-sm:hidden">·</span>
            <span data-testid="home-session-language" className="max-sm:hidden">{t(LANGUAGE_NAME_KEY[language])}</span>
          </p>
        </div>
      </div>

      <p data-testid="home-session-when" className="line-clamp-2 min-h-[2.5rem] font-neo-body text-sm leading-snug text-neo-cream/80 [@media(max-height:820px),(max-width:639px)]:line-clamp-1 [@media(max-height:820px),(max-width:639px)]:min-h-0 max-sm:!hidden">
        {t(session.whenKey)}
      </p>

      <ol aria-label={t('eduShell.home.flow.stepsLabel')} className={cn('grid items-start gap-1', steps.length > 1 ? 'grid-cols-[1fr_auto_1fr_auto_1fr]' : 'grid-cols-[minmax(0,1fr)_minmax(0,2fr)]')}>
        {steps.map((step, i) => (
          <Fragment key={step}>
            {i > 0 ? <ChevronRight aria-hidden="true" className="mt-8 size-4 text-neo-cream/50 rtl:-scale-x-100" strokeWidth={3} /> : null}
            <li data-testid="home-session-step" data-step={step} className="flex min-w-0 flex-col items-center gap-1 text-center">
              <span className="relative block aspect-square w-full max-w-24 [@media(max-height:820px),(max-width:639px)]:max-w-[4.5rem] [@media(max-height:760px)]:max-w-16 max-sm:!max-w-12 overflow-hidden rounded-neo border-2 border-neo-cream/35 bg-neo-navy">
                <Image src={FLOW_ART[step]} alt="" fill sizes="96px" className="object-contain p-0.5" />
                {steps.length > 1 ? (
                  <span aria-hidden="true" className="absolute start-1 top-1 grid size-5 place-items-center rounded-full bg-neo-cream font-neo-display text-xs font-black text-neo-black">
                    {i + 1}
                  </span>
                ) : null}
              </span>
              <span className="w-full break-words font-neo-body text-xs font-bold max-sm:text-[11px] leading-tight text-neo-cream">
                <span className="sr-only">{i + 1}. </span>
                {step === 'live' ? (
                  <>
                    <span className="max-sm:hidden">{label(step)}</span>
                    <span className="sm:hidden">{modeName}</span>
                  </>
                ) : (
                  label(step)
                )}
              </span>
            </li>
          </Fragment>
        ))}
        {steps.length === 1 ? (
          <li className="self-center font-neo-body text-xs font-semibold leading-snug text-neo-cream/70">{t('education.starterPacks.sessions.noList')}</li>
        ) : null}
      </ol>

      <Link
        href={href}
        data-testid="home-session-run"
        className={cn(OUTLINE_BUTTON, 'mt-auto w-full after:absolute after:inset-0 after:rounded-neo-lg [@media(max-height:820px),(max-width:639px)]:absolute [@media(max-height:820px),(max-width:639px)]:end-3 [@media(max-height:820px),(max-width:639px)]:top-3 [@media(max-height:820px),(max-width:639px)]:mt-0 [@media(max-height:820px),(max-width:639px)]:min-h-10 [@media(max-height:820px),(max-width:639px)]:w-auto [@media(max-height:820px),(max-width:639px)]:px-3')}
      >
        <Play className="size-4" aria-hidden="true" />
        <span className="[@media(max-height:820px),(max-width:639px)]:hidden">{t(steps.length > 1 ? 'eduShell.home.flow.start' : 'eduShell.home.flow.play')}</span>
        <span className="hidden [@media(max-height:820px),(max-width:639px)]:inline">{t('eduShell.home.flow.startShort')}</span>
        <span className="sr-only">{t(session.nameKey)}</span>
      </Link>
    </li>
  );
}

export default HomeSessionFlowCard;
