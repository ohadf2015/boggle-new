'use client';

import React, { memo, useEffect, useState } from 'react';
import { Hourglass, Flag } from 'lucide-react';
import { getSeasonIdentity, seasonEndsIn } from '@/lib/seasons';

export interface DailySeasonRibbonSeason {
  id: number;
  theme: string;
  startDate: string;
  endDate: string;
}

interface DailySeasonRibbonProps {
  season: DailySeasonRibbonSeason;
  isCurrent: boolean;
  /** See TabbedDailyLeaderboard's `T`: bivariant so every caller's `t` shape fits. */
  t: { bivarianceHack(key: string, fallbackOrParams?: string | Record<string, string | number>): string }['bivarianceHack'];
  /** Test hook: freeze the clock. Production ticks once a minute. */
  now?: Date;
  className?: string;
}

/**
 * DailySeasonRibbon — the season's identity, in one strip, above the daily
 * season board: theme name, this month's twist, accent color + grid skin, and a
 * countdown that turns into "Season over" for past seasons. Every month looks
 * different, so the board itself signals that something new is running.
 */
export const DailySeasonRibbon = memo<DailySeasonRibbonProps>(({ season, isCurrent, t, now, className = '' }) => {
  const identity = getSeasonIdentity(season.id);
  const accent = identity.accentColor;

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (now) return undefined;
    const id = setInterval(() => setTick(v => v + 1), 60_000);
    return () => clearInterval(id);
  }, [now]);
  void tick;

  const remaining = seasonEndsIn(new Date(season.endDate), now ?? new Date());
  const endsSoon = !remaining.ended && remaining.days < 3;

  const twistTitleKey = `season.twist.${identity.twist.key}.title`;
  const twistTitleRaw = t(twistTitleKey);
  const twistTitle = twistTitleRaw && twistTitleRaw !== twistTitleKey ? twistTitleRaw : identity.twist.title;

  const countdown = remaining.ended
    ? t('wordHunt.leaderboard.seasonEnded')
    : t('wordHunt.leaderboard.seasonEndsIn')
        .replace('{days}', String(remaining.days))
        .replace('{hours}', String(remaining.hours));

  return (
    <div
      data-testid="daily-season-ribbon"
      className={`relative overflow-hidden rounded-neo border-2 bg-neo-navy shadow-hard-sm ${identity.gridSkinClass} ${className}`}
      style={{ borderColor: accent }}
    >
      <div
        data-testid="daily-season-accent"
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-center gap-2.5 sm:gap-3 px-3 py-2.5 pt-3">
        <div
          className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-neo border-2 border-neo-black flex items-center justify-center text-xl sm:text-2xl shadow-hard-sm"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        >
          {identity.twist.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-neo-display text-sm sm:text-base text-neo-white leading-tight truncate"
            style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.6)' }}
          >
            {t('season.name', { number: season.id, theme: season.theme })}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-neo border border-black/60 bg-neo-navy/70 text-[10px] sm:text-[11px] font-neo-display leading-none shrink-0"
              style={{ color: accent }}
            >
              {twistTitle}
            </span>
            <span className="text-[10px] sm:text-xs text-neo-white/60 truncate">
              {t('wordHunt.leaderboard.seasonHint')}
            </span>
          </div>
        </div>
        <div
          className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-neo border-2 border-neo-black font-neo-display text-[11px] sm:text-xs leading-none tabular-nums shadow-hard-sm ${
            remaining.ended
              ? 'bg-neo-navy-light text-neo-white/70'
              : endsSoon
                ? 'bg-neo-pink text-neo-black motion-safe:animate-pulse'
                : 'bg-neo-lime text-neo-black'
          }`}
          data-testid="daily-season-countdown"
          data-current={isCurrent ? 'true' : 'false'}
        >
          {remaining.ended ? <Flag className="w-3 h-3" aria-hidden /> : <Hourglass className="w-3 h-3" aria-hidden />}
          <span>{countdown}</span>
        </div>
      </div>
    </div>
  );
});

DailySeasonRibbon.displayName = 'DailySeasonRibbon';

export default DailySeasonRibbon;
