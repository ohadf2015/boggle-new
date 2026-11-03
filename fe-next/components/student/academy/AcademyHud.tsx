'use client';

/**
 * The Academy's top bar — an illustrated plaque over the sky (adventure RunHud /
 * WT2 V2TopBar weight): framed avatar with a level medallion, a gold-trimmed
 * XP bar that counts up and catches a shine, and coin-style totals.
 */

import Image from 'next/image';
import { m } from 'framer-motion';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';
import { UserX } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCountUp } from '@/hooks/useCountUp';
import { getXpProgress } from '@/backend/modules/xpManager';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { InkPanel, Medallion, INK_TEXT, toneStyle } from './chrome';
import { StreakMark } from './StreakMark';

interface Props {
  userId: string;
  name: string;
  avatarConfig?: CustomAvatarConfig | null;
  totalXp: number;
  streak: number;
  /** Last play was yesterday — today's flame can still be saved. */
  streakAtRisk?: boolean;
  stars: number;
  isGuest: boolean;
  onSignOut: () => void;
  reducedMotion: boolean;
  /** The class (or the Academy's name) — the page title, worn as a tag beside the name. */
  title?: string | null;
  /** Wide screens get a taller plaque; a phone on its side a slim one. */
  size?: 'compact' | 'normal' | 'wide';
}

/** Recessed "coin tray" the totals sit in — one object, not two floating pills. */
const TRAY_STYLE = {
  background: 'linear-gradient(180deg,var(--neo-abyss-light) 0%,color-mix(in srgb,var(--neo-purple-dark) 25%,var(--neo-abyss-light)) 100%)',
  boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb,var(--neo-yellow) 80%,var(--neo-orange)), inset 0 3px 5px rgba(0,0,0,0.6)',
} as const;

