'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Bot, Plus, X, Book, Trophy, Settings, ChevronDown, ArrowLeft, Crown, Zap, Sparkles, Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSelector } from '@/components/join';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { DIFFICULTIES } from '@/utils/consts';
import { getHighScore, getProgressStats, getAllTimeBest } from './highScoreManager';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import LandscapeIndicator from '@/components/LandscapeIndicator';
import type { DifficultyLevel, Language } from '@/shared/types/game';
import type { SinglePlayerGameState, SinglePlayerMode, BotOpponent } from './SinglePlayerView';
import { ConfigWizardNav, WizardNavigationButtons, type WizardStep } from './ConfigWizardNav';

interface SinglePlayerLobbyProps {
  initialSettings: SinglePlayerGameState;
  onStartGame: (settings: Partial<SinglePlayerGameState>) => void;
  onBack?: () => void; // Back to preset selection
}

type BotDifficulty = 'easy' | 'medium' | 'hard';

const BOT_NAMES = [
  'WordBot', 'LexiBot', 'AlphaBot', 'BrainBot', 'SpeedBot',
  'CleverBot', 'QuickBot', 'SmartBot', 'ProBot', 'MasterBot'
];

const MODE_CONFIG = {
  'solo-bots': {
    Icon: Bot,
    color: 'from-bot-purple via-bot-purple-dark to-bot-indigo',
    selectedBorder: 'border-bot-purple',
    labelKey: 'singlePlayer.soloVsBots',
    descKey: 'singlePlayer.soloVsBotsDesc',
  },
  'practice': {
    Icon: Book,
    color: 'from-neo-lime to-lime-400',
    selectedBorder: 'border-neo-lime',
    labelKey: 'singlePlayer.practiceMode',
    descKey: 'singlePlayer.practiceModeDesc',
  },
  'challenge': {
    Icon: Trophy,
    color: 'from-neo-lime to-yellow-400',
    selectedBorder: 'border-neo-lime',
    labelKey: 'singlePlayer.challengeMode',
    descKey: 'singlePlayer.challengeModeDesc',
  },
};

const BOT_DIFFICULTY_CONFIG: Record<BotDifficulty, { labelKey: string; color: string; icon: string }> = {
  easy: { labelKey: 'bots.easy', color: 'bg-neo-cyan', icon: '🤖' },
  medium: { labelKey: 'bots.medium', color: 'bg-neo-lime', icon: '⚙️' },
  hard: { labelKey: 'bots.hard', color: 'bg-neo-pink text-white', icon: '💀' },
};

// Difficulty configuration with icons for simplified UI
const DIFFICULTY_ICON_CONFIG: Record<DifficultyLevel, {
  Icon: typeof Sparkles;
  bgColor: string;
  selectedColor: string;
}> = {
  EASY: { Icon: Sparkles, bgColor: 'bg-neo-lime', selectedColor: 'bg-neo-lime text-neo-black' },
  MEDIUM: { Icon: Zap, bgColor: 'bg-neo-lime', selectedColor: 'bg-neo-lime text-neo-black' },
  HARD: { Icon: Skull, bgColor: 'bg-neo-red', selectedColor: 'bg-neo-red text-white' },
};

/**
 * SinglePlayerLobby - Simplified lobby for single player modes
 * Clean UI with optional advanced settings
 */
