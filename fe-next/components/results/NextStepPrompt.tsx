'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bot, Calendar, Users, Brain, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export type NextStepMode = 'practice' | 'solo-bots' | 'daily' | 'multiplayer-bots';

interface NextStepPromptProps {
  /** Current game mode to determine next suggestion */
  currentMode: NextStepMode;
  /** Callback when user wants to return to lobby */
  onBackToLobby: () => void;
  /** Display variant */
  variant?: 'desktop' | 'mobile' | 'landscape';
  /** Additional CSS classes */
  className?: string;
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
  variant = 'desktop',
  className,
}) => {
  const { t, language, dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

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
          titleKey: 'nextStep.dailyChallenge',
          descKey: 'nextStep.dailyChallengeDesc',
          href: `/${language}/daily`,
          icon: <Calendar className="w-6 h-6 sm:w-7 sm:h-7" />,
          gradient: 'from-neo-lime to-neo-lime-dark',
          iconBg: 'bg-neo-navy text-neo-lime',
        };
      case 'daily':
        return {
          titleKey: 'nextStep.goMultiplayer',
          descKey: 'nextStep.goMultiplayerDesc',
          href: `/${language}/multiplayer`,
          icon: <Users className="w-6 h-6 sm:w-7 sm:h-7" />,
          gradient: 'from-neo-pink to-neo-pink-dark',
          iconBg: 'bg-neo-navy text-neo-pink',
        };
      case 'multiplayer-bots':
        return {
          titleKey: 'nextStep.brainTraining',
          descKey: 'nextStep.brainTrainingDesc',
          href: `/${language}/brain`,
          icon: <Brain className="w-6 h-6 sm:w-7 sm:h-7" />,
          gradient: 'from-neo-purple to-neo-purple-dark',
          iconBg: 'bg-neo-navy text-neo-purple',
        };
    }
  };

  const config = getNextStepConfig();
  const title = t(config.titleKey) || config.titleKey;
  const description = t(config.descKey) || config.descKey;
  const backText = t('nextStep.backToLobby') || 'Back to Lobby';

  // Landscape variant - compact horizontal layout
  if (variant === 'landscape') {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <Link
          href={config.href}
          className={cn(
            'relative flex items-center gap-3 p-3',
            'bg-gradient-to-r', config.gradient,
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
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="w-full py-2 text-xs text-neo-black/70 dark:text-white/70 hover:text-neo-black dark:hover:text-white border border-neo-black/20"
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
        <Link
          href={config.href}
          className={cn(
            'relative block p-4',
            'bg-gradient-to-br', config.gradient,
            'border-4 border-neo-black rounded-neo-lg shadow-hard-lg',
            'hover:shadow-hard-xl hover:-translate-x-1 hover:-translate-y-1',
            'active:shadow-hard-pressed active:translate-x-0.5 active:translate-y-0.5',
            'transition-all duration-150 overflow-hidden'
          )}
        >
          {/* Shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
            animate={{ x: ['-200%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
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
              <p className="text-neo-black/80 text-sm font-medium mt-0.5">
                {description}
              </p>
            </div>
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowIcon className="w-6 h-6 text-neo-black" />
            </motion.div>
          </div>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          className="w-full py-2 text-xs text-neo-black/70 dark:text-white/70 hover:text-neo-black dark:hover:text-white border border-neo-black/20 dark:border-white/20"
          onClick={onBackToLobby}
        >
          <ArrowLeft className="me-1 w-3.5 h-3.5 rtl:rotate-180" />
          {backText}
        </Button>
      </div>
    );
  }

  // Desktop variant - full featured with animations
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.4, type: 'spring' }}
      className={cn(
        'bg-gradient-to-br', config.gradient,
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
      <motion.div
        className="absolute top-4 right-4 text-neo-black/30"
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Sparkles className="w-6 h-6" />
      </motion.div>

      <div className="relative z-10 text-center space-y-5">
        {/* Header with Icon */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className={cn(
              'p-4 rounded-neo-lg border-4 border-neo-black shadow-hard-lg',
              config.iconBg
            )}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {config.icon}
          </motion.div>

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
        <Link
          href={config.href}
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
          {/* Button shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
            animate={{ x: ['-200%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
          />
          <span className="relative z-10">{t('nextStep.letsGo') || "Let's Go!"}</span>
          <motion.span
            className="relative z-10"
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ArrowIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </motion.span>
        </Link>

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
    </motion.div>
  );
});

NextStepPrompt.displayName = 'NextStepPrompt';

export default NextStepPrompt;
