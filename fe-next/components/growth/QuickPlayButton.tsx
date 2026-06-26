'use client';

/**
 * QuickPlayButton - Large, prominent button for instant gameplay.
 * Animated pulse to draw attention. Shows quickest available mode.
 * Click navigates to game immediately (< 5 seconds to play).
 * Neo-brutalist: neo-yellow bg, shadow-hard, Zap icon.
 */

import React, { memo, useCallback } from 'react';
import { Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { QUICK_PLAY_OPTIONS } from '@/shared/types/growth';

const MODE_ROUTES: Record<string, string> = {
  daily: '/daily',
  classic: '/singleplayer',
  blast: '/blast',
  'word-hunt': '/word-hunt',
};

export const QuickPlayButton: React.FC = memo(function QuickPlayButton() {
  const { t, language } = useLanguage();
  const router = useRouter();

  const quickestMode = QUICK_PLAY_OPTIONS
    .sort((a, b) => a.priority - b.priority)[0];

  const handleClick = useCallback(() => {
    const route = MODE_ROUTES[quickestMode.mode] ?? '/singleplayer';
    router.push(`/${language}${route}`);
  }, [router, language, quickestMode.mode]);

  return (
    <button
      type="button"
      data-testid="quick-play-button"
      onClick={handleClick}
      aria-label={t('quickPlay.ariaLabel')}
      className={cn(
        'relative w-full py-4 px-6 rounded-neo',
        'bg-neo-yellow text-neo-navy',
        'border-neo shadow-hard',
        'font-neo-display font-bold text-xl',
        'active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]',
        'hover:brightness-110 transition-all',
        'flex items-center justify-center gap-3',
        'group cursor-pointer'
      )}
    >
      {/* Pulse ring */}
      <span
        className={cn(
          'absolute inset-0 rounded-neo',
          'border-2 border-neo-yellow/50',
          'animate-ping opacity-30 pointer-events-none'
        )}
        aria-hidden="true"
      />

      {/* Icon */}
      <Zap
        className={cn(
          'w-7 h-7 text-neo-navy',
          'group-hover:rotate-12 transition-transform'
        )}
        aria-hidden="true"
      />

      {/* Label */}
      <span>{t('quickPlay.play')}</span>

      {/* Sublabel */}
      <span className="text-sm font-normal text-neo-navy/70">
        {t('quickPlay.seconds', { count: String(quickestMode.estimatedSeconds) })}
      </span>
    </button>
  );
});

export default QuickPlayButton;
