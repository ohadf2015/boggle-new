'use client';

import type { RefObject } from 'react';
import Link from 'next/link';
import { AnimatePresence, m } from 'framer-motion';
import { ArrowLeft, Heart, Flame, Trophy, Users, Pyramid } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPyramidsForLocale } from '@/lib/connections/pyramid/puzzles';
import { MAX_LIVES } from '@/lib/connections/livesStore';
import type { MomentumState } from '@/lib/connections/momentum';
import ConnectionsMomentumChip from './ConnectionsMomentumChip';

interface PlayHudProps {
  isRTL: boolean;
  lives: number;
  level: number;
  totalLevels: number;
  streak: number;
  score: number;
  onBack: () => void;
  heartsRef: RefObject<HTMLDivElement | null>;
  levelBadgeRef: RefObject<HTMLDivElement | null>;
}

/** Back + lives + level + score in one compact sticky band above the puzzle. */
export function PlayHud({ isRTL, lives, level, totalLevels, streak, score, onBack, heartsRef, levelBadgeRef }: PlayHudProps) {
  const { t } = useLanguage();
  return (
    <m.div
      initial={{ y: -12 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring' as const, stiffness: 280, damping: 24, delay: 0.1 }}
      // pe-14: the global in-game mute button floats over the inline-end corner.
      className="sticky top-0 z-30 -mx-3 flex items-center gap-2.5 border-b-2 border-neo-purple/40 bg-neo-navy/90 py-2 ps-3 pe-14 backdrop-blur-sm sm:-mx-4 sm:ps-4 [@media(max-height:700px)]:py-1.5"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label={t('common.back')}
        className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-neo border-black bg-neo-navy-light text-neo-white shadow-hard-sm transition-[transform,translate,scale,rotate,box-shadow,background-color,border-color,color,opacity] duration-100 before:absolute before:-inset-1 hover:shadow-hard active:translate-y-[1px] active:shadow-hard-pressed"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
      </button>

      <div ref={heartsRef} className="flex shrink-0 items-center gap-1" aria-label={`${t('connections.lives')}: ${lives} / ${MAX_LIVES}`}>
        <span className="sr-only">{t('connections.lives')}</span>
        {Array.from({ length: MAX_LIVES }).map((_, i) => {
          const alive = i < lives;
          return (
            <m.span
              key={`life-${i}`}
              animate={
                alive
                  ? { scale: 1, opacity: 1, filter: 'drop-shadow(0 0 4px rgba(255,20,147,0.6))' }
                  : { scale: 0.55, opacity: 0.25, filter: 'none' }
              }
              transition={{ type: 'spring' as const, stiffness: 420, damping: 16 }}
              className="select-none leading-none"
            >
              <Heart
                className={alive ? 'h-5 w-5 fill-neo-pink text-neo-pink' : 'h-5 w-5 fill-neo-white/15 text-neo-white/25'}
                strokeWidth={2}
                aria-hidden="true"
              />
            </m.span>
          );
        })}
      </div>

      <div className="ms-auto flex min-w-0 items-center gap-3">
        <m.div
          ref={levelBadgeRef}
          key={`level-${level}`}
          initial={{ scale: 0.85, rotate: -2 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring' as const, stiffness: 400, damping: 14 }}
          className="flex min-w-0 items-center gap-1.5 rounded-neo border-neo border-black bg-neo-cyan px-2 py-1 shadow-hard-sm"
        >
          <span className="truncate font-neo-display text-[11px] font-bold uppercase leading-none tracking-wider text-neo-navy/70 rtl:tracking-normal">
            {t('connections.level')}
          </span>
          <span className="shrink-0 font-neo-display text-lg font-black leading-none text-neo-navy tabular-nums" dir="ltr">
            {level}
            <span className="font-mono text-[11px] font-bold text-neo-navy/60"> / {totalLevels}</span>
          </span>
        </m.div>

        <div className="flex shrink-0 items-center gap-1.5 font-neo-body">
          <span className="sr-only">{t('connections.score')}</span>
          <AnimatePresence>
            {streak >= 2 && (
              <m.span
                key={`streak-${streak}`}
                initial={{ scale: 0.5, opacity: 0, y: -8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring' as const, stiffness: 400, damping: 16 }}
                className="inline-flex items-center gap-0.5 text-sm font-bold leading-none text-neo-orange"
              >
                <Flame className="h-4 w-4 fill-neo-orange/30" strokeWidth={2.5} aria-hidden="true" />
                {streak}
              </m.span>
            )}
          </AnimatePresence>
          <AnimatePresence mode="popLayout">
            <m.span
              key={score}
              initial={{ y: -14 }}
              animate={{ y: 0 }}
              exit={{ y: 14, opacity: 0 }}
              transition={{ type: 'spring' as const, stiffness: 380, damping: 22 }}
              className="inline-block text-lg font-bold leading-none text-neo-cyan tabular-nums"
            >
              {score.toLocaleString()}
            </m.span>
          </AnimatePresence>
        </div>
      </div>
    </m.div>
  );
}

const LINK =
  'relative inline-flex min-w-0 items-center justify-center gap-1.5 rounded-neo border-neo border-black px-2.5 py-1 font-neo-body text-xs font-bold shadow-hard-sm transition-[transform,translate,scale,rotate,box-shadow,background-color,border-color,color,opacity] duration-100 before:absolute before:-inset-y-2 before:inset-x-0 hover:shadow-hard active:translate-y-[1px] active:shadow-hard-pressed [@media(max-height:700px)]:h-9 [@media(max-height:700px)]:w-9 [@media(max-height:700px)]:shrink-0 [@media(max-height:700px)]:px-0 [@media(max-height:700px)]:before:-inset-1';
// Short screens fold the links into icon squares beside the momentum chip, keeping the name for screen readers.
const LINK_LABEL = 'truncate [@media(max-height:700px)]:sr-only';

interface PlayModeRowProps {
  language: string;
  momentum: MomentumState;
  xpEarned: number;
}

/** Pyramid / Daily / Community links plus the momentum chip; one row on short screens, two on tall ones. */
export function PlayModeRow({ language, momentum, xpEarned }: PlayModeRowProps) {
  const { t } = useLanguage();
  const links = [
    getPyramidsForLocale(language).length > 0 && {
      href: `/${language}/connections/pyramid`,
      label: t('connections.pyramid.cta'),
      Icon: Pyramid,
      tone: 'bg-neo-purple/25 text-neo-purple hover:bg-neo-purple/40',
    },
    { href: `/${language}/connections/daily`, label: t('connections.daily.cta'), Icon: Trophy, tone: 'bg-neo-yellow/15 text-neo-yellow hover:bg-neo-yellow/25' },
    { href: `/${language}/connections/community`, label: t('connections.community.cta'), Icon: Users, tone: 'bg-neo-pink/15 text-neo-pink hover:bg-neo-pink/25' },
  ].filter((link) => !!link);

  return (
    <div className="flex flex-col gap-2 [@media(max-height:700px)]:flex-row [@media(max-height:700px)]:items-center">
      <div className="flex min-w-0 justify-center gap-1.5 [@media(max-height:700px)]:order-last">
        {links.map(({ href, label, Icon, tone }) => (
          <Link key={href} href={href} title={label} className={`${LINK} ${tone}`}>
            <Icon className="h-3.5 w-3.5 shrink-0 [@media(max-height:700px)]:h-4 [@media(max-height:700px)]:w-4" strokeWidth={2.5} aria-hidden="true" />
            <span className={LINK_LABEL}>{label}</span>
          </Link>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0 flex-1">
          <ConnectionsMomentumChip state={momentum} />
        </div>
        <AnimatePresence>
          {xpEarned > 0 && (
            <m.span
              key={xpEarned}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring' as const, stiffness: 360, damping: 18 }}
              className="shrink-0 rounded-full border border-neo-lime/40 bg-neo-lime/10 px-2.5 py-1 font-neo-body text-xs font-bold text-neo-lime tabular-nums"
            >
              +{xpEarned}
              <span className="[@media(max-height:700px)]:sr-only"> {t('connections.xpEarned')}</span>
            </m.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
