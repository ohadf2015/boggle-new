'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaCog, FaPlay, FaCrown, FaFire } from 'react-icons/fa';
import { Target, Flame, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { DIFFICULTIES } from '@/utils/consts';
import { PRESETS, type PresetConfig } from './presetConfig';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import LandscapeIndicator from '@/components/LandscapeIndicator';
import type { Language } from '@/shared/types/game';

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

  // Filter presets for display (exclude daily - it's shown separately)
  const mainPresets = useMemo(() =>
    PRESETS.filter(p => !p.modes.includes('daily')),
    []
  );

  const dailyPreset = useMemo(() =>
    PRESETS.find(p => p.modes.includes('daily')),
    []
  );

  const renderPresetCard = (preset: PresetConfig, index: number) => {
    const IconComponent = preset.Icon;
    const difficultyConfig = DIFFICULTIES[preset.settings.difficulty];
    const isDaily = preset.id === 'daily';

    return (
      <motion.button
        key={preset.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 + 0.1 }}
        onClick={() => onSelectPreset(preset)}
        className={cn(
          'group relative p-4 sm:p-5 rounded-neo-lg border-4 transition-all',
          'flex flex-col items-center text-center',
          'shadow-hard hover:shadow-hard-lg hover:translate-x-[-3px] hover:translate-y-[-3px]',
          'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
          isDaily
            ? 'bg-gradient-to-br from-neo-orange via-neo-yellow to-neo-pink border-neo-black'
            : `bg-gradient-to-br ${preset.color} border-neo-black`
        )}
        aria-label={`${t(preset.nameKey) || preset.id}: ${t(preset.descKey) || ''}`}
      >
        {/* Badge for recommended or daily status */}
        {preset.badge === 'recommended' && (
          <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-black uppercase bg-neo-black text-neo-yellow rounded-full border-2 border-neo-yellow">
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
              <span className="flex items-center justify-center w-5 h-5 bg-neo-lime rounded-full border-2 border-neo-black">
                <Check className="w-3 h-3 text-neo-black" />
              </span>
            )}
          </div>
        )}

        {/* Icon */}
        <div className={cn(
          'w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mb-2',
          'border-3 border-neo-black shadow-hard group-hover:scale-110 transition-transform',
          preset.bgColor
        )}>
          <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 text-neo-black" />
        </div>

        {/* Name */}
        <h3 className="text-sm sm:text-base font-black uppercase text-neo-black leading-tight">
          {isDaily ? (
            <>
              {t('daily.badge') || 'Daily'}
              <span className="block text-xs font-bold opacity-80">#{dailyInfo.puzzleNumber}</span>
            </>
          ) : (
            t(preset.nameKey) || preset.id
          )}
        </h3>

        {/* Settings preview */}
        {!isDaily && (
          <p className="text-[10px] sm:text-xs font-bold text-neo-black/70 mt-1">
            {difficultyConfig.rows}x{difficultyConfig.cols} • {preset.settings.timerSeconds / 60}m
            {preset.settings.bots > 0 && ` • ${preset.settings.bots} ${t('bots.title') || 'bots'}`}
          </p>
        )}

        {/* Daily countdown or challenge high score */}
        {isDaily && dailyInfo.hasPlayedToday && (
          <p className="text-[10px] font-bold text-neo-black/70 mt-1">
            {t('daily.nextPuzzleIn') || 'Next'}: {dailyInfo.countdown}
          </p>
        )}

        {/* Play indicator */}
        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-neo-black/60 group-hover:text-neo-black transition-colors">
          <FaPlay className="w-2 h-2" />
          <span>{t('singlePlayer.preset.tapToPlay') || 'Tap to play'}</span>
        </div>
      </motion.button>
    );
  };

  // Landscape layout
  if (isLandscape) {
    return (
      <>
        <LandscapeIndicator />
        <div dir={dir} className="flex h-screen w-full overflow-hidden bg-slate-900 p-3 gap-4 landscape-full-height">
          {/* Left column: Header + Presets */}
          <div className="w-[45%] flex flex-col gap-3 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-neo border-3 border-neo-black bg-neo-cream shadow-hard hover:shadow-hard-lg transition-all"
              >
                <FaArrowLeft className="text-sm text-neo-black rtl:rotate-180" />
              </Link>
              <h1 className="text-xl font-black uppercase text-neo-white flex-1">
                {t('landing.singlePlayer') || 'Single Player'}
              </h1>
            </div>

            {/* Presets grid */}
            <div className="grid grid-cols-2 gap-3">
              {mainPresets.map((preset, index) => renderPresetCard(preset, index))}
              {dailyPreset && renderPresetCard(dailyPreset, mainPresets.length)}
            </div>
          </div>

          {/* Right column: Info + Custom */}
          <div className="w-[55%] flex flex-col gap-3 overflow-y-auto">
            {/* Challenge high score preview */}
            {challengeInfo.highScore !== null && (
              <Card className="border-3 border-neo-yellow shadow-hard bg-gradient-to-br from-neo-yellow/20 to-neo-orange/10">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FaCrown className="text-neo-yellow text-xl" />
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
                <FaCog className="w-4 h-4" />
                {t('singlePlayer.preset.customGame') || 'Custom Game Setup'}
              </Button>
            </motion.div>

            {/* Hint */}
            <p className="text-center text-xs text-neo-cream/60">
              {t('singlePlayer.preset.hint') || 'Tap any preset for instant play, or customize your game'}
            </p>
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
            <FaArrowLeft className="w-5 h-5 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-center text-neo-black dark:text-neo-white">
            {t('landing.singlePlayer') || 'Single Player'}
          </h1>
        </div>

        {/* Quick Start label */}
        <div className="flex items-center gap-2 text-sm font-bold uppercase text-neo-black/70 dark:text-neo-white/70">
          <FaPlay className="w-3 h-3" />
          <span>{t('singlePlayer.preset.quickStart') || 'Quick Start'}</span>
        </div>

        {/* Preset cards - 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {mainPresets.map((preset, index) => renderPresetCard(preset, index))}
        </div>

        {/* Daily challenge - full width */}
        {dailyPreset && (
          <div className="mt-2">
            {renderPresetCard(dailyPreset, mainPresets.length)}
          </div>
        )}

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
                  <FaCrown className="text-neo-yellow text-lg" />
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
          <span className="text-xs font-bold uppercase text-neo-black/50 dark:text-neo-white/50">
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
            <FaCog className="w-4 h-4" />
            {t('singlePlayer.preset.customGame') || 'Custom Game Setup'}
          </Button>
        </motion.div>

        {/* Hint text */}
        <p className="text-center text-xs text-neo-black/50 dark:text-neo-cream/50 pb-4">
          {t('singlePlayer.preset.hint') || 'Tap any preset for instant play, or customize your game'}
        </p>
      </motion.div>
    </>
  );
};

export default PresetSelector;
