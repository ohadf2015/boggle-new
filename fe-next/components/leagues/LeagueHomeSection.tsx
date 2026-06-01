'use client';

/**
 * LeagueHomeSection — prominent "Your League" block for the home screen.
 *
 * Surfaces the player's tier, live position, and how they stand against their
 * league (the promotion/relegation pressure + the rivals directly above and
 * below them). Previously league standing was buried in a desktop-only header
 * badge and the leaderboard page; this brings "you vs your league" to the top
 * of the home flow on every device.
 *
 * Self-hides for guests and players not yet in a league.
 */
import { useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLeague, type LeagueTier } from '@/hooks/useLeague';
import { getLeagueStandingSummary } from '@/lib/league/standingSummary';
import { LeagueRivalsCard } from './LeagueRivalsCard';

const TIER_EMOJI: Record<LeagueTier, string> = {
  bronze: '\u{1F949}',
  silver: '\u{1F948}',
  gold: '\u{1F947}',
  diamond: '\u{1F48E}',
  ruby: '\u{2764}\u{FE0F}',
};

const TIER_COLOR: Record<LeagueTier, string> = {
  bronze: 'text-amber-500',
  silver: 'text-gray-300',
  gold: 'text-yellow-400',
  diamond: 'text-cyan-300',
  ruby: 'text-red-400',
};

function interpolate(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, String(v)).replace(`{{${k}}}`, String(v));
  return out;
}

export function LeagueHomeSection() {
  const { t, language } = useLanguage();
  const { isAuthenticated, profile } = useAuth();
  const { tier, standings, myPosition, isLoading } = useLeague(profile?.id ?? null);

  const summary = useMemo(
    () =>
      myPosition && standings.length > 0
        ? getLeagueStandingSummary({ position: myPosition, totalPlayers: standings.length })
        : null,
    [myPosition, standings.length]
  );

  // Guests and players not in a league get nothing (no skeleton flash for guests).
  if (!isAuthenticated) return null;
  if (!isLoading && !myPosition) return null;

  const tierName = t(`league.${tier}`) || tier;

  let statusText = '';
  let statusColor = 'text-neo-white';
  if (summary) {
    if (summary.zone === 'promotion') {
      statusText = t('league.holdingPromotion') || 'Holding a promotion spot!';
      statusColor = 'text-green-400';
    } else if (summary.zone === 'relegation') {
      statusText = t('league.inDropZone') || 'In the drop zone — climb out!';
      statusColor = 'text-red-400';
    } else {
      statusText = interpolate(t('league.spotsFromPromotion') || '{n} spots from promotion', {
        n: summary.toPromotion,
      });
      statusColor = 'text-neo-lime';
    }
  }

  return (
    <section data-testid="league-home-section" aria-label={t('league.yourLeague') || 'Your League'}>
      <div className="rounded-neo border-3 border-black bg-gradient-to-br from-neo-navy-light to-neo-navy shadow-hard overflow-hidden">
        {/* Header: title + tier + position + full-standings link */}
        <Link
          href={`/${language}/leaderboard`}
          className="flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-black/30 hover:bg-neo-white/5 transition-colors no-underline"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Trophy className="w-5 h-5 text-neo-yellow shrink-0" strokeWidth={2.5} aria-hidden="true" />
            <span className="font-neo-display font-black uppercase tracking-wide text-neo-white truncate">
              {t('league.yourLeague') || 'Your League'}
            </span>
            {!isLoading && (
              <span className={`font-neo-display text-sm font-bold ${TIER_COLOR[tier]} shrink-0`}>
                <span className="me-1" aria-hidden="true">{TIER_EMOJI[tier]}</span>
                {tierName}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-neo-white/70 shrink-0">
            {t('league.viewFullStandings') || 'Standings'}
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </span>
        </Link>

        {/* Status line: zone pressure */}
        {statusText && (
          <div className="px-4 py-2 border-b-2 border-black/20 bg-neo-navy/40">
            <p className={`font-neo-body text-sm font-bold ${statusColor}`}>
              {myPosition && (
                <span className="text-neo-white/80 me-2">
                  {interpolate(t('league.positionOf') || '#{position} of {total}', {
                    position: myPosition,
                    total: standings.length,
                  })}
                </span>
              )}
              {statusText}
            </p>
          </div>
        )}

        {/* Rivals: you flanked by the players directly above and below */}
        <div className="p-3">
          <LeagueRivalsCard />
        </div>
      </div>
    </section>
  );
}
