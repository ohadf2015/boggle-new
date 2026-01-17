'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Play, Crown, Bot, Book, Trophy, Target, Medal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { type PresetConfig, getDefaultPreset, getPresetById } from './presetConfig';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import LandscapeIndicator from '@/components/LandscapeIndicator';
import { LeaderboardModal } from './LeaderboardModal';
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

// Mode configuration for the mode selector - premium gradients and glow
const MODE_CONFIG: Record<Exclude<SinglePlayerMode, 'daily'>, {
  id: SinglePlayerMode;
  nameKey: string;
  descKey: string;
  Icon: any;
  color: string;
  glowColor: string;
}> = {
  'solo-bots': {
    id: 'solo-bots',
    nameKey: 'singlePlayer.mode.soloBots',
    descKey: 'singlePlayer.mode.soloBotsDesc',
    Icon: Bot,
    color: 'from-purple-400 via-purple-500 to-indigo-500',
    glowColor: 'rgba(139, 92, 246, 0.4)',
  },
  'practice': {
    id: 'practice',
    nameKey: 'singlePlayer.mode.practice',
    descKey: 'singlePlayer.mode.practiceDesc',
    Icon: Book,
    color: 'from-neo-lime via-lime-400 to-lime-500',
    glowColor: 'rgba(154, 255, 0, 0.4)',
  },
  'challenge': {
    id: 'challenge',
    nameKey: 'singlePlayer.mode.challenge',
    descKey: 'singlePlayer.mode.challengeDesc',
    Icon: Trophy,
    color: 'from-neo-lime via-lime-300 to-yellow-400',
    glowColor: 'rgba(255, 225, 53, 0.5)',
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
  const [showLeaderboard, setShowLeaderboard] = useState(false);

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
        whileHover={{
          scale: 1.05,
          boxShadow: `0 0 25px ${config.glowColor}, 0 0 50px ${config.glowColor}, 6px 6px 0px rgb(var(--neo-black))`,
        }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleModeSelect(mode)}
        className={cn(
          'group relative p-3 sm:p-4 rounded-neo-lg border-4 transition-colors',
          'flex flex-col items-center text-center overflow-hidden',
          'shadow-hard',
          'border-neo-black',
          `bg-gradient-to-br ${config.color}`
        )}
        aria-label={t(config.nameKey) || mode}
      >
        {/* Shine effect overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
          initial={{ x: '-100%' }}
          whileHover={{ x: '200%' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        {/* Icon with bounce on hover */}
        <motion.div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1 text-neo-black bg-white/20 border-2 border-neo-black/20"
          whileHover={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.4 }}
        >
          <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
        </motion.div>

        {/* Name */}
        <h3 className="text-xs sm:text-sm font-black uppercase leading-tight text-neo-black relative z-10">
          {t(config.nameKey) || mode}
        </h3>

        {/* Description */}
        <p className="text-[9px] sm:text-[10px] font-bold mt-0.5 line-clamp-2 text-neo-black/80 relative z-10">
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
              {/* Leaderboard button */}
              <button
                onClick={() => setShowLeaderboard(true)}
                className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-neo border-3 border-neo-lime bg-neo-lime/20 shadow-hard hover:shadow-hard-lg hover:bg-neo-lime/30 transition-all"
                aria-label={t('leaderboard.title') || 'Global Leaderboard'}
              >
                <Medal className="w-5 h-5 text-neo-lime" />
              </button>
            </div>

            {/* Quick Play Button - Primary CTA */}
            <motion.button
              onClick={() => {
                const quickPreset = getPresetById('quick');
                if (quickPreset) onSelectPreset(quickPreset);
              }}
              className={cn(
                'p-3 rounded-neo border-4 border-neo-black transition-all relative overflow-hidden',
                'flex items-center gap-3',
                'shadow-hard-lg',
                'bg-gradient-to-r from-neo-lime via-neo-cyan to-neo-lime'
              )}
              whileHover={{
                scale: 1.02,
                boxShadow: '0 0 25px rgba(154, 255, 0, 0.5), 0 0 50px rgba(154, 255, 0, 0.3), 6px 6px 0px black'
              }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Animated shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
              />
              <Play className="w-6 h-6 text-neo-black relative z-10" fill="currentColor" />
              <div className="flex-1 text-left relative z-10">
                <h4 className="text-sm font-black uppercase text-neo-black">
                  {t('singlePlayer.quickPlay') || 'Quick Play'}
                </h4>
                <p className="text-[10px] font-bold text-neo-black/70">
                  {t('singlePlayer.quickPlayDesc') || '7×7 • 2 min • vs Bot'}
                </p>
              </div>
            </motion.button>

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
              <Card className="border-3 border-neo-lime shadow-hard bg-gradient-to-br from-neo-lime/20 to-neo-red/10">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Crown className="text-neo-lime text-xl" />
                    <span className="font-black text-neo-white text-sm uppercase">
                      {t('challenge.yourRecord') || 'Your Record'}
                    </span>
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-2xl font-black text-neo-lime">{challengeInfo.highScore}</span>
                    <span className="text-sm text-neo-white/70 ml-2">{t('common.points') || 'pts'}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Or divider + Advanced Settings button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              {/* Or divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-600" />
                <span className="text-xs font-bold uppercase text-slate-500">
                  {t('common.or') || 'or'}
                </span>
                <div className="flex-1 h-px bg-slate-600" />
              </div>

              {/* Advanced Settings button */}
              <button
                onClick={onCustomGame}
                className={cn(
                  'w-full py-3 px-4 rounded-neo border-3 border-slate-600',
                  'bg-slate-700/50',
                  'shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px]',
                  'active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed',
                  'transition-all flex items-center justify-center gap-2',
                  'text-sm font-bold text-slate-300 hover:text-neo-white'
                )}
              >
                <Settings className="w-4 h-4" />
                {t('singlePlayer.preset.customGame') || 'Custom Game Setup'}
              </button>
            </motion.div>
          </div>
        </div>

        {/* Global Leaderboard Modal */}
        <LeaderboardModal
          open={showLeaderboard}
          onOpenChange={setShowLeaderboard}
        />
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
        className="max-w-xl mx-auto space-y-4 px-2 xs:px-4 min-h-[calc(100vh-12rem)] flex flex-col justify-center"
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
          {/* Leaderboard button */}
          <button
            onClick={() => setShowLeaderboard(true)}
            className="absolute end-0 flex items-center gap-2 px-3 py-2 rounded-neo border-3 border-neo-lime dark:border-neo-lime/60 bg-neo-lime/20 dark:bg-neo-lime/10 shadow-hard hover:shadow-hard-lg hover:bg-neo-lime/30 transition-all min-h-[44px] min-w-[44px]"
            aria-label={t('leaderboard.title') || 'Global Leaderboard'}
          >
            <Medal className="w-5 h-5 text-neo-lime" />
          </button>
        </div>

        {/* QUICK PLAY - Primary CTA for new players */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          whileHover={{
            scale: 1.03,
            boxShadow: '0 0 30px rgba(154, 255, 0, 0.5), 0 0 60px rgba(154, 255, 0, 0.3), 8px 8px 0px black'
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            const quickPreset = getPresetById('quick');
            if (quickPreset) onSelectPreset(quickPreset);
          }}
          className={cn(
            'group relative p-4 sm:p-5 rounded-neo-lg border-4 border-neo-black transition-all w-full overflow-hidden',
            'flex items-center justify-center gap-3',
            'shadow-hard-lg',
            'bg-gradient-to-r from-neo-lime via-neo-cyan to-neo-lime'
          )}
          aria-label={t('singlePlayer.quickPlay') || 'Quick Play'}
        >
          {/* Animated shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
          />
          <Play className="w-8 h-8 sm:w-10 sm:h-10 text-neo-black relative z-10" fill="currentColor" />
          <div className="text-left relative z-10">
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
            <Card className="border-3 border-neo-lime dark:border-neo-lime/60 shadow-hard bg-gradient-to-r from-neo-lime/10 to-neo-red/10">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="text-neo-lime text-lg" />
                  <span className="font-bold text-sm text-neo-black dark:text-neo-white">
                    {t('challenge.yourRecord') || 'Your Record'}
                  </span>
                </div>
                <Badge className="bg-neo-lime text-neo-black font-black border-0">
                  {challengeInfo.highScore} {t('common.points') || 'pts'}
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Or divider + Advanced Settings button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-4 space-y-3"
        >
          {/* Or divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-neo-black/20 dark:bg-slate-600" />
            <span className="text-xs font-bold uppercase text-neo-black/50 dark:text-slate-500">
              {t('common.or') || 'or'}
            </span>
            <div className="flex-1 h-px bg-neo-black/20 dark:bg-slate-600" />
          </div>

          {/* Advanced Settings button */}
          <button
            onClick={onCustomGame}
            className={cn(
              'w-full py-3 px-4 rounded-neo border-3 border-neo-black/30 dark:border-slate-600',
              'bg-neo-cream/50 dark:bg-slate-700/50',
              'shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px]',
              'active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed',
              'transition-all flex items-center justify-center gap-2',
              'text-sm font-bold text-neo-black/70 dark:text-slate-300 hover:text-neo-black dark:hover:text-neo-white'
            )}
          >
            <Settings className="w-4 h-4" />
            {t('singlePlayer.preset.customGame') || 'Custom Game Setup'}
          </button>
        </motion.div>
      </motion.div>

      {/* Global Leaderboard Modal */}
      <LeaderboardModal
        open={showLeaderboard}
        onOpenChange={setShowLeaderboard}
      />
    </>
  );
};

export default PresetSelector;
