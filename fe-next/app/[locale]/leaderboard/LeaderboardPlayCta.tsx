'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useExperiment } from '@/hooks/useExperiment';
import {
  trackLeaderboardPlayCtaShown,
  trackLeaderboardPlayCtaClicked,
} from '@/utils/posthogEngagement';

/**
 * exp-leaderboard-play-cta-v1 render path (trackers + flag already shipped). A
 * slim "Play games to get ranked!" strip pinned above the leaderboard table,
 * funnelling engaged spectators into a game start. Only the `play-cta` arm
 * renders anything; control is null. Self-contained so PageClient (already over
 * the 500-line budget) grows by just the mount line.
 */
export function LeaderboardPlayCta({ language }: { language: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const { variant } = useExperiment('exp-leaderboard-play-cta-v1');
  const active = variant === 'play-cta';

  useEffect(() => {
    if (active) trackLeaderboardPlayCtaShown({ variant });
  }, [active, variant]);

  if (!active) return null;

  const onPlay = () => {
    trackLeaderboardPlayCtaClicked({ variant });
    router.push(`/${language}/singleplayer`);
  };

  return (
    <div
      data-testid="leaderboard-play-cta"
      className="mb-4 flex items-center justify-between gap-3 rounded-neo border-neo-thick border-black bg-neo-lime px-4 py-3 shadow-hard"
    >
      <span className="font-neo-display text-sm font-black uppercase tracking-wide text-black sm:text-base">
        {t('leaderboard.noRankYet')}
      </span>
      <button
        type="button"
        onClick={onPlay}
        className="min-h-[44px] shrink-0 rounded-neo border-neo border-black bg-neo-navy px-5 py-2 font-neo-display text-sm font-black uppercase text-neo-white shadow-hard-sm transition active:translate-y-px hover:brightness-110"
      >
        {t('common.playNow')}
      </button>
    </div>
  );
}
