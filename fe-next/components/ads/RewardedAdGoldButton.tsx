'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { Play, Coins, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { trackRewardedAdOffered } from '@/utils/growthTracking';

interface RewardedAdGoldButtonProps {
  goldAmount: number;
  onRewardEarned?: (amount: number) => void;
  className?: string;
  /** Placement tag for PostHog funnel (e.g. 'gold_top_up', 'player_waiting'). */
  surface: string;
  /** Larger, more prominent variant for primary CTAs. */
  size?: 'sm' | 'md';
  /**
   * Suppress the perpetual idle motion (bob / shimmer sweep / pulsing ring).
   * Used where the button is secondary chrome sitting beside a primary CTA
   * (e.g. the lobby reward cluster next to Start) so it doesn't compete.
   */
  quietIdle?: boolean;
  /**
   * Pre-load the rewarded slot on mount. Set ONLY at results-moment
   * placements where a tap is plausible; passive placements (lobby, profile)
   * must stay cold — the old unconditional preload burned 198 loads for
   * 2 shows in 30 days (AdMob audit 2026-07-03).
   */
  warm?: boolean;
}

export const RewardedAdGoldButton: React.FC<RewardedAdGoldButtonProps> = ({
  goldAmount,
  onRewardEarned,
  className,
  surface,
  size = 'sm',
  quietIdle = false,
  warm = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t, language } = useLanguage();
  const reducedMotion = useReducedMotion();

  const btnRef = useRef<HTMLButtonElement>(null);
  const offeredRef = useRef(false);
  const [glare, setGlare] = useState<{ x: number; y: number } | null>(null);
  const [burstKey, setBurstKey] = useState(0);

  // `canShowAd` is false when no real ad provider can serve (web placeholder
  // in prod) or the daily cap is hit — defaults to true so the button still
  // renders for callers/tests that don't surface the flag. Real hook always
  // returns an explicit boolean.
  const { showAd, status, isPlaceholderCooldown, canShowAd = true } = useRewardedAd({
    surface: 'doubleGold',
    analyticsSurface: surface,
    // Preload only at results-moment placements (warm prop); passive
    // placements stay cold and load on tap instead.
    warm,
    onRewardEarned: (amount) => {
      onRewardEarned?.(amount);
    },
  });

  // Fire offer once the button can actually show — only when an active ad
  // provider exists. Gating here keeps the PostHog offer→watch funnel clean
  // (no phantom offers for a hidden CTA).
  useEffect(() => {
    if (!canShowAd || offeredRef.current) return;
    offeredRef.current = true;
    trackRewardedAdOffered(surface);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canShowAd]);

  const capped = isPlaceholderCooldown;
  const isLoading = status === 'loading' || status === 'showing';
  const isDone = status === 'completed';
  const isDisabled = isLoading || capped;
  const isIdle = status === 'idle' && !capped;
  // Perpetual idle decoration (bob / shimmer / ring); suppressed when quietIdle.
  const idleMotion = isIdle && !quietIdle;

  const label = status === 'showing'
    ? t('ads.rewarded.earning')
    : isDone
      ? t('ads.rewarded.earned').replace('{amount}', safeToLocaleString(goldAmount, language))
      : capped
        ? t('ads.rewarded.cooldown')
        : t('ads.rewarded.watchForGold').replace('{amount}', safeToLocaleString(goldAmount, language));

  const Icon = isDone ? CheckCircle : isLoading ? Loader2 : Play;
  const isMd = size === 'md';

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (reducedMotion || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setGlare({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [reducedMotion]);

  const handleMouseLeave = useCallback(() => setGlare(null), []);

  const handleClick = useCallback(() => {
    if (!isDisabled && !reducedMotion) setBurstKey((k) => k + 1);
    showAd();
  }, [isDisabled, reducedMotion, showAd]);

  const burstCoins = Array.from({ length: 6 });

  // No active ad provider (or daily cap reached) → hide the CTA entirely
  // rather than show a button that grants nothing.
  if (!canShowAd) return null;

  return (
    <m.button
      ref={btnRef}
      type="button"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      disabled={isDisabled}
      aria-label={t('ads.rewarded.watchForGold').replace('{amount}', safeToLocaleString(goldAmount, language))}
      whileHover={!isDisabled ? { scale: 1.05, y: -2 } : undefined}
      whileTap={!isDisabled ? { scale: 0.94 } : undefined}
      animate={idleMotion && !reducedMotion ? { y: [0, -1.5, 0] } : { y: 0 }}
      transition={
        idleMotion && !reducedMotion
          ? { y: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } }
          : { type: 'spring', stiffness: 400, damping: 18 }
      }
      className={cn(
        'relative inline-flex items-center gap-2 font-bold overflow-hidden isolate',
        isMd ? 'px-4 py-2.5 text-base' : 'px-3 py-1.5 text-sm',
        'border-2 border-black rounded-neo shadow-hard',
        'transition-colors active:shadow-hard-pressed',
        isDone
          ? 'bg-neo-lime text-black border-black'
          : isDark
            ? 'bg-neo-navy-light text-neo-lime border-neo-lime/60 hover:bg-neo-navy-light/80'
            : 'bg-neo-yellow text-black border-black hover:brightness-95',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      {/* idle diagonal shimmer sweep */}
      {idleMotion && !reducedMotion && (
        <m.span
          aria-hidden
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background:
              'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)',
            backgroundSize: '250% 100%',
          }}
          animate={{ backgroundPosition: ['200% 0%', '-100% 0%'] }}
          transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' }}
        />
      )}

      {/* cursor-following gold glare */}
      {glare && !isDisabled && (
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-200"
          style={{
            background: `radial-gradient(circle 120px at ${glare.x}px ${glare.y}px, rgba(255,255,255,0.55), transparent 60%)`,
            opacity: 1,
            mixBlendMode: 'overlay',
          }}
        />
      )}

      {/* coin particle burst on click */}
      <AnimatePresence>
        {burstKey > 0 && (
          <m.span
            key={burstKey}
            aria-hidden
            className="absolute inset-0 pointer-events-none z-30"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            {burstCoins.map((_, i) => {
              const angle = (i / burstCoins.length) * Math.PI * 2;
              const dx = Math.cos(angle) * 36;
              const dy = Math.sin(angle) * 28 - 8;
              return (
                <m.span
                  key={`burst-${i}`}
                  className="absolute left-1/2 top-1/2 text-neo-yellow"
                  initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
                  animate={{ x: dx, y: dy, scale: 1, opacity: [0, 1, 0] }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                >
                  <Coins className="h-3 w-3 drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]" />
                </m.span>
              );
            })}
          </m.span>
        )}
      </AnimatePresence>

      {/* idle ring hint */}
      {idleMotion && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-neo pointer-events-none animate-pulse opacity-40 ring-2 ring-neo-lime z-10"
        />
      )}

      <Icon className={cn('relative z-20', isMd ? 'h-4 w-4' : 'h-3.5 w-3.5', isLoading && 'animate-spin')} />
      <span className="relative z-20 flex items-center gap-1">
        <span>{label}</span>
        {isIdle && (
          <m.span
            className="inline-flex items-center gap-0.5 font-black text-neo-lime"
            animate={!reducedMotion && !quietIdle ? { rotate: [0, -6, 6, 0] } : undefined}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
          >
            <Coins className={isMd ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
            +{safeToLocaleString(goldAmount, language)}
          </m.span>
        )}
      </span>
    </m.button>
  );
};

export default RewardedAdGoldButton;
