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
import { ProBadge } from '@/components/ui/ProBadge';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';

/** A free teacher's headline for their latest real class game; per-student and weekly views stay behind Pro. */
export function FreeGameHeadlineCard({ classroomId }: { classroomId: string }) {
  const { t, language } = useLanguage();
  const entitlement = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  const pro = hasProAccess(entitlement, nowMs);
  const { games, isLoading } = useRecentClassroomGames({ classroomId: entitlement.loading || pro ? '' : classroomId, limit: 5 });

  if (entitlement.loading || pro || isLoading) return null;
  const headline = freeGameHeadline(games);
  if (!headline) return null;

  return (
    <section
      data-testid="free-game-headline"
      aria-labelledby="free-game-headline-title"
      className="rounded-neo-xl border-[3px] border-edu-line bg-edu-surface p-3 shadow-hard-lg sm:p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id="free-game-headline-title" className="font-neo-display text-lg font-bold text-edu-ink">
          {t('teacher.lastGame.freeHeadlineTitle')}
          <span className="ms-2 text-sm font-bold text-edu-ink/70">{t(roundTitleKey(headline.gameMode))}</span>
        </h2>
        <p data-testid="free-headline-players" className="inline-flex items-center gap-1.5 text-sm font-bold text-edu-ink/85">
          <Users className="size-4" aria-hidden />
          {t(pluralKeyOf('teacher.lastGame.playersPlayed', headline.players, language), { count: headline.players })}
        </p>
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
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-edu-ink/85 underline decoration-2 underline-offset-4 hover:text-edu-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edu-line"
        >
          <ProBadge size="xs" label={t('teacher.lastGame.proBadge')} />
          {t('teacher.lastGame.proLine')}
        </Link>
      </header>

      <div className="mt-3 grid grid-cols-[auto_1fr] items-start gap-2">
        <div data-testid="free-headline-average" className="max-w-[9rem] pe-3">
          <p className="font-neo-display text-2xl font-black tabular-nums text-edu-ink">{headline.classAverage}</p>
          <p className="text-xs font-bold text-edu-ink/70">{t('teacher.lastGame.classAverage')}</p>
        </div>
        <div className="min-w-0">
          <p className="mb-1.5 text-xs font-bold text-edu-ink/70">{t('teacher.lastGame.topMissed')}</p>
          {headline.topMissed.length === 0 ? (
            <p className="text-sm font-bold text-edu-ink/80">{t('teacher.lastGame.nothingToReview')}</p>
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

    </section>
  );
}

export default FreeGameHeadlineCard;
