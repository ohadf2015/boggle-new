'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/supabase/education/types';
import type { GradeBand } from '@/lib/education/library';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import { homeSessionRail, railRunHref, type RailSession } from '@/lib/education/homeSessionRail';
import { gradeBandsLabel } from '@/components/teacher/StarterPacksSection.data';
import { HomeSessionAll } from './HomeSessionAll';
import { QUIET_LINK } from './homeStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export const LANGUAGE_NAME_KEY: Record<Language, string> = {
  en: 'languages.english',
  he: 'languages.hebrew',
  sv: 'languages.swedish',
  ja: 'languages.japanese',
  es: 'languages.spanish',
  ru: 'languages.russian',
};

const CHIP = 'inline-flex items-center rounded-neo border-2 border-neo-black px-2 py-0.5 font-neo-body text-xs font-black uppercase text-neo-black';

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

function SessionCard({ item, language, gradeBand, href, t }: { item: RailSession; language: Language; gradeBand: GradeBand | null; href: string; t: T }) {
  const { session } = item;
  return (
    <li
      data-testid="home-session-card"
      className="group relative flex w-[78%] shrink-0 snap-start flex-col gap-2 rounded-neo-lg border-[3px] border-neo-cream/80 bg-neo-navy-light p-3 shadow-hard transition-[transform,box-shadow] duration-150 ease-out focus-within:-translate-y-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg motion-reduce:transition-none @lg:w-[46%] @2xl:w-auto"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-neo-display text-lg font-black leading-tight text-neo-cream">{t(session.nameKey)}</h3>
          <p className="mt-1 line-clamp-2 font-neo-body text-xs leading-snug text-neo-cream/80">{t(session.whenKey)}</p>
        </div>
        {session.mascot ? (
          <Image src={EDU_MASCOT[session.mascot]} alt="" width={512} height={512} sizes="64px" className="-mt-1 size-16 shrink-0 object-contain transition-transform duration-200 ease-out group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none" />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span data-testid="home-session-minutes" className={cn(CHIP, 'bg-neo-lime')}>{t('education.modePicker.minutes', { count: item.minutes })}</span>
        <span data-testid="home-session-grade" className={cn(CHIP, 'bg-neo-cyan')}>
          {gradeBand ? t(`eduLibrary.grade.${gradeBand}`) : gradeBandsLabel(session.gradeBands, t)}
        </span>
        <span data-testid="home-session-language" className={cn(CHIP, 'bg-neo-cream')}>{t(LANGUAGE_NAME_KEY[language])}</span>
      </div>
      <Link
        href={href}
        data-testid="home-session-run"
        className="mt-auto inline-flex min-h-11 items-center justify-center gap-1.5 rounded-neo border-[2px] border-neo-cream bg-neo-navy px-3 font-neo-display text-sm font-black text-neo-cream transition-colors duration-150 after:absolute after:inset-0 after:rounded-neo-lg group-hover:border-neo-lime group-hover:text-neo-lime focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
      >
        <Play className="size-4" aria-hidden="true" />
        {t('eduShell.home.rail.run')}
        <span className="sr-only">{t(session.nameKey)}</span>
      </Link>
    </li>
  );
}

export function HomeSessionRail({ classroomId, languages, gradeBand, nowMs, lastPlayedMs, ready, locale, className, t }: HomeSessionRailProps) {
  const headingId = useId();
  const [picked, setPicked] = useState<Language | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const language = picked && languages.includes(picked) ? picked : languages[0];
  const rail = language ? homeSessionRail({ language, gradeBand, nowMs, lastPlayedMs }) : [];
  if (ready && rail.length === 0) return null;

  return (
    <section data-testid="home-session-rail" aria-labelledby={headingId} className={cn('@container flex min-w-0 flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id={headingId} className="font-neo-display text-xl font-black text-neo-cream">
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
                'min-h-11 rounded-neo border-2 px-3 font-neo-body text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
                code === language ? 'border-neo-black bg-neo-lime text-neo-black' : 'border-neo-cream/60 text-neo-cream hover:border-neo-cream',
              )}
            >
              {t(LANGUAGE_NAME_KEY[code])}
            </button>
          ))}
        </div>
      ) : null}
      {ready && language ? (
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 pt-1 [scrollbar-width:thin] @2xl:mx-0 @2xl:grid @2xl:grid-cols-3 @2xl:overflow-visible @2xl:px-0 @2xl:pb-0">
          {rail.map((item) => (
            <SessionCard key={item.session.id} item={item} language={language} gradeBand={gradeBand} href={railRunHref(locale, item, classroomId)} t={t} />
          ))}
        </ul>
      ) : (
        <div aria-busy="true" className="min-h-[11.5rem]" />
      )}
      {allOpen && language ? <HomeSessionAll open={allOpen} onOpenChange={setAllOpen} language={language} classroomId={classroomId} t={t} /> : null}
    </section>
  );
}

export default HomeSessionRail;
