/**
 * ProgressDigestDashboard — last-lesson digest on the reports surface.
 *
 * Free teachers used to hit /teacher/reports and get only a ProGate with
 * blurred fake rows. The digest uses the same last-game read the dashboard
 * pulse already has, so the paywall sits under a real lesson instead of a
 * blank lock. Full history / PDF stays behind ProGate on this page.
 */

'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Lock, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useRecentClassroomGames } from '@/hooks/useRecentClassroomGames';
import { deriveProgressDigest } from '@/lib/education/progressDigest';
import { trackEduProgressDigestViewed } from '@/lib/education/telemetry';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { Stat } from '@/components/ui/Stat';
import { NeoPanel } from '@/components/ui/panel';

export interface ProgressDigestDashboardProps {
  classroomId: string;
  classroomName: string;
  rosterCount: number;
}

export function ProgressDigestDashboard({
  classroomId,
  classroomName,
  rosterCount,
}: ProgressDigestDashboardProps) {
  const { t, language } = useLanguage();
  const { hasPro, loading: proLoading } = useTeacherPro();
  const { games, isLoading, error, refresh } = useRecentClassroomGames({ classroomId, limit: 1 });

  const lastGame = isLoading ? null : (games[0] ?? null);
  const digest = useMemo(
    () =>
      deriveProgressDigest({
        rosterCount,
        lastGame,
        lastGameUnavailable: !!error,
        coveragePct: lastGame?.coveragePct ?? null,
      }),
    [rosterCount, lastGame, error]
  );

  const showLoading = isLoading && !error;

  useEffect(() => {
    if (showLoading || proLoading) return;
    trackEduProgressDigestViewed({ hasPro, state: digest.state });
    if (!hasPro) {
      trackGrowthEvent('iap_viewed', { source: 'progress_digest' });
    }
  }, [showLoading, proLoading, hasPro, digest.state]);

  return (
    <section
      data-testid="progress-digest-dashboard"
      aria-label={t('teacher.digest.regionLabel', { classroom: classroomName })}
      className="space-y-4"
    >
      <header>
        <h2 className="font-neo-display text-2xl font-bold text-neo-white">{t('teacher.digest.title')}</h2>
        <p className="mt-1 text-sm font-bold text-neo-cream/75">{t('teacher.digest.subtitle')}</p>
      </header>

      {showLoading ? (
        <div
          data-testid="progress-digest-loading"
          aria-busy="true"
          className="flex min-h-24 items-center justify-center gap-2 rounded-neo border-2 border-neo-cream/50 bg-neo-navy-light text-neo-cream/80"
        >
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          <span>{t('teacher.reports.loading')}</span>
        </div>
      ) : digest.state === 'unknown' ? (
        <NeoPanel tone="navy" className="p-5 text-center" data-testid="progress-digest-error">
          <p className="font-bold text-neo-white">{t('teacher.digest.loadError')}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-3 inline-flex min-h-11 items-center rounded-neo border-2 border-black bg-neo-cyan px-4 font-neo-display text-sm font-black text-black shadow-hard"
          >
            {t('teacher.digest.retry')}
          </button>
        </NeoPanel>
      ) : digest.state === 'noRoster' ? (
        <p data-testid="progress-digest-empty" className="rounded-neo border-2 border-dashed border-neo-cream/50 p-6 text-center text-neo-cream/80">
          {t('teacher.digest.emptyNoRoster')}
        </p>
      ) : digest.state === 'neverPlayed' ? (
        <p data-testid="progress-digest-empty" className="rounded-neo border-2 border-dashed border-neo-cream/50 p-6 text-center text-neo-cream/80">
          {t('teacher.digest.emptyNeverPlayed')}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              value={digest.playedCount ?? '—'}
              label={t('teacher.digest.played')}
              size="lg"
              className="w-full"
            />
            <Stat
              value={digest.gameRosterCount ?? digest.rosterCount}
              label={t('teacher.digest.roster')}
              size="lg"
              className="w-full"
            />
            <Stat
              value={digest.averageAccuracyPct != null ? `${digest.averageAccuracyPct}%` : '—'}
              label={t('teacher.digest.accuracy')}
              size="lg"
              className="w-full"
            />
            <Stat
              value={digest.coveragePct != null ? `${digest.coveragePct}%` : '—'}
              label={t('teacher.digest.coverage')}
              size="lg"
              className="w-full"
            />
          </div>

          {digest.topMissedWords.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-black uppercase tracking-wide text-neo-cream/70">
                {t('teacher.digest.missedWords')}
              </p>
              <ul className="flex flex-wrap gap-2">
                {digest.topMissedWords.map((word) => (
                  <li
                    key={word}
                    className="rounded-neo border-2 border-neo-pink bg-neo-pink/15 px-3 py-1 font-neo-display text-sm font-bold text-neo-white"
                  >
                    {word}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {digest.struggling.length > 0 && (
            <p className="text-sm font-bold text-neo-white/85">
              {t('teacher.digest.struggling', {
                names: digest.struggling.map((s) => s.name).join(', '),
              })}
            </p>
          )}
        </>
      )}

      {!proLoading && !hasPro && (
        <div
          data-testid="progress-digest-pro-cta"
          className="rounded-neo border-neo border-neo-lime bg-neo-navy-light p-5 text-center shadow-hard"
        >
          <Lock className="mx-auto mb-2 h-5 w-5 text-neo-lime" aria-hidden="true" />
          <p className="mb-3 text-sm font-bold text-neo-white/85">{t('teacher.digest.proCtaHint')}</p>
          <Link
            href={`/${language}/teacher/upgrade`}
            data-testid="progress-digest-pro-link"
            onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'progress_digest_teacher_pro' })}
            className="inline-flex min-h-11 items-center rounded-neo border-neo bg-neo-cyan px-6 py-3 font-black text-neo-navy shadow-hard transition-shadow hover:shadow-hard-lg"
          >
            {t('teacher.proGate.cta', { price: `$${TEACHER_PRO_PRICE_USD}` })}
          </Link>
        </div>
      )}
    </section>
  );
}

export default ProgressDigestDashboard;
