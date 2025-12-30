'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Settings, Play, Crown, Flame, Bot, Book, Trophy, Calendar, Target, Check, Sparkles, Zap, Skull } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { DIFFICULTIES } from '@/utils/consts';
import { PRESETS, type PresetConfig, getPresetsForMode, getMinWordLength, getDefaultPreset } from './presetConfig';
import { getHighScoreForPreset } from './highScoreManager';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import LandscapeIndicator from '@/components/LandscapeIndicator';
import type { Language, DifficultyLevel } from '@/shared/types/game';
import type { SinglePlayerMode } from './SinglePlayerView';

// Difficulty icon configuration for compact visual representation
const DIFFICULTY_ICON_CONFIG: Record<DifficultyLevel, {
  Icon: typeof Sparkles;
  bgColor: string;
}> = {
  EASY: { Icon: Sparkles, bgColor: 'bg-neo-lime' },
  MEDIUM: { Icon: Zap, bgColor: 'bg-neo-yellow' },
  HARD: { Icon: Skull, bgColor: 'bg-neo-red' },
};

interface DailyInfo {
  puzzleNumber: number;
  hasPlayedToday: boolean;
  streak: number;
  countdown: string;
}

interface ChallengeInfo {
  highScore: number | null;
  wordCount?: number;
  longestWord?: string;
}