export function AcademyHud({ userId, name, avatarConfig, totalXp, streak, streakAtRisk = false, stars, isGuest, onSignOut, reducedMotion, title, size = 'normal' }: Props) {
  const wide = size === 'wide';
  const compact = size === 'compact';
  const { t } = useLanguage();
  const osReduced = useEduReducedMotion();
  const still = reducedMotion || !!osReduced;
  const xp = getXpProgress(totalXp);
  const shownXp = useCountUp({ target: xp.xpInCurrentLevel, duration: 1100, startDelay: 250, immediate: still });
  const shownStars = useCountUp({ target: stars, duration: 900, startDelay: 400, immediate: still });
  const pct = xp.xpNeededForNextLevel > 0 ? Math.min(100, (shownXp / xp.xpNeededForNextLevel) * 100) : xp.progressPercent;

  return (
    <InkPanel
      // Not <header>: a global landscape-phone rule repositions every header and forces its svgs to 20px.
      role="banner"
      tone="night"
      data-testid="academy-hud"
      data-size={size}
      className={
        compact
          ? 'flex w-full items-center gap-2 p-1 pe-1'
          : `mx-auto flex w-full items-center gap-2 p-1.5 pe-1.5 sm:gap-3 sm:p-2 ${wide ? 'max-w-5xl' : 'max-w-xl'}`
      }
    >
      {/* Avatar in a gold frame, level medallion on its corner. */}
      <div className="relative shrink-0">
        <span className="block rounded-full border-3 border-neo-black p-[3px]" style={toneStyle('gold', { shadow: 2, trim: 1 })}>
          <span className="block overflow-hidden rounded-full border-2 border-neo-black bg-neo-cyan">
            <Avatar customAvatar={avatarConfig ?? null} userId={userId} pixelSize={wide ? 52 : compact ? 26 : 38} disableEffects />
          </span>
        </span>
        <span
          role="img"
          aria-label={t('academy.student.level', 'Level {level}', { level: xp.currentLevel })}
          className="absolute -bottom-1.5 -end-2"
        >
          <Medallion tone="lime" size={compact ? 20 : 24} shadow={1}>
            <span className="font-neo-display text-xs font-black leading-none text-neo-black">{xp.currentLevel}</span>
          </Medallion>
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <p dir="auto" className={`min-w-0 shrink truncate font-neo-display font-black leading-tight text-neo-white ${wide ? 'text-xl' : compact ? 'text-sm' : 'text-base sm:text-lg'} ${INK_TEXT}`}>
            {name}
          </p>
          {title && (
            <span
              dir="auto"
              data-testid="academy-class-tag"
              className={`min-w-0 max-w-full truncate rounded-full border-2 border-neo-black px-2 font-neo-display font-black uppercase leading-[18px] tracking-wide text-neo-white ${wide ? 'text-xs leading-[22px]' : 'text-xs'} ${INK_TEXT}`}
              style={toneStyle('pink', { shadow: 0, trim: 1 })}
            >
              {title}
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-label={t('academy.student.xpToNext', 'XP to next level')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={xp.progressPercent}
          className={`relative mt-1 w-full overflow-hidden rounded-full border-2 border-neo-black ${wide ? 'h-5' : compact ? 'h-3' : 'h-4'}`}
          style={{ background: 'linear-gradient(180deg,var(--neo-abyss-light),color-mix(in srgb,var(--neo-purple-dark) 35%,var(--neo-abyss-light)))', boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb,var(--neo-yellow) 80%,var(--neo-orange)), inset 0 3px 4px rgba(0,0,0,0.55)' }}
        >
          <div
            className="absolute inset-y-[2px] start-[2px] rounded-full"
            style={{
              width: `calc(${pct}% - 4px)`,
              minWidth: pct > 0 ? 8 : 0,
              backgroundImage: 'linear-gradient(180deg,color-mix(in srgb,var(--neo-lime) 40%,var(--neo-cream)) 0%,var(--neo-lime) 45%,var(--neo-lime-dark) 100%)',
              boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.55), 1px 0 0 rgb(var(--neo-black))',
            }}
          >
            {!still && (
              <m.span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-6 -skew-x-12 bg-neo-white/60"
                animate={{ x: ['-100%', '400%'] }}
                transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 2.6, ease: 'easeInOut', delay: 1.4 }}
              />
            )}
          </div>
        </div>
        <p dir="ltr" className={`mt-0.5 text-start ${compact ? 'sr-only' : ''} font-neo-display text-xs font-black uppercase tracking-wider text-neo-yellow tabular-nums rtl:text-end`}>
          {t('academy.student.xpLine', '{xp} / {need} XP', { xp: shownXp, need: xp.xpNeededForNextLevel })}
        </p>
      </div>

      <span
        data-testid="academy-hud-tray"
        className={`flex shrink-0 items-center gap-1.5 rounded-[14px] border-2 border-neo-black py-1 ps-1 pe-2 ${wide ? 'gap-3 ps-1.5 pe-3' : ''}`}
        style={TRAY_STYLE}
      >
      <span className="flex items-center gap-1" title={t('education.xp.streak', 'Day Streak')}>
        <StreakMark streak={streak} atRisk={streakAtRisk} still={still} size={wide ? 36 : compact ? 22 : 28} t={t} />
        <span className="sr-only">{t('education.xp.streak', 'Day Streak')}</span>
        <span className={`min-w-[1ch] font-neo-display ${compact ? 'text-base' : 'text-lg'} font-black tabular-nums text-neo-white ${INK_TEXT}`}>{streak}</span>
      </span>
      <span aria-hidden="true" className="h-5 w-[2px] rounded-full bg-neo-yellow/40" />
      <span className="flex items-center gap-1" title={t('academy.student.stars', 'Stars')}>
        <span className={`relative drop-shadow-[2px_2px_0_#000] ${wide ? 'h-9 w-9' : compact ? 'h-[22px] w-[22px]' : 'h-7 w-7'}`}>
          <Image src="/images/adventure/loot/gold-coin.webp" alt="" aria-hidden="true" fill unoptimized sizes="32px" className="object-contain" />
        </span>
        <span className="sr-only">{t('academy.student.stars', 'Stars')}</span>
        <span className={`min-w-[1ch] font-neo-display ${compact ? 'text-base' : 'text-lg'} font-black tabular-nums text-neo-white ${INK_TEXT}`}>{shownStars}</span>
      </span>
      </span>

      {isGuest && (
        <button
          type="button"
          onClick={onSignOut}
          className="icon-only flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full border-2 border-neo-cream px-2 font-neo-body text-xs font-bold text-neo-white hover:border-neo-pink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          <UserX className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{t('student.notYou', 'Not you?')}</span>
        </button>
      )}
    </InkPanel>
  );
}
