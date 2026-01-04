'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Play, Crown, Bot, Book, Trophy, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { type PresetConfig, getDefaultPreset, getPresetById } from './presetConfig';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import LandscapeIndicator from '@/components/LandscapeIndicator';
import type { SinglePlayerMode } from './SinglePlayerView';

interface ChallengeInfo {
  highScore: number | null;
  wordCount?: number;
  longestWord?: string;
}

interface PresetSelectorProps {
  onSelectPreset: (preset: PresetConfig) => void;
  onCustomGame: () => void;
  challengeInfo: ChallengeInfo;
}

// Mode configuration for the mode selector
const MODE_CONFIG: Record<Exclude<SinglePlayerMode, 'daily'>, {
  id: SinglePlayerMode;
  nameKey: string;
  descKey: string;
  Icon: any;
  color: string;
}> = {
  'solo-bots': {
    id: 'solo-bots',
    nameKey: 'singlePlayer.mode.soloBots',
    descKey: 'singlePlayer.mode.soloBotsDesc',
    Icon: Bot,
    color: 'from-purple-400 to-indigo-500',
  },
  'practice': {
    id: 'practice',
    nameKey: 'singlePlayer.mode.practice',
    descKey: 'singlePlayer.mode.practiceDesc',
    Icon: Book,
    color: 'from-neo-lime to-lime-400',
  },
  'challenge': {
    id: 'challenge',
    nameKey: 'singlePlayer.mode.challenge',
    descKey: 'singlePlayer.mode.challengeDesc',
    Icon: Trophy,
    color: 'from-neo-yellow to-yellow-400',
  },
};

/**
 * PresetSelector - Quick start screen with preset cards
 * Primary screen for single player - allows 1-tap game start
 */
