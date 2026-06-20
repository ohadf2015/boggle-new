'use client';

import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { getXpProgress, getTitleForLevel } from '@/backend/modules/xpManager';
import { clampPercent } from '@/lib/landing/homeHubFormat';
import type { ProfileData } from '@/contexts/auth/authTypes';

interface HomeTopBarProps {
  profile: ProfileData | null;
  /** daily-challenge streak (days) */
  streak: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * HomeTopBar — the arcade-home greeting row: avatar wrapped in a lime level ring
 * (conic fill = real XP progress within the current level), a level badge,
 * "Hey, {name}" + "Level {n} · {title}", and streak + coins pills.
 *
 * All numbers are real: level/title/progress derive from `profile.total_xp`
 * via the shared `xpManager` curve, coins from `profile.total_coins`. Missing
 * fields degrade gracefully (level 1, no title, 0 coins) — never "undefined".
 */
export function HomeTopBar({ profile, streak, t }: HomeTopBarProps) {
  // Profile + streak are client-resolved (auth/daily hooks). On the server and
  // the first client render they may differ — and `coins.toLocaleString()` is
  // locale-dependent (Node vs browser) — so gate ALL dynamic values behind a
  // mount flag. SSR + first client render both paint the neutral state (level 1,
  // "Player", 0) → identical → no hydration mismatch; real values commit after
  // mount (the same reflow the rest of the landing already accepts).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const p = mounted ? profile : null;
  const liveStreak = mounted ? streak : 0;

  const totalXp = p?.total_xp ?? 0;
  const progress = getXpProgress(totalXp);
  // Prefer the persisted level but fall back to the XP-derived one if absent.
  const level = p?.current_level ?? progress.currentLevel;
  const title = getTitleForLevel(level);
  const ringPct = clampPercent(progress.progressPercent);
  const coins = p?.total_coins ?? 0;
  const name = p?.display_name || p?.username || t('common.player');

  return (
    <div className="flex items-center justify-between gap-2.5 px-0.5">
      {/* avatar + greeting */}
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="relative h-[50px] w-[50px] shrink-0 rounded-full p-[3px]"
          style={{
            background: `conic-gradient(var(--neo-lime) 0 ${ringPct}%, rgba(255,255,255,0.16) ${ringPct}% 100%)`,
          }}
          aria-hidden="true"
        >
          <div className="h-full w-full overflow-hidden rounded-full border-2 border-black bg-neo-navy-light">
            <Avatar
              customAvatar={p?.avatar_config ?? null}
              userId={p?.id}
              pixelSize={44}
              disableEffects
            />
          </div>
          <span className="absolute -bottom-[3px] -end-[3px] flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 border-black bg-neo-lime px-1 font-neo-display text-[11px] font-black leading-none text-neo-navy shadow-hard-sm">
            {level}
          </span>
        </div>
        <div className="min-w-0">
          <div className="truncate font-neo-display text-[17px] font-bold leading-tight text-neo-cream">
            {t('landing.home.greeting', { name })}
          </div>
          <div className="truncate font-neo-body text-xs font-medium leading-snug text-neo-white/55">
            {title
              ? t('landing.home.levelTitle', { level, title })
              : t('landing.home.levelOnly', { level })}
          </div>
        </div>
      </div>

      {/* streak + coins */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-neo-pill border-2 border-black bg-neo-navy-light py-1 pe-2.5 ps-[7px] shadow-hard-sm">
          <Flame className="h-[15px] w-[15px] text-neo-orange" strokeWidth={2.2} aria-hidden="true" />
          <span className="font-neo-display text-sm font-bold tabular-nums text-neo-cream">{liveStreak}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-neo-pill border-2 border-black bg-neo-navy-light py-1 pe-2.5 ps-[7px] shadow-hard-sm">
          <CoinGlyph />
          <span className="font-neo-display text-sm font-bold tabular-nums text-neo-cream">
            {coins.toLocaleString()}
          </span>
        </span>
      </div>
    </div>
  );
}

/** Two overlapping lime discs — a tiny stacked-coins glyph, on-brand vs a generic icon. */
function CoinGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="12" r="7" fill="var(--neo-lime)" stroke="#000" strokeWidth="1.4" />
      <circle cx="15" cy="12" r="7" fill="#d4ff4d" stroke="#000" strokeWidth="1.4" />
    </svg>
  );
}

export default HomeTopBar;
