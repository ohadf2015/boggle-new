'use client';

/**
 * Shared chrome for the academy game modes (Word Workshop, Missed Words
 * Review): a dark-only, no-scroll full-height frame over the mode's world
 * scene (AcademyScene), a back button that always returns to /{locale}/student,
 * the student's own avatar chip and the XP chip. The loot chest lives in
 * AcademyReward.
 */

import { useEffect, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { cn } from '@/lib/utils';
import { AcademyScene, type SceneTheme } from './AcademyScene';

export const ACADEMY_ART = {
  wordcraft: '/images/education/node-wordcraft.webp',
  lesson: '/images/education/node-lesson.webp',
  chest: '/images/education/chest-books.webp',
  star: '/images/word-tower-v2/empire/fx-star.webp',
} as const;

/** Warm the browser cache for reaction art so a mood swap never shows an empty frame. */
export function usePreloadImages(srcs: readonly string[]): void {
  const key = srcs.join('|');
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Image === 'undefined') return;
    for (const src of key.split('|')) {
      const img = new Image();
      img.src = src;
    }
  }, [key]);
}

/** framer + the app's own "reduced effects" switch. */
export function useAcademyReducedMotion(): boolean {
  const prefers = useReducedMotion();
  const [reducedEffects] = useReducedEffects();
  return Boolean(prefers) || reducedEffects;
}

export interface AcademyPlayer {
  name: string;
  userId?: string | null;
  avatarConfig?: CustomAvatarConfig | null;
}

/** The student's own avatar + name, framed like the academy map HUD. */
export function AcademyPlayerChip({ player, className }: { player: AcademyPlayer; className?: string }) {
  return (
    <div
      data-testid="academy-player"
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-full border-[3px] border-neo-yellow bg-neo-navy-elevated py-0.5 pe-3 ps-0.5 shadow-hard',
        className,
      )}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-black bg-neo-orange lg:h-14 lg:w-14 min-[2200px]:h-20 min-[2200px]:w-20">
        <Avatar customAvatar={player.avatarConfig ?? null} userId={player.userId ?? player.name} pixelSize={80} disableEffects className="!h-full !w-full" />
      </span>
      <span className="truncate font-neo-display text-base font-black text-neo-white lg:text-2xl min-[2200px]:text-4xl">{player.name}</span>
    </div>
  );
}

export function AcademyModeFrame({
  title,
  onBack,
  accent = 'lime',
  theme = 'workshop',
  right,
  children,
  testId,
}: {
  title: string;
  onBack: () => void;
  accent?: 'lime' | 'pink' | 'cyan' | 'yellow';
  theme?: SceneTheme;
  right?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  const { t } = useLanguage();
  const ribbon = { lime: 'bg-neo-lime', pink: 'bg-neo-pink', cyan: 'bg-neo-cyan', yellow: 'bg-neo-yellow' }[accent];
  return (
    <div data-testid={testId} className="fixed inset-0 z-40 h-[100dvh] overflow-hidden bg-neo-navy text-neo-white">
      <AcademyScene theme={theme}>
        <header className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pt-6 min-[2200px]:gap-4 min-[2200px]:px-14 min-[2200px]:pt-10">
          <button
            type="button"
            onClick={onBack}
            data-testid="academy-back"
            aria-label={t('academy.modes.backToAcademy', 'Back to Academy')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-neo border-[3px] border-black bg-neo-cream text-black shadow-hard active:translate-y-0.5 active:shadow-none lg:h-14 lg:w-14 min-[2200px]:h-20 min-[2200px]:w-20"
          >
            <DirectionalIcon icon={ArrowLeft} className="h-5 w-5 lg:h-7 lg:w-7 min-[2200px]:h-10 min-[2200px]:w-10" />
          </button>
          {/* !border-0 !p-0: legacy animations.css gives every `header>div` a 2px border + padding on short landscape screens. */}
          <div className="flex min-w-0 flex-1 justify-start !border-0 !p-0">
            <h1
              className={cn(
                // Never an ellipsis: long locale titles wrap to two tight lines on phones (e.g. "Repaso de palabras falladas").
                'line-clamp-2 min-w-0 -rotate-1 break-words rounded-neo border-[3px] border-black px-2 py-0.5 font-neo-display text-[14px] font-black uppercase leading-[1.1] text-black shadow-hard [overflow-wrap:anywhere] sm:px-3 sm:py-1 sm:text-2xl sm:leading-tight sm:tracking-wide lg:px-5 lg:text-3xl min-[2200px]:px-7 min-[2200px]:py-2 min-[2200px]:text-5xl',
                ribbon,
              )}
            >
              {title}
            </h1>
          </div>
          {right}
        </header>
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 lg:px-12">
          {children}
        </main>
      </AcademyScene>
    </div>
  );
}

/** XP line: pending (still recording) vs the server's number. */
export function XpChip({ xp, className }: { xp: number | null; className?: string }) {
  const { t } = useLanguage();
  if (xp === null) {
    return (
      <span data-testid="academy-xp-pending" className={cn('inline-flex items-center gap-1 rounded-neo border-[3px] border-neo-cream bg-neo-navy-light px-3 py-1 font-neo-display text-sm font-bold text-neo-cream/80', className)}>
        {t('academy.modes.savingXp', 'Saving XP…')}
      </span>
    );
  }
  return (
    <motion.span
      data-testid="academy-xp"
      initial={{ scale: 0.6, rotate: -6 }}
      animate={{ scale: 1, rotate: -2 }}
      transition={{ type: 'spring', stiffness: 420, damping: 14 }}
      className={cn('inline-flex items-center gap-1 rounded-neo border-[3px] border-black bg-neo-lime px-3 py-1 font-neo-display text-lg font-black text-black shadow-hard lg:px-4 lg:text-3xl', className)}
    >
      <Sparkles className="h-4 w-4" aria-hidden />
      {t('academy.modes.xpEarned', '+{xp} XP', { xp })}
    </motion.span>
  );
}

export const primaryButtonClass =
  'flex min-h-14 items-center justify-center gap-2 rounded-neo border-[3px] border-black bg-neo-lime px-6 font-neo-display text-xl font-black uppercase text-black shadow-hard transition-transform active:translate-y-0.5 active:shadow-none lg:min-h-20 lg:text-3xl';
export const secondaryButtonClass =
  'flex min-h-12 items-center justify-center gap-2 rounded-neo border-[3px] border-black bg-neo-cream px-5 font-neo-display text-base font-black uppercase text-black shadow-hard active:translate-y-0.5 active:shadow-none lg:min-h-20 lg:text-2xl';