const PresetSelector: React.FC<PresetSelectorProps> = ({
  onSelectPreset,
  onCustomGame,
  challengeInfo,
}) => {
  const { t, dir } = useLanguage();
  const isLandscape = useMobileLandscape();

  // Get the default (middle) preset for a mode and start game directly
  const handleModeSelect = (mode: Exclude<SinglePlayerMode, 'daily'>) => {
    const defaultPreset = getDefaultPreset(mode);
    if (defaultPreset) {
      onSelectPreset(defaultPreset);
    }
  };

  const renderModeCard = (mode: Exclude<SinglePlayerMode, 'daily'>, index: number) => {
    const config = MODE_CONFIG[mode];
    const IconComponent = config.Icon;

    return (
      <motion.button
        key={mode}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => handleModeSelect(mode)}
        className={cn(
          'group relative p-3 sm:p-4 rounded-neo border-4 transition-all',
          'flex flex-col items-center text-center',
          'shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px]',
          'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
          'border-neo-black',
          `bg-gradient-to-br ${config.color}`
        )}
        aria-label={t(config.nameKey) || mode}
      >
        {/* Icon */}
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1 text-neo-black">
          <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        {/* Name */}
        <h3 className="text-xs sm:text-sm font-black uppercase leading-tight text-neo-black">
          {t(config.nameKey) || mode}
        </h3>

        {/* Description */}
        <p className="text-[9px] sm:text-[10px] font-bold mt-0.5 line-clamp-2 text-neo-black/80">
          {t(config.descKey) || ''}
        </p>
      </motion.button>
    );
  };

  // Landscape layout
  if (isLandscape) {
    return (
      <>
        <LandscapeIndicator />
        <div dir={dir} className="flex h-screen w-full overflow-hidden bg-slate-900 text-white p-3 gap-4 landscape-full-height">
          {/* Left column: Header + Modes */}
          <div className="w-[30%] flex flex-col gap-3 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-neo border-3 border-neo-black bg-neo-cream shadow-hard hover:shadow-hard-lg transition-all"
              >
                <ArrowLeft className="text-sm text-neo-black rtl:rotate-180" />
              </Link>
              <h1 className="text-xl font-black uppercase text-neo-white flex-1">
                {t('landing.singlePlayer') || 'Single Player'}
              </h1>
            </div>

            {/* Quick Play Button - Primary CTA */}
            <button
              onClick={() => {
                const quickPreset = getPresetById('quick');
                if (quickPreset) onSelectPreset(quickPreset);
              }}
              className={cn(
                'p-3 rounded-neo border-4 border-neo-black transition-all',
                'flex items-center gap-3',
                'shadow-hard-lg hover:shadow-hard-xl hover:translate-x-[-2px] hover:translate-y-[-2px]',
                'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
                'bg-gradient-to-r from-neo-lime via-neo-cyan to-neo-lime'
              )}
            >
              <Play className="w-6 h-6 text-neo-black" fill="currentColor" />
              <div className="flex-1 text-left">
                <h4 className="text-sm font-black uppercase text-neo-black">
                  {t('singlePlayer.quickPlay') || 'Quick Play'}
                </h4>
                <p className="text-[10px] font-bold text-neo-black/70">
                  {t('singlePlayer.quickPlayDesc') || '7×7 • 2 min • vs Bot'}
                </p>
              </div>
            </button>

            {/* Mode Selector */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-neo-white/70">
                {t('singlePlayer.chooseMode') || 'Choose Mode'}
              </h3>
              <div className="space-y-2">
                {(['solo-bots', 'practice', 'challenge'] as const).map((mode, index) => (
                  renderModeCard(mode, index)
                ))}
              </div>
            </div>

          </div>

          {/* Right column: Challenge high score + Custom game */}
          <div className="w-[70%] flex flex-col gap-3 justify-center">
            {/* Challenge high score preview */}
            {challengeInfo.highScore !== null && (
              <Card className="border-3 border-neo-yellow shadow-hard bg-gradient-to-br from-neo-yellow/20 to-neo-red/10">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Crown className="text-neo-yellow text-xl" />
                    <span className="font-black text-neo-white text-sm uppercase">
                      {t('challenge.yourRecord') || 'Your Record'}
                    </span>
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-2xl font-black text-neo-yellow">{challengeInfo.highScore}</span>
                    <span className="text-sm text-neo-white/70 ml-2">{t('common.points') || 'pts'}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom game button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                variant="outline"
                size="lg"
                onClick={onCustomGame}
                className="w-full h-14 border-3 border-slate-600 bg-slate-800 hover:bg-slate-700 text-neo-white font-bold uppercase gap-2"
              >
                <Settings className="w-4 h-4" />
                {t('singlePlayer.preset.customGame') || 'Custom Game Setup'}
              </Button>
            </motion.div>
          </div>
        </div>
      </>
    );
  }

  // Portrait layout
  return (
    <>
      <LandscapeIndicator />
      <motion.div
        dir={dir}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-xl mx-auto space-y-4 px-2 xs:px-4"
      >
        {/* Header */}
        <div className="relative flex items-center justify-center mb-2">
          <Link
            href="/"
            className="absolute start-0 flex items-center gap-2 px-3 py-2 rounded-neo border-3 border-neo-black dark:border-slate-600 bg-neo-cream dark:bg-slate-700 shadow-hard hover:shadow-hard-lg transition-all text-neo-black dark:text-neo-white text-sm font-bold min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-center text-neo-black dark:text-neo-white">
            {t('landing.singlePlayer') || 'Single Player'}
          </h1>
        </div>

        {/* QUICK PLAY - Primary CTA for new players */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          onClick={() => {
            const quickPreset = getPresetById('quick');
            if (quickPreset) onSelectPreset(quickPreset);
          }}
          className={cn(
            'group relative p-4 sm:p-5 rounded-neo-lg border-4 border-neo-black transition-all w-full',
            'flex items-center justify-center gap-3',
            'shadow-hard-lg hover:shadow-hard-xl hover:translate-x-[-4px] hover:translate-y-[-4px]',
            'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
            'bg-gradient-to-r from-neo-lime via-neo-cyan to-neo-lime'
          )}
          aria-label={t('singlePlayer.quickPlay') || 'Quick Play'}
        >
          <Play className="w-8 h-8 sm:w-10 sm:h-10 text-neo-black" fill="currentColor" />
          <div className="text-left">
            <h2 className="text-xl sm:text-2xl font-black uppercase text-neo-black">
              {t('singlePlayer.quickPlay') || 'Quick Play'}
            </h2>
            <p className="text-xs sm:text-sm font-bold text-neo-black/70">
              {t('singlePlayer.quickPlayDesc') || '7×7 board • 2 min • vs Bot'}
            </p>
          </div>
        </motion.button>

        {/* Mode Selector Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold uppercase text-neo-black/70 dark:text-neo-white/70">
            <Target className="w-3 h-3" />
            <span>{t('singlePlayer.chooseMode') || 'Choose Your Mode'}</span>
          </div>

          {/* Mode Cards - 3 modes */}
          <div className="grid grid-cols-3 gap-2">
            {(['solo-bots', 'practice', 'challenge'] as const).map((mode, index) =>
              renderModeCard(mode, index)
            )}
          </div>
        </div>

        {/* Challenge high score teaser */}
        {challengeInfo.highScore !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-3 border-neo-yellow dark:border-neo-yellow/60 shadow-hard bg-gradient-to-r from-neo-yellow/10 to-neo-red/10">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="text-neo-yellow text-lg" />
                  <span className="font-bold text-sm text-neo-black dark:text-neo-white">
                    {t('challenge.yourRecord') || 'Your Record'}
                  </span>
                </div>
                <Badge className="bg-neo-yellow text-neo-black font-black border-0">
                  {challengeInfo.highScore} {t('common.points') || 'pts'}
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-[2px] bg-neo-black/10 dark:bg-neo-white/10 rounded" />
          <span className="text-xs font-bold uppercase text-neo-black/50 dark:text-slate-400">
            {t('common.or') || 'or'}
          </span>
          <div className="flex-1 h-[2px] bg-neo-black/10 dark:bg-neo-white/10 rounded" />
        </div>

        {/* Custom game button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Button
            variant="outline"
            size="lg"
            onClick={onCustomGame}
            className="w-full h-12 border-3 border-neo-black/30 dark:border-slate-600 bg-neo-cream dark:bg-slate-700 hover:bg-neo-cream/80 dark:hover:bg-slate-600 text-neo-black dark:text-neo-white font-bold uppercase gap-2"
          >
            <Settings className="w-4 h-4" />
            {t('singlePlayer.preset.customGame') || 'Custom Game Setup'}
          </Button>
        </motion.div>

        {/* Hint text */}
        <p className="text-center text-xs text-neo-black/50 dark:text-slate-400 pb-4">
          {t('singlePlayer.preset.hint') || 'Tap any preset for instant play, or customize your game'}
        </p>
      </motion.div>
    </>
  );
};

export default PresetSelector;
