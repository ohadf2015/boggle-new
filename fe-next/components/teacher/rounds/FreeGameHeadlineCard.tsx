'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecentClassroomGames } from '@/hooks/useRecentClassroomGames';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { hasProAccess } from '@/lib/education/teacherPlanGate';
import { freeGameHeadline } from '@/lib/education/freeGameHeadline';
import { trackTeacherProUpgradeClick } from '@/lib/education/proFunnelTelemetry';
import { roundTitleKey } from './roundReport';

/** A free teacher's headline for their latest real class game; per-student and weekly views stay behind Pro. */
export function FreeGameHeadlineCard({ classroomId }: { classroomId: string }) {
  const { t, language } = useLanguage();
  const entitlement = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  const { games, isLoading } = useRecentClassroomGames({ classroomId, limit: 5 });

  if (entitlement.loading || hasProAccess(entitlement, nowMs) || isLoading) return null;
  const headline = freeGameHeadline(games);
  if (!headline) return null;

  return (
    <section
      data-testid="free-game-headline"
      aria-labelledby="free-game-headline-title"
      className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-3 shadow-hard-sm sm:p-4"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="free-game-headline-title" className="font-neo-display text-lg font-black text-neo-white">
          {t('teacher.lastGame.freeHeadlineTitle')}
          <span className="ms-2 text-sm font-bold text-neo-white/60">{t(roundTitleKey(headline.gameMode))}</span>
        </h2>
        <p data-testid="free-headline-players" className="inline-flex items-center gap-1.5 text-sm font-bold text-neo-cyan">
          <Users className="size-4" aria-hidden />
          {t('teacher.lastGame.playersPlayed', { count: headline.players })}
        </p>
      </header>

      <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr]">
        <div data-testid="free-headline-average" className="rounded-neo border-2 border-neo-cream/50 bg-neo-navy px-3 py-2">
          <p className="font-neo-display text-2xl font-black tabular-nums text-neo-lime">{headline.classAverage}</p>
          <p className="text-xs font-bold text-neo-white/70">{t('teacher.lastGame.classAverage')}</p>
        </div>
        <div className="rounded-neo border-2 border-neo-cream/50 bg-neo-navy px-3 py-2">
          <p className="mb-1.5 text-xs font-bold text-neo-white/70">{t('teacher.lastGame.topMissed')}</p>
          {headline.topMissed.length === 0 ? (
            <p className="text-sm font-bold text-neo-white/80">{t('teacher.lastGame.nothingToReview')}</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {headline.topMissed.map((word) => (
                <li key={word} data-testid="free-headline-missed" className="rounded-neo border-2 border-neo-black bg-neo-cream px-2 py-0.5 text-sm font-black text-neo-black">
                  <bdi>{word}</bdi>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Link
        href={`/${language}/teacher/upgrade`}
        data-testid="free-headline-pro"
        onClick={() => {
          try {
            trackTeacherProUpgradeClick({ page: window.location.pathname, locale: language, placement: 'analytics_free_headline' });
          } catch {
            /* analytics must never block */
          }
        }}
        className="mt-3 inline-flex min-h-9 items-center gap-2 text-sm font-bold text-neo-white/85 underline-offset-4 hover:text-neo-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
      >
        <span className="rounded-full border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-xs font-black uppercase text-neo-black">
          {t('teacher.lastGame.proBadge')}
        </span>
        {t('teacher.lastGame.proLine')}
      </Link>
    </section>
  );
}

export default FreeGameHeadlineCard;