const SinglePlayerLobby: React.FC<SinglePlayerLobbyProps> = ({
  initialSettings,
  onStartGame,
  onBack,
}) => {
  const { t, language: currentLanguage } = useLanguage();
  const isLandscape = useMobileLandscape();

  // Game settings state
  const [mode, setMode] = useState<SinglePlayerMode>(initialSettings.mode);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialSettings.difficulty);
  const [gameLanguage, setGameLanguage] = useState<Language>(initialSettings.language || currentLanguage as Language);
  const [bots, setBots] = useState<BotOpponent[]>(initialSettings.bots);
  const [selectedBotDifficulty, setSelectedBotDifficulty] = useState<BotDifficulty>('medium');
  const [timerMinutes, setTimerMinutes] = useState(Math.floor(initialSettings.timerSeconds / 60) || 2);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Wizard step state - 2 simple steps: Mode → Settings & Start
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [useWizard, setUseWizard] = useState(true);

  // Wizard step validation - simplified to 2 steps
  const canAdvanceFromStep = useCallback((step: WizardStep): boolean => {
    switch (step) {
      case 1: return mode !== null;
      case 2: return difficulty !== null && (mode !== 'solo-bots' || bots.length > 0);
    }
  }, [mode, difficulty, bots.length]);

  const handleWizardNext = useCallback(() => {
    if (wizardStep < 2 && canAdvanceFromStep(wizardStep)) {
      setWizardStep((prev) => (prev + 1) as WizardStep);
    }
  }, [wizardStep, canAdvanceFromStep]);

  const handleWizardBack = useCallback(() => {
    if (wizardStep > 1) {
      setWizardStep((prev) => (prev - 1) as WizardStep);
    }
  }, [wizardStep]);

  const addBot = useCallback(() => {
    if (bots.length >= 5) return;
    const availableNames = BOT_NAMES.filter(name => !bots.some(bot => bot.name === name));
    const botName = availableNames[Math.floor(Math.random() * availableNames.length)] || `Bot${bots.length + 1}`;
    const newBot: BotOpponent = {
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: botName,
      difficulty: selectedBotDifficulty,
      score: 0,
      wordsFound: [],
    };
    setBots(prev => [...prev, newBot]);
  }, [bots, selectedBotDifficulty]);

  const removeBot = useCallback((botId: string) => {
    setBots(prev => prev.filter(bot => bot.id !== botId));
  }, []);

  const handleStartGame = () => {
    const timerSeconds = mode === 'practice' ? 0 : timerMinutes * 60;
    onStartGame({
      mode,
      difficulty,
      language: gameLanguage,
      timerSeconds,
      bots: mode === 'solo-bots' ? bots : [],
    });
  };

  const difficultyConfig = DIFFICULTIES[difficulty];

  // Get high score data for challenge mode
  const timerSeconds = timerMinutes * 60;
  const currentHighScore = useMemo(() =>
    getHighScore(difficulty, timerSeconds),
    [difficulty, timerSeconds]
  );
  const allTimeBest = useMemo(() => getAllTimeBest(), []);
  const progressStats = useMemo(() => getProgressStats(), []);

  // Landscape mode layout - optimized 2-column: mode selection left, settings + start right
  if (isLandscape) {
    return (
      <>
        {/* Landscape mode suggestion banner */}
        <LandscapeIndicator />

        <div className="flex h-screen w-full overflow-hidden bg-slate-900 text-white p-3 gap-4 landscape-full-height">
        {/* Left column: Mode Selection */}
        <div className="w-[40%] flex flex-col gap-3 overflow-y-auto">
          {/* Header with back */}
          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                onClick={onBack}
                className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-neo border-3 border-neo-black bg-neo-cream shadow-hard hover:shadow-hard-lg transition-all"
              >
                <ArrowLeft className="text-sm text-neo-black rtl:rotate-180" />
              </button>
            ) : (
              <Link
                href="/"
                className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-neo border-3 border-neo-black bg-neo-cream shadow-hard hover:shadow-hard-lg transition-all"
              >
                <ArrowLeft className="text-sm text-neo-black rtl:rotate-180" />
              </Link>
            )}
            <h1 className="text-xl font-black uppercase text-neo-white flex-1">
              {t('singlePlayer.preset.customGame') || 'Custom Game'}
            </h1>
          </div>

          {/* Mode buttons - vertical */}
          <div className="flex flex-col gap-3">
            {(Object.keys(MODE_CONFIG) as Array<keyof typeof MODE_CONFIG>).map(modeKey => {
              const config = MODE_CONFIG[modeKey];
              const isSelected = mode === modeKey;
              const IconComponent = config.Icon;

              return (
                <button
                  key={modeKey}
                  onClick={() => setMode(modeKey)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-neo border-3 transition-all shadow-hard hover:shadow-hard-lg',
                    isSelected
                      ? `bg-gradient-to-r ${config.color} ${config.selectedBorder} text-neo-black`
                      : 'bg-neo-cream dark:bg-slate-700 border-neo-black text-neo-black dark:text-neo-white'
                  )}
                >
                  <IconComponent className="w-8 h-8 flex-shrink-0" />
                  <span className="text-base font-black uppercase">{t(config.labelKey) || modeKey}</span>
                </button>
              );
            })}
          </div>

          {/* Challenge mode high score */}
          {mode === 'challenge' && currentHighScore !== null && (
            <div className="bg-neo-lime border-3 border-neo-black rounded-neo p-3 text-center shadow-hard">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
                <span className="font-black text-neo-black text-xl">{currentHighScore.score}</span>
              </div>
              <div className="text-xs font-bold text-neo-black/70 uppercase">{t('challenge.recordToBeat') || 'Record to Beat'}</div>
            </div>
          )}
        </div>

        {/* Right column: Settings + Start */}
        <div className="w-[60%] flex flex-col gap-3 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto space-y-3">
            {/* Difficulty - Icon-based compact selector */}
            <div>
              <label className="text-sm font-bold uppercase text-neo-white mb-2 block">{t('singlePlayer.difficulty') || 'Difficulty'}</label>
              <div className="flex gap-2">
                {(['EASY', 'MEDIUM', 'HARD'] as DifficultyLevel[]).map(diff => {
                  const config = DIFFICULTY_ICON_CONFIG[diff];
                  const diffConfig = DIFFICULTIES[diff];
                  const IconComponent = config.Icon;
                  const isSelected = difficulty === diff;
                  return (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={cn(
                        'flex-1 py-2 px-2 rounded-neo border-3 border-neo-black shadow-hard hover:shadow-hard-lg transition-all flex flex-col items-center gap-1',
                        isSelected ? config.selectedColor : 'bg-neo-cream text-neo-black'
                      )}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span className="text-xs font-black">{diffConfig.rows}×{diffConfig.cols}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timer (not for practice mode) */}
            {mode !== 'practice' && (
              <div>
                <label className="text-sm font-bold uppercase text-neo-white mb-2 block">{t('singlePlayer.timer') || 'Timer'}</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(min => (
                    <button
                      key={min}
                      onClick={() => setTimerMinutes(min)}
                      className={cn(
                        'flex-1 py-3 rounded-neo border-3 border-neo-black text-sm font-bold shadow-hard hover:shadow-hard-lg transition-all',
                        timerMinutes === min ? 'bg-neo-cyan text-neo-black' : 'bg-neo-cream text-neo-black'
                      )}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Language */}
            <div>
              <label className="text-sm font-bold uppercase text-neo-white mb-2 block">{t('joinView.language') || 'Language'}</label>
              <LanguageSelector selectedLanguage={gameLanguage} onLanguageChange={setGameLanguage} hideLabel />
            </div>

            {/* Bots (for solo-bots mode) - Purple themed */}
            {mode === 'solo-bots' && (
              <div className="p-3 bg-gradient-to-br from-bot-purple/20 via-bot-purple-dark/15 to-bot-indigo/20 rounded-neo-lg border-2 border-bot-purple/50 shadow-hard-purple">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold uppercase text-neo-white flex items-center gap-2">
                    <Bot className="text-bot-purple-light" />
                    {t('singlePlayer.opponents') || 'Opponents'}
                    <Badge className="bg-bot-purple/30 text-bot-purple-light text-[10px] px-1.5 border border-bot-purple">AI</Badge>
                  </label>
                </div>
                <div className="flex gap-2 items-center mb-2">
                  {(['easy', 'medium', 'hard'] as BotDifficulty[]).map(diff => (
                    <button
                      key={diff}
                      onClick={() => setSelectedBotDifficulty(diff)}
                      className={cn(
                        'px-3 py-2 rounded text-xs font-bold uppercase border-2 border-neo-black/30 text-neo-black flex-1',
                        selectedBotDifficulty === diff
                          ? BOT_DIFFICULTY_CONFIG[diff].color
                          : 'bg-white hover:bg-slate-100'
                      )}
                    >
                      {t(BOT_DIFFICULTY_CONFIG[diff].labelKey) || diff}
                    </button>
                  ))}
                  <button
                    onClick={addBot}
                    disabled={bots.length >= 5}
                    className="px-3 py-2 text-sm bg-bot-purple hover:bg-bot-purple-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-neo border-2 border-bot-border text-white font-bold shadow-hard-purple"
                  >
                    <Plus className="inline" />
                  </button>
                </div>
                {bots.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {bots.map(bot => (
                      <div
                        key={bot.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-neo border-2 border-bot-purple bg-gradient-to-r from-bot-purple/20 to-bot-indigo/20 shadow-hard-sm"
                      >
                        <span className="w-5 h-5 rounded-full flex items-center justify-center bg-bot-purple border border-bot-purple-light/50">
                          <Bot className="text-white text-[10px]" />
                        </span>
                        <span className="text-xs font-medium text-neo-white">
                          {bot.name}
                        </span>
                        <Badge className={cn('text-[10px] px-1.5 py-0', BOT_DIFFICULTY_CONFIG[bot.difficulty].color)}>
                          {BOT_DIFFICULTY_CONFIG[bot.difficulty].icon}
                        </Badge>
                        <button
                          onClick={() => removeBot(bot.id)}
                          className="w-5 h-5 flex items-center justify-center rounded-full text-neo-red/70 hover:text-neo-red hover:bg-neo-red/20 transition-colors"
                          aria-label={`Remove ${bot.name}`}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neo-white/70 italic text-center py-2">
                    {t('singlePlayer.noBots') || 'Tap + to add bot opponents'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Start Button - fixed at bottom */}
          <Button
            onClick={handleStartGame}
            className="w-full h-14 font-black uppercase text-lg bg-neo-lime hover:bg-neo-lime/90 text-neo-black border-4 border-neo-black shadow-hard hover:shadow-hard-lg transition-all flex-shrink-0"
          >
            <Play className="mr-2 w-6 h-6" />
            {t('singlePlayer.startGame') || 'Start Game'}
          </Button>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      {/* Landscape mode suggestion banner */}
      <LandscapeIndicator />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="min-h-screen flex flex-col justify-start max-w-xl mx-auto space-y-3 sm:space-y-4 px-2 xs:px-4 py-4"
      >
      {/* Title with back button */}
      <div className="relative flex items-center justify-center mb-1 px-16 overflow-visible">
        {onBack ? (
          <button
            onClick={onBack}
            className="absolute start-0 flex items-center gap-2 px-3 py-2 rounded-neo border-3 border-neo-black dark:border-slate-600 bg-neo-cream dark:bg-slate-700 shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed transition-all text-neo-black dark:text-neo-white text-sm font-bold min-h-[44px] min-w-[44px] z-10"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
          </button>
        ) : (
          <Link
            href="/"
            className="absolute start-0 flex items-center gap-2 px-3 py-2 rounded-neo border-3 border-neo-black dark:border-slate-600 bg-neo-cream dark:bg-slate-700 shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed transition-all text-neo-black dark:text-neo-white text-sm font-bold min-h-[44px] min-w-[44px] z-10"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
          </Link>
        )}
        <h1 className="text-2xl sm:text-3xl font-black uppercase text-center text-neo-black dark:text-neo-white flex-1">
          {t('singlePlayer.preset.customGame') || 'Custom Game'}
        </h1>
      </div>

      {/* Wizard Step Indicator */}
      {useWizard && (
        <ConfigWizardNav
          currentStep={wizardStep}
          onStepChange={setWizardStep}
          canAdvance={canAdvanceFromStep(wizardStep)}
          t={t}
          className="mb-2"
        />
      )}

      {/* Step 1: Mode Selection - 2x2 Grid */}
      <AnimatePresence mode="wait">
        {(!useWizard || wizardStep === 1) && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
        <div className="text-center mb-2">
          <h2 className="text-lg font-bold text-neo-black dark:text-neo-white">
            {t('wizard.selectMode') || 'Select Game Mode'}
          </h2>
        </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {(Object.keys(MODE_CONFIG) as Array<keyof typeof MODE_CONFIG>).map(modeKey => {
          const config = MODE_CONFIG[modeKey];
          const isSelected = mode === modeKey;
          const IconComponent = config.Icon;

          return (
            <motion.button
              key={modeKey}
              onClick={() => setMode(modeKey)}
              className={cn(
                'relative p-3 sm:p-4 rounded-neo-lg border-4 transition-all',
                'flex flex-col items-center gap-1.5 sm:gap-2 text-center',
                isSelected
                  ? `bg-gradient-to-br ${config.color} ${config.selectedBorder} shadow-hard-pressed translate-x-[2px] translate-y-[2px] text-neo-black`
                  : 'bg-neo-cream dark:bg-slate-700 border-neo-black dark:border-slate-500 shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg text-neo-black dark:text-neo-white'
              )}
              whileTap={{ scale: 0.98 }}
            >
              <IconComponent className="w-7 h-7 sm:w-9 sm:h-9" />
              <span className="text-xs sm:text-sm font-black uppercase leading-tight">
                {t(config.labelKey) || modeKey}
              </span>
            </motion.button>
          );
        })}
      </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 2: Settings & Start */}
      <AnimatePresence mode="wait">
        {(!useWizard || wizardStep === 2) && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
        <div className="text-center mb-2">
          <h2 className="text-lg font-bold text-neo-black dark:text-neo-white">
            {t('wizard.gameSettings') || 'Game Settings'}
          </h2>
        </div>
        <Card className="border-3 border-neo-black dark:border-slate-600 shadow-hard">
          <CardContent className="p-3 sm:p-4 space-y-4">
            {/* Difficulty Selection - Icon-based compact selector */}
            <div>
              <label className="text-sm font-bold uppercase tracking-wide text-neo-black/70 dark:text-neo-white/70 mb-2 block">
                {t('wizard.chooseDifficulty') || 'Difficulty'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['EASY', 'MEDIUM', 'HARD'] as DifficultyLevel[]).map(level => {
                  const diffConfig = DIFFICULTIES[level];
                  const iconConfig = DIFFICULTY_ICON_CONFIG[level];
                  const IconComponent = iconConfig.Icon;
                  const isSelected = difficulty === level;
                  return (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={cn(
                        'p-2 sm:p-3 rounded-neo-lg border-3 border-neo-black dark:border-slate-500 transition-all flex flex-col items-center gap-1',
                        isSelected
                          ? `${iconConfig.selectedColor} shadow-hard-pressed translate-x-[1px] translate-y-[1px]`
                          : 'bg-white dark:bg-slate-600 shadow-hard hover:shadow-hard-lg text-neo-black dark:text-neo-white'
                      )}
                    >
                      <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                      <div className="font-black text-sm sm:text-base">
                        {diffConfig.rows}×{diffConfig.cols}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timer for timed modes */}
            {mode !== 'practice' && (
              <div>
                <label className="text-sm font-bold uppercase tracking-wide text-neo-black/70 dark:text-neo-white/70 mb-2 block">
                  {t('singlePlayer.timer') || 'Game Duration'}
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(min => (
                    <button
                      key={min}
                      onClick={() => setTimerMinutes(min)}
                      className={cn(
                        'flex-1 py-2 rounded-neo border-3 border-neo-black text-sm font-bold shadow-hard hover:shadow-hard-lg transition-all text-neo-black',
                        timerMinutes === min ? 'bg-neo-cyan text-neo-black' : 'bg-neo-cream dark:bg-slate-600 dark:text-neo-white'
                      )}
                    >
                      {min} {t('common.minutes') || 'min'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Language selector */}
            <div>
              <label className="text-sm font-bold uppercase tracking-wide text-neo-black/70 dark:text-neo-white/70 mb-2 block">
                {t('joinView.language') || 'Language'}
              </label>
              <LanguageSelector selectedLanguage={gameLanguage} onLanguageChange={setGameLanguage} hideLabel />
            </div>

            {/* Bot management for solo-bots mode */}
            {mode === 'solo-bots' && (
              <div className="p-3 sm:p-4 bg-gradient-to-br from-bot-purple/15 via-bot-purple-dark/10 to-bot-indigo/15 rounded-neo-lg border-3 border-bot-purple/50 shadow-hard-purple">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold flex items-center gap-2 text-neo-black dark:text-neo-white">
                    <Bot className="text-bot-purple" />
                    <Badge className="bg-bot-purple/20 text-bot-purple border border-bot-purple text-[10px] px-1.5">AI</Badge>
                    {t('singlePlayer.opponents') || 'Opponents'}
                  </span>
                </div>
                <div className="flex gap-1 items-center mb-3">
                  {(['easy', 'medium', 'hard'] as BotDifficulty[]).map(diff => (
                    <button
                      key={diff}
                      onClick={() => setSelectedBotDifficulty(diff)}
                      className={cn(
                        'px-3 py-1.5 rounded text-xs font-bold uppercase border-2 border-neo-black/30 dark:border-slate-500 text-neo-black flex-1',
                        selectedBotDifficulty === diff
                          ? BOT_DIFFICULTY_CONFIG[diff].color
                          : 'bg-white dark:bg-slate-600 dark:text-neo-white hover:bg-slate-100 dark:hover:bg-slate-500'
                      )}
                    >
                      {t(BOT_DIFFICULTY_CONFIG[diff].labelKey) || diff}
                    </button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addBot}
                    disabled={bots.length >= 5}
                    className="h-8 px-3 ml-2 border-2 border-neo-black dark:border-slate-500 bg-neo-lime hover:bg-neo-lime/80 text-neo-black"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {bots.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {bots.map(bot => (
                      <div
                        key={bot.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-neo border-2 border-bot-purple bg-gradient-to-r from-bot-purple/15 to-bot-indigo/15 shadow-hard-sm"
                      >
                        <span className="w-5 h-5 rounded-full flex items-center justify-center bg-bot-purple border border-bot-purple-light/50">
                          <Bot className="text-white text-[10px]" />
                        </span>
                        <span className="text-xs font-medium text-neo-black dark:text-neo-white">
                          {bot.name}
                        </span>
                        <Badge className={cn('text-[10px] px-1.5 py-0', BOT_DIFFICULTY_CONFIG[bot.difficulty].color)}>
                          {BOT_DIFFICULTY_CONFIG[bot.difficulty].icon}
                        </Badge>
                        <button
                          onClick={() => removeBot(bot.id)}
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:text-neo-red hover:bg-neo-red/20 transition-colors"
                          aria-label={`Remove ${bot.name}`}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neo-black/70 dark:text-neo-white/70 italic text-center py-2">
                    {t('singlePlayer.noBots') || 'Tap + to add bot opponents'}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wizard Navigation Buttons */}
      {useWizard && (
        <WizardNavigationButtons
          currentStep={wizardStep}
          canAdvance={canAdvanceFromStep(wizardStep)}
          onBack={handleWizardBack}
          onNext={handleWizardNext}
          onStart={handleStartGame}
          t={t}
        />
      )}

      {/* Non-wizard mode: Show all content */}
      {!useWizard && (
        <>
      {/* Quick Info Card */}
      <Card className="border-3 border-neo-black dark:border-slate-600 shadow-hard">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div>
              <h3 className="font-black text-lg uppercase">
                {t(MODE_CONFIG[mode as keyof typeof MODE_CONFIG]?.labelKey) || mode}
              </h3>
              <p className="text-sm text-neo-black/75 dark:text-neo-white/75">
                {t(MODE_CONFIG[mode as keyof typeof MODE_CONFIG]?.descKey)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase text-neo-black/70 dark:text-neo-white/70">
                {t('singlePlayer.selectDifficulty') || 'Grid'}
              </div>
              <div className="font-bold">
                {difficultyConfig.rows}x{difficultyConfig.cols}
              </div>
            </div>
          </div>

          {/* Challenge Mode High Score Display - Simplified */}
          {mode === 'challenge' && (
            <div className="mb-2 sm:mb-3">
              {currentHighScore ? (
                <div className="p-3 bg-neo-lime rounded-neo-lg border-3 border-neo-black shadow-hard">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="text-neo-black w-5 h-5" />
                      <span className="font-black text-neo-black">
                        {currentHighScore.score} {t('common.points') || 'pts'}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-neo-black/70">
                      {currentHighScore.wordCount} {t('common.words') || 'words'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-neo-cyan/20 rounded-neo-lg border-2 border-dashed border-neo-cyan text-center">
                  <span className="text-sm font-bold text-neo-black dark:text-neo-white">
                    {t('challenge.noRecord') || 'No high score yet'}
                  </span>
                </div>
              )}

              {/* Removed: Progress Stats and All-Time Best - less clutter */}
            </div>
          )}

          {/* Bot config for solo-bots mode - Purple themed */}
          {mode === 'solo-bots' && (
            <div className="mb-2 sm:mb-3 p-3 sm:p-4 bg-gradient-to-br from-bot-purple/15 via-bot-purple-dark/10 to-bot-indigo/15 rounded-neo-lg border-3 border-bot-purple/50 shadow-hard-purple">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold flex items-center gap-2 text-neo-black dark:text-neo-white">
                  <Bot className="text-bot-purple" />
                  <Badge className="bg-bot-purple/20 text-bot-purple border border-bot-purple text-[10px] px-1.5">AI</Badge>
                  {t('singlePlayer.opponents') || 'Opponents'}
                </span>
                <div className="flex gap-1 items-center">
                  {(['easy', 'medium', 'hard'] as BotDifficulty[]).map(diff => (
                    <button
                      key={diff}
                      onClick={() => setSelectedBotDifficulty(diff)}
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-bold uppercase border-2 border-neo-black/30 dark:border-slate-500 text-neo-black',
                        selectedBotDifficulty === diff
                          ? BOT_DIFFICULTY_CONFIG[diff].color
                          : 'bg-white dark:bg-slate-600 dark:text-neo-white hover:bg-slate-100 dark:hover:bg-slate-500'
                      )}
                    >
                      {t(BOT_DIFFICULTY_CONFIG[diff].labelKey) || diff}
                    </button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addBot}
                    disabled={bots.length >= 5}
                    className="h-6 px-2 ml-1 border-2 border-neo-black dark:border-slate-500 bg-neo-lime hover:bg-neo-lime/80 text-neo-black"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {bots.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {bots.map(bot => (
                    <div
                      key={bot.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-neo border-2 border-bot-purple bg-gradient-to-r from-bot-purple/15 to-bot-indigo/15 shadow-hard-sm"
                    >
                      <span className="w-5 h-5 rounded-full flex items-center justify-center bg-bot-purple border border-bot-purple-light/50">
                        <Bot className="text-white text-[10px]" />
                      </span>
                      <span className="text-xs font-medium text-neo-black dark:text-neo-white">
                        {bot.name}
                      </span>
                      <Badge className={cn('text-[10px] px-1.5 py-0', BOT_DIFFICULTY_CONFIG[bot.difficulty].color)}>
                        {BOT_DIFFICULTY_CONFIG[bot.difficulty].icon}
                      </Badge>
                      <button
                        onClick={() => removeBot(bot.id)}
                        className="w-5 h-5 flex items-center justify-center rounded-full hover:text-neo-red hover:bg-neo-red/20 transition-colors"
                        aria-label={`Remove ${bot.name}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neo-black/70 dark:text-neo-white/70 italic text-center py-2">
                  {t('singlePlayer.noBots') || 'Tap + to add bot opponents'}
                </p>
              )}
            </div>
          )}

          {/* Timer display for non-practice modes */}
          {mode !== 'practice' && (
            <div className="flex items-center justify-between text-sm mb-4">
              <span className="text-neo-black/75 dark:text-neo-white/75">
                {t('singlePlayer.gameTime') || 'Time'}
              </span>
              <div className="flex gap-1">
                {[1, 2, 3].map(min => (
                  <button
                    key={min}
                    onClick={() => setTimerMinutes(min)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-bold border-2 text-neo-black',
                      timerMinutes === min
                        ? 'bg-neo-cyan border-neo-cyan text-neo-black'
                        : 'bg-white dark:bg-slate-600 dark:text-neo-white border-neo-black/20 dark:border-slate-500 hover:bg-neo-cyan/20 dark:hover:bg-neo-cyan/30'
                    )}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Language Selection */}
          <div className="mb-4">
            <LanguageSelector
              selectedLanguage={gameLanguage}
              onLanguageChange={setGameLanguage}
            />
          </div>

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-neo-black/75 dark:text-neo-white/75 hover:text-neo-black dark:hover:text-neo-white transition-colors"
          >
            <Settings className={cn('transition-transform', showAdvanced && 'rotate-90')} />
            {t('common.advancedSettings') || 'Advanced Settings'}
            <ChevronDown className={cn('transition-transform', showAdvanced && 'rotate-180')} />
          </button>

          {/* Advanced Settings Panel */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-4 border-t border-neo-black/10 dark:border-slate-600 mt-2">
                  {/* Difficulty/Grid Size Selection - Icon-based */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wide text-neo-black/70 dark:text-neo-white/70">
                      {t('singlePlayer.selectDifficulty') || 'Grid Size'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['EASY', 'MEDIUM', 'HARD'] as DifficultyLevel[]).map(level => {
                        const diffConfig = DIFFICULTIES[level];
                        const iconConfig = DIFFICULTY_ICON_CONFIG[level];
                        const IconComponent = iconConfig.Icon;
                        const isSelected = difficulty === level;
                        return (
                          <button
                            key={level}
                            onClick={() => setDifficulty(level)}
                            className={cn(
                              'p-2 rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all flex flex-col items-center gap-1',
                              isSelected
                                ? `${iconConfig.selectedColor} shadow-hard-pressed translate-x-[1px] translate-y-[1px]`
                                : 'bg-white dark:bg-slate-600 shadow-hard hover:shadow-hard-lg text-neo-black dark:text-neo-white'
                            )}
                          >
                            <IconComponent className="w-4 h-4" />
                            <div className="text-xs font-black">
                              {diffConfig.rows}×{diffConfig.cols}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Start Game Button */}
      <Button
        size="lg"
        variant="success"
        className="w-full text-lg py-4 sm:py-6 shadow-hard hover:shadow-hard-lg"
        onClick={handleStartGame}
      >
        <Play className="mr-2" />
        {t('singlePlayer.startGame') || 'Start Game'}
      </Button>
        </>
      )}
    </motion.div>
    </>
  );
};

export default SinglePlayerLobby;
