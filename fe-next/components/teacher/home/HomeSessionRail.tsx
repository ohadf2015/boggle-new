'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/supabase/education/types';
import type { GradeBand } from '@/lib/education/library';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import { homeSessionRail, railRunHref, type RailSession } from '@/lib/education/homeSessionRail';
import { gradeBandsLabel } from '@/components/teacher/StarterPacksSection.data';
import { HomeSessionAll } from './HomeSessionAll';
import { CHIP, OUTLINE_BUTTON, QUIET_LINK } from './homeStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export const LANGUAGE_NAME_KEY: Record<Language, string> = {
  en: 'languages.english',
  he: 'languages.hebrew',
  sv: 'languages.swedish',
  ja: 'languages.japanese',
  es: 'languages.spanish',
  ru: 'languages.russian',
};

const ROW_SIZE = 3;

export interface HomeSessionRailProps {
  classroomId: string;
  languages: readonly Language[];
  gradeBand: GradeBand | null;
  nowMs: number;
  lastPlayedMs: number | null;
  /** False until lessons and this week's activity resolve, so the order never reshuffles under a thumb. */
  ready: boolean;
  locale: string;
  className?: string;
  t: T;
}

function SessionCard({ item, language, gradeBand, href, t, testId = 'home-session-card' }: { item: RailSession; language: Language; gradeBand: GradeBand | null; href: string; t: T; testId?: string }) {
  const { session } = item;
  return (
    <li
      data-testid={testId}
      className="group relative grid w-full shrink-0 snap-start grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 rounded-neo-lg border-2 border-neo-cream/35 bg-neo-navy-light p-2.5 sm:gap-y-1.5 sm:p-3 transition-colors duration-150 focus-within:border-neo-cream/60 hover:border-neo-cream/60 motion-reduce:transition-none"
    >
      {session.mascot ? (
        <Image src={EDU_MASCOT[session.mascot]} alt="" width={512} height={512} sizes="40px" className="row-span-2 size-10 object-contain sm:row-span-1" />
      ) : (
        <span aria-hidden="true" className="row-span-2 sm:row-span-1" />
      )}
      <h3 className="min-w-0 font-neo-display text-base font-bold leading-tight text-neo-cream">{t(session.nameKey)}</h3>
      <Link
        href={href}
        data-testid="home-session-run"
        title={t('eduShell.home.rail.run')}
        className={cn(OUTLINE_BUTTON, 'row-span-2 after:absolute after:inset-0 after:rounded-neo-lg max-sm:min-w-11 max-sm:px-0 sm:row-span-1')}
      >
        <Play className="size-4" aria-hidden="true" />
        <span className="max-sm:sr-only">{t('eduShell.home.rail.run')}</span>
        <span className="sr-only">{t(session.nameKey)}</span>
      </Link>
      <div className="col-start-2 flex flex-wrap items-center gap-1.5 sm:col-span-3 sm:col-start-1">
        <span data-testid="home-session-minutes" className={CHIP}>{t('education.modePicker.minutes', { count: item.minutes })}</span>
        <span data-testid="home-session-grade" className={CHIP}>
          {gradeBand ? t(`eduLibrary.grade.${gradeBand}`) : gradeBandsLabel(session.gradeBands, t)}
        </span>
        <span data-testid="home-session-language" className={CHIP}>{t(LANGUAGE_NAME_KEY[language])}</span>
      </div>
    </li>
  );
}

export function HomeSessionRail({ classroomId, languages, gradeBand, nowMs, lastPlayedMs, ready, locale, className, t }: HomeSessionRailProps) {
  const headingId = useId();
  const [picked, setPicked] = useState<Language | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const language = picked && languages.includes(picked) ? picked : languages[0];
  const sessions = language ? homeSessionRail({ language, gradeBand, nowMs, lastPlayedMs }).slice(0, ROW_SIZE * 2) : [];
  const rail = sessions.slice(0, ROW_SIZE);
  const more = sessions.slice(ROW_SIZE);
  if (ready && rail.length === 0) return null;

  return (
    <section data-testid="home-session-rail" aria-labelledby={headingId} className={cn('@container flex min-w-0 flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id={headingId} className="font-neo-display text-lg font-bold text-neo-cream">
          {t('education.starterPacks.sessions.title')}
        </h2>
        <button type="button" data-testid="home-session-see-all" onClick={() => setAllOpen(true)} className={QUIET_LINK}>
          {t('eduShell.home.rail.seeAll')}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </button>
      </div>
      {languages.length > 1 ? (
        <div data-testid="home-session-languages" role="radiogroup" aria-label={t('eduShell.home.rail.language')} className="flex flex-wrap gap-1.5">
          {languages.map((code) => (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={code === language}
              onClick={() => setPicked(code)}
              className={cn(
                'inline-flex min-h-11 items-center gap-1 rounded-neo border-2 px-3 font-neo-body text-sm font-bold text-neo-cream transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream',
                code === language ? 'border-neo-lime' : 'border-neo-cream/30 hover:border-neo-cream',
              )}
            >
              {code === language ? <Check className="size-4" aria-hidden="true" /> : null}
              {t(LANGUAGE_NAME_KEY[code])}
            </button>
          ))}
        </div>
      ) : null}
      {ready && language ? (
        <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] @2xl:grid @2xl:grid-cols-3 @2xl:overflow-visible">
          {rail.map((item) => (
            <SessionCard key={item.session.id} item={item} language={language} gradeBand={gradeBand} href={railRunHref(locale, item, classroomId)} t={t} />
          ))}
        </ul>
      ) : (
        <div aria-busy="true" className="min-h-[6.25rem]" />
      )}
      {ready && language && more.length > 0 ? (
        <div data-testid="home-session-more" className="hidden @2xl:block min-h-0 flex-1 [container:session-more/size]">
          <ul className="hidden grid-cols-3 gap-3 pt-1 [@container_session-more_(min-height:8.5rem)]:grid">
            {more.map((item) => (
              <SessionCard key={item.session.id} item={item} language={language} gradeBand={gradeBand} href={railRunHref(locale, item, classroomId)} t={t} testId="home-session-card-more" />
            ))}
          </ul>
        </div>
      ) : null}
      {allOpen && language ? <HomeSessionAll open={allOpen} onOpenChange={setAllOpen} language={language} classroomId={classroomId} t={t} /> : null}
    </section>
  );
}

export default HomeSessionRail;