interface PresetSelectorProps {
  onSelectPreset: (preset: PresetConfig) => void;
  onCustomGame: () => void;
  dailyInfo: DailyInfo;
  challengeInfo: ChallengeInfo;
  currentLanguage: Language;
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
  dailyInfo,
  challengeInfo,
  currentLanguage,
}) => {
  const { t, dir } = useLanguage();
  const isLandscape = useMobileLandscape();

  // State for selected mode
  const [selectedMode, setSelectedMode] = useState<Exclude<SinglePlayerMode, 'daily'>>('solo-bots');

  // Get presets for the selected mode
  const modePresets = useMemo(() =>
    getPresetsForMode(selectedMode),
    [selectedMode]
  );

  const dailyPreset = useMemo(() =>
    PRESETS.find(p => p.modes.includes('daily')),
    []
  );

  const renderModeCard = (mode: Exclude<SinglePlayerMode, 'daily'>, index: number) => {
    const config = MODE_CONFIG[mode];
    const IconComponent = config.Icon;
    const isSelected = selectedMode === mode;

    return (
      <motion.button
        key={mode}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => setSelectedMode(mode)}
        className={cn(
          'group relative p-3 sm:p-4 rounded-neo border-4 transition-all',
          'flex flex-col items-center text-center',
          isSelected
            ? 'shadow-hard-pressed translate-x-[2px] translate-y-[2px] border-neo-black'
            : 'shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] border-neo-black/50',
          isSelected
            ? `bg-gradient-to-br ${config.color}`
            : 'bg-neo-cream dark:bg-slate-800'
        )}
        aria-label={t(config.nameKey) || mode}
        aria-pressed={isSelected}
      >
        {/* Icon */}
        <div className={cn(
          'w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1',
          'transition-all',
          isSelected ? 'text-neo-black' : 'text-neo-black dark:text-neo-white'
        )}>
          <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        {/* Name */}
        <h3 className={cn(
          'text-xs sm:text-sm font-black uppercase leading-tight',
          isSelected ? 'text-neo-black' : 'text-neo-black dark:text-neo-white'
        )}>
          {t(config.nameKey) || mode}
        </h3>

        {/* Description */}
        <p className={cn(
          'text-[9px] sm:text-[10px] font-bold mt-0.5 line-clamp-2',
          isSelected ? 'text-neo-black/80' : 'text-neo-black/60 dark:text-neo-white/60'
        )}>
          {t(config.descKey) || ''}
        </p>
      </motion.button>
    );
  };

  const renderPresetCard = (preset: PresetConfig, index: number) => {
    const IconComponent = preset.Icon;
    const difficultyConfig = DIFFICULTIES[preset.settings.difficulty];
    const isDaily = preset.id === 'daily';

    // Get high score specific to this preset (for challenge mode)
    const presetHighScore = selectedMode === 'challenge'
      ? getHighScoreForPreset(preset.id, preset.settings.difficulty, preset.settings.timerSeconds)
      : null;

    // Difficulty-based colors for borders
    const difficultyColor = preset.settings.difficulty === 'EASY' ? 'border-neo-lime'
      : preset.settings.difficulty === 'MEDIUM' ? 'border-neo-yellow'
      : 'border-neo-red';

    return (
      <motion.button
        key={preset.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 + 0.1 }}
        onClick={() => onSelectPreset(preset)}
        className={cn(
          'group relative p-2 sm:p-3 rounded-neo-lg border-3 sm:border-4 transition-all',
          'flex flex-col items-center text-center flex-shrink-0',
          'w-[100px] min-w-[100px] sm:w-[120px] sm:min-w-[120px]',
          'shadow-hard hover:shadow-hard-lg hover:translate-x-[-3px] hover:translate-y-[-3px]',
          'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
          isDaily
            ? 'bg-gradient-to-br from-neo-orange via-neo-yellow to-neo-pink border-neo-black'
            : `bg-neo-cream dark:bg-slate-800 ${difficultyColor}`
        )}
        aria-label={`${t(preset.nameKey) || preset.id}: ${t(preset.descKey) || ''}`}
      >
        {/* Badge for recommended */}
        {preset.badge === 'recommended' && (
          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black uppercase bg-neo-black text-neo-yellow rounded-full border-2 border-neo-yellow">
            {t('singlePlayer.preset.recommended') || 'Best'}
          </span>
        )}

        {/* Daily specific badges */}
        {isDaily && (
          <div className="absolute top-1 right-1 flex items-center gap-1">
            {dailyInfo.streak > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold bg-neo-black/20 px-1.5 py-0.5 rounded-full text-neo-black">
                <Flame className="w-3 h-3 text-neo-orange" />
                {dailyInfo.streak}
              </span>
            )}
            {dailyInfo.hasPlayedToday && (
              <span className="flex items-center justify-center w-5 h-5 bg-neo-lime text-neo-black rounded-full border-2 border-neo-black">
                <Check className="w-3 h-3 text-neo-black" />
              </span>
            )}
          </div>
        )}

        {/* Grid Size with Difficulty Icon (PROMINENT) */}
        {!isDaily && (
          <div className="flex flex-col items-center gap-0.5 mb-0.5">
            {React.createElement(DIFFICULTY_ICON_CONFIG[preset.settings.difficulty].Icon, {
              className: 'w-5 h-5 sm:w-6 sm:h-6 text-neo-black dark:text-neo-white'
            })}
            <div className="text-lg sm:text-xl font-black text-neo-black dark:text-neo-white">
              {difficultyConfig.rows}×{difficultyConfig.cols}
            </div>
          </div>
        )}

        {/* Daily Icon */}
        {isDaily && (
          <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center mb-0.5">
            <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
          </div>
        )}

        {/* Daily Name */}
        {isDaily && (
          <h3 className="text-[10px] sm:text-xs font-black uppercase text-neo-black leading-tight">
            {t('daily.badge') || 'Daily'}
            <span className="block text-[8px] sm:text-[9px] font-bold opacity-80">#{dailyInfo.puzzleNumber}</span>
          </h3>
        )}

        {/* Mode-specific details */}
        {!isDaily && (
          <div className="text-[9px] sm:text-[10px] font-bold text-neo-black/70 dark:text-neo-white/70 mt-0.5 space-y-0">
            {/* Minimum word length - prominent indicator */}
            {(() => {
              // Calculate actual minWordLength based on language and difficulty
              // Japanese: always 2+, Other languages: Hard = 3+, Easy/Medium = 2+
              const actualMinWordLength = getMinWordLength(currentLanguage, preset.settings.difficulty);
              return (
                <div className={cn(
                  'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black',
                  actualMinWordLength === 2
                    ? 'bg-neo-lime/30 text-neo-black dark:text-neo-lime'
                    : 'bg-neo-cyan/30 text-neo-black dark:text-neo-cyan'
                )}>
                  <span>{actualMinWordLength}+</span>
                  <span>{t('singlePlayer.preset.letters') || 'letters'}</span>
                </div>
              );
            })()}
            {preset.settings.timerSeconds > 0 && (
              <div>{preset.settings.timerSeconds / 60}m</div>
            )}
            {preset.settings.timerSeconds === 0 && (
              <div>{t('singlePlayer.mode.noTimer') || 'No timer'}</div>
            )}
            {preset.settings.bots > 0 && (
              <div>{preset.settings.bots} {t('bots.title') || 'bots'}</div>
            )}
            {selectedMode === 'challenge' && presetHighScore !== null && (
              <div className="text-neo-yellow dark:text-neo-yellow font-black">
                {t('challenge.record') || 'Record'}: {presetHighScore.score}
              </div>
            )}
          </div>
        )}

        {/* Daily countdown */}
        {isDaily && dailyInfo.hasPlayedToday && (
          <p className="text-[8px] sm:text-[9px] font-bold text-neo-black/70 mt-0.5">
            {t('daily.nextPuzzleIn') || 'Next'}: {dailyInfo.countdown}
          </p>
        )}

        {/* Play indicator */}
        <div className="mt-1 flex items-center gap-0.5 text-[8px] sm:text-[9px] font-bold text-neo-black/60 dark:text-neo-white/60 group-hover:text-neo-black dark:group-hover:text-neo-white transition-colors">
          <Play className="w-2 h-2" />
          <span>{t('singlePlayer.preset.tapToPlay') || 'Play'}</span>
        </div>
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
                const quickPreset = getDefaultPreset('solo-bots');
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

            {/* Daily Challenge */}
            {dailyPreset && (
              <button
                onClick={() => onSelectPreset(dailyPreset)}
                className={cn(
                  'p-3 rounded-neo border-4 transition-all',
                  'flex items-center gap-3',
                  'shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px]',
                  'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
                  'bg-gradient-to-r from-neo-orange via-neo-yellow to-neo-pink border-neo-black'
                )}
              >
                <Calendar className="w-6 h-6 text-neo-black" />
                <div className="flex-1 text-left">
                  <h4 className="text-sm font-black uppercase text-neo-black">
                    {t('daily.badge') || 'Daily'}
                  </h4>
                  <p className="text-xs font-bold text-neo-black/80">
                    #{dailyInfo.puzzleNumber}
                  </p>
                </div>
                {dailyInfo.hasPlayedToday && (
                  <Check className="w-5 h-5 text-neo-black" />
                )}
              </button>
            )}
          </div>

          {/* Right column: Quick Start Presets */}
          <div className="w-[70%] flex flex-col gap-3 overflow-y-auto">
            {/* Section Header */}
            <h3 className="text-sm font-bold uppercase text-neo-white/70">
              {t('singlePlayer.preset.quickStart') || 'Quick Start'} - {t(MODE_CONFIG[selectedMode].nameKey)}
            </h3>

            {/* Presets horizontal scroll */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedMode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex gap-2 overflow-x-auto scrollable-area snap-x snap-mandatory pb-2"
                style={{ scrollbarWidth: 'thin' }}
              >
                {modePresets.map((preset, index) => (
                  <div key={preset.id} className="snap-start">
                    {renderPresetCard(preset, index)}
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Challenge high score preview */}
            {selectedMode === 'challenge' && challengeInfo.highScore !== null && (
              <Card className="border-3 border-neo-yellow shadow-hard bg-gradient-to-br from-neo-yellow/20 to-neo-orange/10">
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
            const quickPreset = getDefaultPreset('solo-bots');
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

        {/* Daily Challenge Card - FEATURED at TOP */}
        {dailyPreset && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => onSelectPreset(dailyPreset)}
            className={cn(
              'group relative p-4 rounded-neo-lg border-4 transition-all w-full',
              'flex items-center gap-4',
              'shadow-hard hover:shadow-hard-lg hover:translate-x-[-3px] hover:translate-y-[-3px]',
              'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
              'bg-gradient-to-r from-neo-orange via-neo-yellow to-neo-pink border-neo-black',
              // Animated border glow when not played
              !dailyInfo.hasPlayedToday && 'ring-2 ring-neo-orange/50 ring-offset-2 ring-offset-slate-50 dark:ring-offset-neo-navy'
            )}
            aria-label={`${t('daily.badge') || 'Daily'}: #${dailyInfo.puzzleNumber}`}
          >
            {/* Daily Icon */}
            <div className="flex items-center justify-center">
              <motion.div
                animate={!dailyInfo.hasPlayedToday ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-neo-black" />
              </motion.div>
            </div>

            {/* Daily Info */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black uppercase text-neo-black leading-tight">
                  {t('daily.badge') || 'Daily Challenge'}
                </h3>
                {!dailyInfo.hasPlayedToday && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-neo-black/20 rounded-full text-neo-black">
                    {t('daily.playNow') || 'Play Now'}
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base font-bold text-neo-black/80 mt-0.5">
                #{dailyInfo.puzzleNumber}
                {dailyInfo.streak > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-neo-black/15 rounded-full">
                    <Flame className="w-3 h-3 text-neo-orange" />
                    {dailyInfo.streak} {t('daily.streak') || 'streak'}
                  </span>
                )}
                {dailyInfo.hasPlayedToday && !dailyInfo.countdown && (
                  <span className="ml-2 text-xs">
                    {t('daily.nextPuzzleIn') || 'Next'}: {dailyInfo.countdown}
                  </span>
                )}
              </p>
            </div>

            {/* Status Badge */}
            <div>
              {dailyInfo.hasPlayedToday ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center justify-center w-12 h-12 bg-neo-lime text-neo-black rounded-full border-3 border-neo-black"
                >
                  <Check className="w-6 h-6" strokeWidth={3} />
                </motion.span>
              ) : (
                <motion.span
                  className="flex items-center justify-center w-12 h-12 bg-neo-black rounded-full"
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                >
                  <Play className="w-5 h-5 text-neo-yellow" fill="currentColor" />
                </motion.span>
              )}
            </div>
          </motion.button>
        )}

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

        {/* Quick Start Presets */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold uppercase text-neo-black/70 dark:text-neo-white/70">
            <Play className="w-3 h-3" />
            <span>
              {t('singlePlayer.preset.quickStart') || 'Quick Start'} - {t(MODE_CONFIG[selectedMode].nameKey)}
            </span>
          </div>

          {/* Preset cards - horizontal scrollable row */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex gap-2 overflow-x-auto scrollable-area snap-x snap-mandatory pb-2 -mx-2 px-2"
              style={{ scrollbarWidth: 'thin' }}
            >
              {modePresets.map((preset, index) => (
                <div key={preset.id} className="snap-start">
                  {renderPresetCard(preset, index)}
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Challenge high score teaser */}
        {challengeInfo.highScore !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-3 border-neo-yellow dark:border-neo-yellow/60 shadow-hard bg-gradient-to-r from-neo-yellow/10 to-neo-orange/10">
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
