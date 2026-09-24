'use client';

/**
 * The Academy's top bar — an illustrated plaque over the sky (adventure RunHud /
 * WT2 V2TopBar weight): framed avatar with a level medallion, a gold-trimmed
 * XP bar that counts up and catches a shine, and coin-style totals.
 */

import Image from 'next/image';
import { m, useReducedMotion } from 'framer-motion';
import { Flame, UserX } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCountUp } from '@/hooks/useCountUp';
import { getXpProgress } from '@/backend/modules/xpManager';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { InkPanel, Medallion, INK_TEXT, toneStyle } from './chrome';

interface Props {
  userId: string;
  name: string;
  avatarConfig?: CustomAvatarConfig | null;
  totalXp: number;
  streak: number;
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
  background: 'linear-gradient(180deg,#120d33 0%,#1d1650 100%)',
  boxShadow: 'inset 0 0 0 1.5px #f5c542, inset 0 3px 5px rgba(0,0,0,0.6)',
} as const;

export function AcademyHud({ userId, name, avatarConfig, totalXp, streak, stars, isGuest, onSignOut, reducedMotion, title, size = 'normal' }: Props) {
  const wide = size === 'wide';
  const compact = size === 'compact';
  const { t } = useLanguage();
  const osReduced = useReducedMotion();
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
            <span className="font-neo-display text-[11px] font-black leading-none text-neo-black">{xp.currentLevel}</span>
          </Medallion>
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p dir="auto" className={`min-w-0 shrink truncate font-neo-display font-black leading-tight text-neo-white ${wide ? 'text-xl' : compact ? 'text-sm' : 'text-base sm:text-lg'} ${INK_TEXT}`}>
            {name}
          </p>
          {title && (
            <h1
              dir="auto"
              data-testid="academy-class-tag"
              className={`min-w-0 max-w-[62%] shrink-[2] truncate rounded-full border-2 border-neo-black px-2 font-neo-display font-black uppercase leading-[18px] tracking-wide text-neo-white ${wide ? 'text-xs leading-[22px]' : 'text-[10px]'} ${INK_TEXT}`}
              style={toneStyle('pink', { shadow: 0, trim: 1 })}
            >
              {title}
            </h1>
          )}
        </div>
        <div
          role="progressbar"
          aria-label={t('academy.student.xpToNext', 'XP to next level')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={xp.progressPercent}
          className={`relative mt-1 w-full overflow-hidden rounded-full border-2 border-neo-black ${wide ? 'h-5' : compact ? 'h-3' : 'h-4'}`}
          style={{ background: 'linear-gradient(180deg,#120d33,#261d63)', boxShadow: 'inset 0 0 0 1.5px #f5c542, inset 0 3px 4px rgba(0,0,0,0.55)' }}
        >
          <div
            className="absolute inset-y-[2px] start-[2px] rounded-full"
            style={{
              width: `calc(${pct}% - 4px)`,
              minWidth: pct > 0 ? 8 : 0,
              backgroundImage: 'linear-gradient(180deg,#f4ff9a 0%,#bfff00 45%,#5fae00 100%)',
              boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.55), 1px 0 0 #000',
            }}
          >
            {!still && (
              <m.span
                aria-hidden="true"
                className="absolute inset-y-0 w-6 -skew-x-12 bg-white/60"
                initial={{ left: '-30%' }}
                animate={{ left: '130%' }}
                transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 2.6, ease: 'easeInOut', delay: 1.4 }}
              />
            )}
          </div>
        </div>
        <p dir="ltr" className={`mt-0.5 text-start ${compact ? 'sr-only' : ''} font-neo-display ${wide ? 'text-xs' : 'text-[10px]'} font-black uppercase tracking-wider text-neo-yellow tabular-nums rtl:text-end`}>
          {t('academy.student.xpLine', '{xp} / {need} XP', { xp: shownXp, need: xp.xpNeededForNextLevel })}
        </p>
      </div>

      <span
        data-testid="academy-hud-tray"
        className={`flex shrink-0 items-center gap-1.5 rounded-[14px] border-2 border-neo-black py-1 ps-1 pe-2 ${wide ? 'gap-3 ps-1.5 pe-3' : ''}`}
        style={TRAY_STYLE}
      >
      <span className="flex items-center gap-1" title={t('education.xp.streak', 'Day Streak')}>
        <Medallion tone="ember" size={wide ? 36 : compact ? 22 : 28} shadow={1}>
          <Flame className="h-4 w-4 fill-neo-yellow text-neo-black" strokeWidth={2.5} />
        </Medallion>
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
          className="icon-only flex h-8 shrink-0 items-center gap-1 rounded-full border-2 border-neo-cream px-2 font-neo-body text-xs font-bold text-neo-white hover:border-neo-pink"
        >
          <UserX className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{t('student.notYou', 'Not you?')}</span>
        </button>
      )}
    </InkPanel>
  );
}
