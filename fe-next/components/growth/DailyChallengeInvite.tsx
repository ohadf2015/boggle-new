'use client';

/**
 * DailyChallengeInvite — Post-game CTA driving D1 retention.
 *
 * Why: CrazyGames D1 retention sits at 0% — Daily Challenge is the one
 * mechanic that requires players to return on a different calendar day.
 * Hook them at the result-screen pause point with outcome-aware copy.
 *
 * Gating: hides if not authenticated, already played today, or dismissed
 * this session. Streak-aware copy when streak is alive.
 */

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWordOfTheDay } from '@/hooks/useWordOfTheDay';
import { useEngagementStatus } from '@/hooks/useEngagementStatus';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

const DISMISS_KEY = 'dailyChallengeInvite:dismissed';

interface Props {
  isWinner: boolean;
  className?: string;
  /** Override streak value (defaults to live engagement-status hook). */
  streakDays?: number;
}

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function DailyChallengeInvite({ isWinner, className, streakDays }: Props) {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { playerFound, loading } = useWordOfTheDay(language);
  const { streak: liveStreak } = useEngagementStatus();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [dismissed, setDismissed] = useState<boolean>(readDismissed);
  const effectiveStreak = streakDays ?? liveStreak ?? 0;

  const handleDismiss = useCallback(() => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* noop */ }
    setDismissed(true);
  }, []);

  if (!isAuthenticated) return null;
  if (loading) return null;
  if (playerFound) return null;
  if (dismissed) return null;

  const title = isWinner ? t('dailyInvite.titleWon') : t('dailyInvite.titleLost');
  const body = isOnCrazyGamesPlatform
    ? t('dailyInvite.bodyCgComeBack')
    : isWinner
      ? t('dailyInvite.bodyWon')
      : t('dailyInvite.bodyLost');

  const accentBorder = isWinner ? 'border-neo-yellow/40' : 'border-neo-cyan/40';
  const accentBg = isWinner ? 'bg-neo-yellow/15' : 'bg-neo-cyan/15';
  const accentRing = isWinner ? 'border-neo-yellow/30' : 'border-neo-cyan/30';
  const accentText = isWinner ? 'text-neo-yellow' : 'text-neo-cyan';

  return (
    <div
      data-testid="daily-challenge-invite"
      className={cn(
        'relative flex items-stretch gap-3 w-full',
        'rounded-neo border-neo bg-neo-navy/80 p-4',
        'shadow-hard-sm hover:shadow-hard transition-shadow',
        accentBorder,
        className
      )}
    >
      <button
        type="button"
        data-testid="daily-challenge-invite-dismiss"
        onClick={handleDismiss}
        aria-label={t('dailyInvite.dismiss')}
        className="absolute top-1 end-1 p-1 rounded-md text-white/40 hover:text-white/80 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className={cn(
        'shrink-0 w-10 h-10 rounded-neo border-neo flex items-center justify-center',
        accentBg, accentRing
      )}>
        <Sparkles className={cn('w-5 h-5', accentText)} />
      </div>

      <div className="flex-1 min-w-0 pe-4">
        <p className={cn(
          'text-xs font-neo-display font-bold uppercase tracking-wider mb-0.5',
          accentText
        )}>
          {title}
        </p>
        <p className="text-sm font-neo-body text-neo-white/90 leading-snug">
          {body}
        </p>
        {effectiveStreak > 0 ? (
          <p className="text-xs font-neo-body text-neo-orange mt-1">
            {t('dailyInvite.streak', { count: effectiveStreak })}
          </p>
        ) : null}
      </div>

      <Link
        href="/daily"
        data-testid="daily-challenge-invite-cta"
        className={cn(
          'self-center shrink-0 px-3 py-2 rounded-neo border-neo border-black',
          'text-xs font-neo-display font-bold uppercase tracking-wider',
          'shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-shadow',
          isWinner ? 'bg-neo-yellow text-neo-navy' : 'bg-neo-cyan text-neo-navy'
        )}
      >
        {t('dailyInvite.playNow')}
      </Link>
    </div>
  );
}

export default DailyChallengeInvite;
