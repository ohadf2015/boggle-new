'use client';

import { useId, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/supabase/education/types';
import type { GradeBand } from '@/lib/education/library';
import { homeSessionRail, railRunHref } from '@/lib/education/homeSessionRail';
import { HomeSessionAll } from './HomeSessionAll';
import { HomeSessionFlowCard, LANGUAGE_NAME_KEY } from './HomeSessionFlowCard';
import { QUIET_LINK } from './homeStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export { LANGUAGE_NAME_KEY } from './HomeSessionFlowCard';

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
    <section data-testid="home-session-rail" aria-labelledby={headingId} className={cn('@container flex min-w-0 flex-col gap-2 max-sm:gap-1', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h2 id={headingId} className="font-neo-display text-lg font-bold text-neo-cream">
            {t('education.starterPacks.sessions.title')}
          </h2>
          <p className="font-neo-body text-sm text-neo-cream/75 [@media(max-height:820px),(max-width:639px)]:sr-only">{t('eduShell.home.flow.subtitle')}</p>
        </div>
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
            <HomeSessionFlowCard key={item.session.id} item={item} language={language} gradeBand={gradeBand} href={railRunHref(locale, item, classroomId)} t={t} />
          ))}
        </ul>
      ) : (
        <div aria-busy="true" className="min-h-[9rem]" />
      )}
      {ready && language && more.length > 0 ? (
        <div data-testid="home-session-more" className="hidden @2xl:block min-h-0 flex-1 [container:session-more/size]">
          <ul className="hidden grid-cols-3 gap-3 pt-1 [@container_session-more_(min-height:9.5rem)]:grid">
            {more.map((item) => (
              <HomeSessionFlowCard key={item.session.id} item={item} language={language} gradeBand={gradeBand} href={railRunHref(locale, item, classroomId)} t={t} testId="home-session-card-more" />
            ))}
          </ul>
        </div>
      ) : null}
      {allOpen && language ? <HomeSessionAll open={allOpen} onOpenChange={setAllOpen} language={language} classroomId={classroomId} t={t} /> : null}
    </section>
  );
}

export default HomeSessionRail;
