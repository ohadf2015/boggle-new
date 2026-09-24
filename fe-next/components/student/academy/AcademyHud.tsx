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
}

export function AcademyHud({ userId, name, avatarConfig, totalXp, streak, stars, isGuest, onSignOut, reducedMotion }: Props) {
  const { t } = useLanguage();
  const osReduced = useReducedMotion();
  const still = reducedMotion || !!osReduced;
  const xp = getXpProgress(totalXp);
  const shownXp = useCountUp({ target: xp.xpInCurrentLevel, duration: 1100, startDelay: 250, immediate: still });
  const shownStars = useCountUp({ target: stars, duration: 900, startDelay: 400, immediate: still });
  const pct = xp.xpNeededForNextLevel > 0 ? Math.min(100, (shownXp / xp.xpNeededForNextLevel) * 100) : xp.progressPercent;

  return (
    <InkPanel
      as="header"
      tone="night"
      data-testid="academy-hud"
      className="mx-auto flex w-full max-w-3xl items-center gap-2 p-1.5 pe-2 sm:gap-3 sm:p-2"
    >
      {/* Avatar in a gold frame, level medallion on its corner. */}
      <div className="relative shrink-0">
        <span className="block rounded-full border-3 border-neo-black p-[3px]" style={toneStyle('gold', { shadow: 2, trim: 1 })}>
          <span className="block overflow-hidden rounded-full border-2 border-neo-black bg-neo-cyan">
            <Avatar customAvatar={avatarConfig ?? null} userId={userId} pixelSize={38} disableEffects />
          </span>
        </span>
        <span
          role="img"
          aria-label={t('academy.student.level', 'Level {level}', { level: xp.currentLevel })}
          className="absolute -bottom-1.5 -end-2"
        >
          <Medallion tone="lime" size={24} shadow={1}>
            <span className="font-neo-display text-[11px] font-black leading-none text-neo-black">{xp.currentLevel}</span>
          </Medallion>
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p dir="auto" className={`truncate font-neo-display text-base font-black leading-tight text-neo-white sm:text-lg ${INK_TEXT}`}>
          {name}
        </p>
        <div
          role="progressbar"
          aria-label={t('academy.student.xpToNext', 'XP to next level')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={xp.progressPercent}
          className="relative mt-1 h-4 w-full overflow-hidden rounded-full border-2 border-neo-black"
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
        <p dir="ltr" className="mt-0.5 text-start font-neo-display text-[10px] font-black uppercase tracking-wider text-neo-yellow tabular-nums rtl:text-end">
          {t('academy.student.xpLine', '{xp} / {need} XP', { xp: shownXp, need: xp.xpNeededForNextLevel })}
        </p>
      </div>

      <span className="flex shrink-0 items-center gap-1" title={t('education.xp.streak', 'Day Streak')}>
        <Medallion tone="ember" size={32}>
          <Flame className="h-4 w-4 fill-neo-yellow text-neo-black" strokeWidth={2.5} />
        </Medallion>
        <span className="sr-only">{t('education.xp.streak', 'Day Streak')}</span>
        <span className={`min-w-[1ch] font-neo-display text-lg font-black tabular-nums text-neo-white ${INK_TEXT}`}>{streak}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1" title={t('academy.student.stars', 'Stars')}>
        <span className="relative h-8 w-8 drop-shadow-[2px_2px_0_#000]">
          <Image src="/images/adventure/loot/gold-coin.webp" alt="" aria-hidden="true" fill unoptimized sizes="32px" className="object-contain" />
        </span>
        <span className="sr-only">{t('academy.student.stars', 'Stars')}</span>
        <span className={`min-w-[1ch] font-neo-display text-lg font-black tabular-nums text-neo-white ${INK_TEXT}`}>{shownStars}</span>
      </span>

      {isGuest && (
        <button
          type="button"
          onClick={onSignOut}
          className="flex h-8 shrink-0 items-center gap-1 rounded-full border-2 border-neo-cream px-2 font-neo-body text-xs font-bold text-neo-white hover:border-neo-pink"
        >
          <UserX className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{t('student.notYou', 'Not you?')}</span>
        </button>
      )}
    </InkPanel>
  );
}
