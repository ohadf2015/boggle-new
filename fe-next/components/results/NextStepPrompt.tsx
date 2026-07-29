'use client';

import React, { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { Bot, ArrowLeft, ArrowRight, Sparkles, Trophy, Swords, Infinity as InfinityIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { clearSessionPreservingUsername } from '@/utils/session';
import { getCloseLossMessage } from '@/shared/utils/closeLossDetector';
import useReducedMotion from '@/hooks/useReducedMotion';

export type NextStepMode = 'practice' | 'solo-bots' | 'daily' | 'multiplayer-bots' | 'blast' | 'word-hunt';

interface NextStepPromptProps {
  /** Current game mode to determine next suggestion */
  currentMode: NextStepMode;
  /** Callback when user wants to return to lobby */
  onBackToLobby: () => void;
  /** Optional callback for direct action (e.g., quick rematch) instead of navigation */
  onAction?: () => void;
  /** Display variant */
  variant?: 'desktop' | 'mobile' | 'landscape';
  /** Additional CSS classes */
  className?: string;
  /** Whether this was a close multiplayer loss */
  isCloseLoss?: boolean;
  /** Absolute score difference for close loss */
  scoreDifference?: number;
  /** Callback for rematch action */
  onRematch?: () => void;
  /** Hide the secondary "back to lobby" button (when a top-level back button already exists) */
  hideBackButton?: boolean;
}

interface ModeConfig {
  titleKey: string;
  descKey: string;
  href: string;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
}

/**
 * NextStepPrompt - Guides players through progressive game modes
 *
 * Progression flow:
 * - Practice → Challenge Bots
 * - Solo-Bots → Daily Challenge
 * - Daily → Multiplayer
 * - Multiplayer (bots) → Brain Training
 */
const NextStepPrompt: React.FC<NextStepPromptProps> = memo(({
  currentMode,
  onBackToLobby,
  onAction,
  variant = 'desktop',
  className,
  isCloseLoss: isCloseLossProp = false,
  scoreDifference,
  onRematch,
  hideBackButton = false,
}) => {
  const { t, language, dir } = useLanguage();
  const reducedMotion = useReducedMotion();
  const inf = reducedMotion ? 0 : Infinity;
  const isRTL = dir === 'rtl';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const router = useRouter();

  // Handle navigation with session cleanup OR direct action callback
  const handleNavigate = useCallback((href: string) => {
    // If onAction callback is provided, use it instead of navigation
    if (onAction) {
      onAction();
      return;
    }
    // Clear current session before navigating to prevent being stuck on results page
    clearSessionPreservingUsername();
    router.push(href);
  }, [router, onAction]);

  // Configure next step based on current mode
  const getNextStepConfig = (): ModeConfig => {
    switch (currentMode) {
      case 'practice':
        return {
          titleKey: 'nextStep.challengeBots',
          descKey: 'nextStep.challengeBotsDesc',
          href: `/${language}/singleplayer?preset=bots`,
          icon: <Bot className="w-6 h-6 sm:w-7 sm:h-7" />,
          gradient: 'from-neo-cyan to-neo-cyan-dark',
          iconBg: 'bg-neo-navy text-neo-cyan',
        };
      case 'solo-bots':
        return {
          titleKey: 'nextStep.tryDailyChallenge',
          descKey: 'nextStep.tryDailyChallengeDesc',
          href: `/${language}/daily`,
          icon: <Trophy className="w-6 h-6 sm:w-7 sm:h-7" />,
          gradient: 'from-amber-400 to-amber-600',
          iconBg: 'bg-neo-navy text-amber-400',
        };
      case 'daily':
        return {
          titleKey: 'nextStep.goMultiplayerFromDaily',
          descKey: 'nextStep.goMultiplayerFromDailyDesc',
          href: `/${language}/multiplayer`,
          icon: <InfinityIcon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />,
          gradient: 'from-neo-pink to-neo-pink-dark',
          iconBg: 'bg-neo-navy text-neo-pink',
        };
      case 'multiplayer-bots':
        // Brain training hidden — suggest daily challenge instead
        return {
          titleKey: 'nextStep.tryDailyChallenge',
          descKey: 'nextStep.tryDailyChallengeDesc',
          href: `/${language}/daily`,
          icon: <Trophy className="w-6 h-6 sm:w-7 sm:h-7" />,
          gradient: 'from-amber-400 to-amber-600',
          iconBg: 'bg-neo-navy text-amber-400',
        };
      case 'blast':
        return {
          titleKey: 'nextStep.tryDailyChallenge',
          descKey: 'nextStep.tryDailyChallengeDesc',
          href: `/${language}/daily`,
          icon: <Trophy className="w-6 h-6 sm:w-7 sm:h-7" />,
          gradient: 'from-amber-400 to-amber-600',
          iconBg: 'bg-neo-navy text-amber-400',
        };
      case 'word-hunt':
        return {
          titleKey: 'nextStep.goMultiplayerFromDaily',
          descKey: 'nextStep.goMultiplayerFromDailyDesc',
          href: `/${language}/multiplayer`,
          icon: <InfinityIcon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />,
          gradient: 'from-neo-pink to-neo-pink-dark',
          iconBg: 'bg-neo-navy text-neo-pink',
        };
    }
  };

  const config = getNextStepConfig();
  const title = t(config.titleKey) || config.titleKey;
  const description = t(config.descKey) || config.descKey;
  const backText = t('nextStep.backToLobby');

  // Close loss rematch prompt - overrides normal flow
  if (isCloseLossProp && scoreDifference != null) {
    const closeLossMsg = getCloseLossMessage(scoreDifference, t);
    const rematchText = t('closeLoss.rematch');

    return (
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 26 }}
        className={cn(
          'bg-linear-to-br from-neo-red to-neo-pink',
          'border-4 border-neo-black rounded-neo-lg shadow-hard-xl',
          'p-6 relative overflow-hidden',
          className
        )}
      >
        <div className="relative z-10 text-center space-y-4">
          <Swords className="w-10 h-10 text-neo-black mx-auto" />
          <div>
            <h3 className="text-xl sm:text-2xl font-black uppercase text-neo-black tracking-tight">
              {t('closeLoss.soClose')}
            </h3>
            <p className="text-neo-black/80 font-bold mt-1">
              {closeLossMsg}
            </p>
          </div>

          {onRematch && (
            <button
              onClick={onRematch}
              className={cn(
                'inline-flex items-center justify-center gap-2',
                'px-8 py-4',
                'bg-neo-black text-neo-white',
                'font-black text-lg uppercase',
                'border-4 border-neo-black rounded-neo',
                'shadow-hard-lg hover:shadow-hard-xl',
                'hover:-translate-x-1 hover:-translate-y-1',
                'active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed',
                'transition-all duration-150'
              )}
            >
              {rematchText}
            </button>
          )}

          <button
            onClick={onBackToLobby}
            className={cn(
              'inline-flex items-center justify-center gap-2',
              'px-6 py-2.5',
              'bg-neo-white/80 text-neo-black',
              'font-bold text-sm uppercase',
              'border-3 border-neo-black rounded-neo',
              'shadow-hard hover:shadow-hard-lg',
              'transition-all duration-150'
            )}
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {backText}
          </button>
        </div>
      </m.div>
    );
  }

  // Landscape variant - compact horizontal layout
  if (variant === 'landscape') {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <button
          onClick={() => handleNavigate(config.href)}
          className={cn(
            'relative flex items-center gap-3 p-3',
            'bg-linear-to-r', config.gradient,
            'border-3 border-neo-black rounded-neo shadow-hard',
            'hover:shadow-hard-lg hover:-translate-x-0.5 hover:-translate-y-0.5',
            'active:shadow-hard-pressed active:translate-x-0.5 active:translate-y-0.5',
            'transition-all duration-150'
          )}
        >
          <div className={cn('p-2 rounded-neo border-2 border-neo-black', config.iconBg)}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-black text-neo-black text-sm uppercase block truncate">
              {title}
            </span>
          </div>
          <ArrowIcon className="w-5 h-5 text-neo-black shrink-0" />
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full py-2 text-xs text-white hover:text-white border-2 border-white/30 hover:border-white/50 bg-white/10"
          onClick={onBackToLobby}
        >
          <ArrowLeft className="me-1 w-3.5 h-3.5 rtl:rotate-180" />
          {backText}
        </Button>
      </div>
    );
  }

  // Mobile variant - slightly more compact
  if (variant === 'mobile') {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <button
          onClick={() => handleNavigate(config.href)}
          className={cn(
            'relative block p-4',
            'bg-linear-to-br', config.gradient,
            'border-4 border-neo-black rounded-neo-lg shadow-hard-lg',
            'hover:shadow-hard-xl hover:-translate-x-1 hover:-translate-y-1',
            'active:shadow-hard-pressed active:translate-x-0.5 active:translate-y-0.5',
            'transition-all duration-150 overflow-hidden'
          )}
        >
          {/* Shine effect - pointer-events-none to allow button clicks */}
          <m.div
            className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -skew-x-12 pointer-events-none"
            animate={{ x: ['-200%', '200%'] }}
            transition={{ duration: 3, repeat: inf, ease: 'easeInOut', repeatDelay: 2 }}
          />

          <div className="relative z-10 flex items-center gap-4">
            <div className={cn(
              'p-3 rounded-neo border-3 border-neo-black shadow-hard',
              config.iconBg
            )}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-neo-black text-lg uppercase tracking-tight">
                {title}
              </h3>
              <p className="text-neo-black/80 text-sm font-bold mt-0.5">
                {description}
              </p>
            </div>
            <m.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: inf, ease: 'easeInOut' }}
            >
              <ArrowIcon className="w-6 h-6 text-neo-black" />
            </m.div>
          </div>
        </button>

        {!hideBackButton && (
          <button
            onClick={onBackToLobby}
            className="w-full py-3 text-sm font-bold uppercase text-neo-white bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2 hover:shadow-hard-lg active:shadow-hard-pressed active:translate-x-0.5 active:translate-y-0.5 transition-all duration-150"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {backText}
          </button>
        )}
      </div>
    );
  }

  // Desktop variant - full featured with animations
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 26 }}
      className={cn(
        'bg-linear-to-br', config.gradient,
        'border-4 border-neo-black rounded-neo-lg shadow-hard-xl',
        'p-6 sm:p-8 relative overflow-hidden',
        className
      )}
    >
      {/* Decorative pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgb(var(--neo-black)) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Sparkle decorations */}
      <m.div
        className="absolute top-4 right-4 text-neo-black/50"
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ type: 'tween', duration: 4, repeat: inf, ease: 'easeInOut' }}
      >
        <Sparkles className="w-6 h-6" />
      </m.div>

      <div className="relative z-10 text-center space-y-5">
        {/* Header with Icon */}
        <div className="flex flex-col items-center gap-4">
          <m.div
            className={cn(
              'p-4 rounded-neo-lg border-4 border-neo-black shadow-hard-lg',
              config.iconBg
            )}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: inf, ease: 'easeInOut' }}
          >
            {config.icon}
          </m.div>

          <div>
            <h3
              className="text-2xl sm:text-3xl font-black uppercase text-neo-black tracking-tight"
              style={{ textShadow: '2px 2px 0px rgba(255,255,255,0.3)' }}
            >
              {title}
            </h3>
            <p className="text-neo-black/80 text-base font-bold max-w-md mx-auto mt-2">
              {description}
            </p>
          </div>
        </div>

        {/* Primary CTA Button */}
        <button
          onClick={() => handleNavigate(config.href)}
          className={cn(
            'relative inline-flex items-center justify-center gap-3',
            'w-full sm:w-auto min-w-[200px]',
            'px-8 sm:px-12 py-4 sm:py-5',
            'bg-neo-black text-neo-white',
            'font-black text-lg sm:text-xl uppercase tracking-wide',
            'border-4 border-neo-black rounded-neo',
            'shadow-hard-lg hover:shadow-hard-xl',
            'hover:-translate-x-1 hover:-translate-y-1',
            'active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed',
            'transition-all duration-150',
            'group overflow-hidden'
          )}
        >
          {/* Button shine effect - pointer-events-none to allow button clicks */}
          <m.div
            className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -skew-x-12 pointer-events-none"
            animate={{ x: ['-200%', '200%'] }}
            transition={{ duration: 2, repeat: inf, ease: 'easeInOut', repeatDelay: 1 }}
          />
          <span className="relative z-10">{t('nextStep.letsGo')}</span>
          <m.span
            className="relative z-10"
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1, repeat: inf, ease: 'easeInOut' }}
          >
            <ArrowIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </m.span>
        </button>

        {/* Secondary Back Button */}
        <button
          onClick={onBackToLobby}
          className={cn(
            'inline-flex items-center justify-center gap-2',
            'px-6 py-2.5',
            'bg-neo-white/80 text-neo-black',
            'font-bold text-sm uppercase',
            'border-3 border-neo-black rounded-neo',
            'shadow-hard hover:shadow-hard-lg',
            'hover:-translate-x-0.5 hover:-translate-y-0.5',
            'active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed',
            'transition-all duration-150'
          )}
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {backText}
        </button>
      </div>
    </m.div>
  );
});

NextStepPrompt.displayName = 'NextStepPrompt';

export default NextStepPrompt;
