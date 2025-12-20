'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaRobot, FaPlus, FaTimes, FaBook, FaTrophy, FaCog, FaChevronDown, FaArrowLeft, FaCrown, FaFire } from 'react-icons/fa';
import { Target, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSelector } from '@/components/join';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { DIFFICULTIES } from '@/utils/consts';
import { getHighScore, getProgressStats, getAllTimeBest } from './highScoreManager';
import type { DifficultyLevel, Language } from '@/shared/types/game';
import type { SinglePlayerGameState, SinglePlayerMode, BotOpponent } from './SinglePlayerView';

interface SinglePlayerLobbyProps {
  initialSettings: SinglePlayerGameState;
  onStartGame: (settings: Partial<SinglePlayerGameState>) => void;
}

type BotDifficulty = 'easy' | 'medium' | 'hard';

const BOT_NAMES = [
  'WordBot', 'LexiBot', 'AlphaBot', 'BrainBot', 'SpeedBot',
  'CleverBot', 'QuickBot', 'SmartBot', 'ProBot', 'MasterBot'
];

const MODE_CONFIG = {
  'solo-bots': {
    Icon: FaRobot,
    color: 'from-neo-cyan to-cyan-400',
    selectedBorder: 'border-neo-cyan',
    labelKey: 'singlePlayer.soloVsBots',
    descKey: 'singlePlayer.soloVsBotsDesc',
  },
  'practice': {
    Icon: FaBook,
    color: 'from-neo-lime to-lime-400',
    selectedBorder: 'border-neo-lime',
    labelKey: 'singlePlayer.practiceMode',
    descKey: 'singlePlayer.practiceModeDesc',
  },
  'challenge': {
    Icon: FaTrophy,
    color: 'from-neo-yellow to-yellow-400',
    selectedBorder: 'border-neo-yellow',
    labelKey: 'singlePlayer.challengeMode',
    descKey: 'singlePlayer.challengeModeDesc',
  },
};

const BOT_DIFFICULTY_CONFIG: Record<BotDifficulty, { labelKey: string; color: string }> = {
  easy: { labelKey: 'bots.easy', color: 'bg-neo-lime' },
  medium: { labelKey: 'bots.medium', color: 'bg-neo-yellow' },
  hard: { labelKey: 'bots.hard', color: 'bg-neo-red text-white' },
};

/**
 * SinglePlayerLobby - Simplified lobby for single player modes
 * Clean UI with optional advanced settings
 */
const SinglePlayerLobby: React.FC<SinglePlayerLobbyProps> = ({
  initialSettings,
  onStartGame,
}) => {
  const { t, language: currentLanguage } = useLanguage();

  // Game settings state
  const [mode, setMode] = useState<SinglePlayerMode>(initialSettings.mode);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialSettings.difficulty);
  const [gameLanguage, setGameLanguage] = useState<Language>(initialSettings.language || currentLanguage as Language);
  const [bots, setBots] = useState<BotOpponent[]>(initialSettings.bots);
  const [selectedBotDifficulty, setSelectedBotDifficulty] = useState<BotDifficulty>('medium');
  const [timerMinutes, setTimerMinutes] = useState(Math.floor(initialSettings.timerSeconds / 60) || 2);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-xl mx-auto space-y-6"
    >
      {/* Title with back button */}
      <div className="relative flex items-center justify-center mb-2">
        <Link
          href="/"
          className="absolute start-0 flex items-center gap-2 px-3 py-2 rounded-neo border-3 border-neo-black dark:border-slate-600 bg-neo-cream dark:bg-slate-700 shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-neo-black dark:text-neo-white text-sm font-bold"
        >
          <FaArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black uppercase text-center text-neo-black dark:text-neo-white">
          {t('landing.singlePlayer') || 'Single Player'}
        </h1>
      </div>

      {/* Mode Selection - Main UI */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {(Object.keys(MODE_CONFIG) as SinglePlayerMode[]).map(modeKey => {
          const config = MODE_CONFIG[modeKey];
          const isSelected = mode === modeKey;
          const IconComponent = config.Icon;

          return (
            <motion.button
              key={modeKey}
              onClick={() => setMode(modeKey)}
              className={cn(
                'relative p-4 sm:p-6 rounded-neo-lg border-4 transition-all',
                'flex flex-col items-center gap-2 text-center',
                isSelected
                  ? `bg-gradient-to-br ${config.color} ${config.selectedBorder} shadow-hard-pressed translate-x-[2px] translate-y-[2px] text-neo-black`
                  : 'bg-neo-cream dark:bg-slate-700 border-neo-black dark:border-slate-500 shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg text-neo-black dark:text-neo-white'
              )}
              whileTap={{ scale: 0.98 }}
            >
              <IconComponent className="w-8 h-8 sm:w-10 sm:h-10" />
              <span className="text-xs sm:text-sm font-black uppercase leading-tight">
                {t(config.labelKey) || modeKey}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Quick Info Card */}
      <Card className="border-3 border-neo-black dark:border-slate-600 shadow-hard">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-lg uppercase">
                {t(MODE_CONFIG[mode].labelKey) || mode}
              </h3>
              <p className="text-sm text-neo-black/60 dark:text-neo-white/60">
                {t(MODE_CONFIG[mode].descKey)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase text-neo-black/50 dark:text-neo-white/50">
                {t('singlePlayer.selectDifficulty') || 'Grid'}
              </div>
              <div className="font-bold">
                {difficultyConfig.rows}x{difficultyConfig.cols}
              </div>
            </div>
          </div>

          {/* Challenge Mode High Score Display */}
          {mode === 'challenge' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4"
            >
              {currentHighScore ? (
                <div className="p-4 bg-gradient-to-br from-neo-yellow via-yellow-300 to-neo-orange rounded-neo-lg border-4 border-neo-black shadow-hard relative overflow-hidden texture-halftone-comic">
                  {/* Comic-style halftone dots */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-[0.05]"
                    style={{
                      backgroundImage: `radial-gradient(circle, rgb(var(--neo-black)) 1px, transparent 1px)`,
                      backgroundSize: '12px 12px',
                    }}
                  />
                  {/* Trophy background decoration */}
                  <div className="absolute -right-4 -top-4 opacity-10">
                    <FaTrophy className="w-24 h-24 text-neo-black" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FaCrown className="text-neo-black text-xl" />
                        <span className="font-black uppercase text-sm text-neo-black">
                          {t('challenge.yourRecord') || 'Your Record'}
                        </span>
                      </div>
                      <Badge className="bg-neo-black text-neo-yellow border-0 font-black">
                        {difficultyConfig.rows}x{difficultyConfig.cols} • {timerMinutes}m
                      </Badge>
                    </div>
                    <div className="flex items-end gap-4">
                      <div>
                        <div className="text-5xl font-black text-neo-black" style={{ textShadow: '2px 2px 0 rgba(255,255,255,0.3)' }}>
                          {currentHighScore.score}
                        </div>
                        <div className="text-xs font-bold text-neo-black/70 uppercase">
                          {t('common.points') || 'points'}
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-2 text-center">
                        <div className="bg-white/30 rounded-neo px-2 py-1 border-2 border-neo-black/20">
                          <div className="text-lg font-black text-neo-black">{currentHighScore.wordCount}</div>
                          <div className="text-[10px] font-bold text-neo-black/60 uppercase">{t('common.words') || 'words'}</div>
                        </div>
                        <div className="bg-white/30 rounded-neo px-2 py-1 border-2 border-neo-black/20">
                          <div className="text-sm font-black text-neo-black uppercase truncate">{currentHighScore.longestWord}</div>
                          <div className="text-[10px] font-bold text-neo-black/60 uppercase">{t('challenge.longest') || 'longest'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-neo-black/20 flex items-center justify-center gap-2 text-xs font-bold text-neo-black/70">
                      <Target className="w-3 h-3" />
                      <span>{t('challenge.beatIt') || 'Can you beat it?'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gradient-to-br from-neo-cyan/30 to-cyan-200/30 dark:from-neo-cyan/20 dark:to-cyan-600/20 rounded-neo-lg border-3 border-dashed border-neo-cyan dark:border-neo-cyan/50 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-neo-cyan" />
                    <span className="font-black uppercase text-sm text-neo-black dark:text-neo-white">
                      {t('challenge.noRecord') || 'No Record Yet'}
                    </span>
                  </div>
                  <p className="text-sm text-neo-black/60 dark:text-neo-white/60">
                    {t('challenge.setFirst') || 'Set your first high score and start competing against yourself!'}
                  </p>
                </div>
              )}

              {/* Progress Stats */}
              {progressStats.totalGames > 0 && (
                <div className="mt-3 flex items-center justify-center gap-4 text-xs text-neo-black/60 dark:text-neo-white/60">
                  <span className="flex items-center gap-1">
                    <FaFire className="text-neo-orange" />
                    {progressStats.highScoreBeats} {t('challenge.recordsSet') || 'records set'}
                  </span>
                  <span>•</span>
                  <span>{progressStats.totalGames} {t('challenge.gamesPlayed') || 'games played'}</span>
                </div>
              )}

              {/* All-Time Best (if different from current config) */}
              {allTimeBest && currentHighScore && allTimeBest.score > currentHighScore.score && (
                <div className="mt-2 text-center text-xs text-neo-black/50 dark:text-neo-white/50">
                  <span className="flex items-center justify-center gap-1">
                    <FaCrown className="text-neo-yellow text-sm" />
                    {t('challenge.allTimeBest') || 'All-time best'}: <span className="font-black">{allTimeBest.score}</span>
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* Bot config for solo-bots mode */}
          {mode === 'solo-bots' && (
            <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-neo border-2 border-neo-black/20 dark:border-slate-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold flex items-center gap-2 text-neo-black dark:text-neo-white">
                  <FaRobot />
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
                    <FaPlus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {bots.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {bots.map(bot => (
                    <Badge
                      key={bot.id}
                      variant="secondary"
                      className={cn('text-xs', BOT_DIFFICULTY_CONFIG[bot.difficulty].color)}
                    >
                      {bot.name}
                      <button onClick={() => removeBot(bot.id)} className="ml-1 hover:text-neo-red">
                        <FaTimes className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neo-black/50 italic">
                  {t('singlePlayer.noBots') || 'Tap + to add bot opponents'}
                </p>
              )}
            </div>
          )}

          {/* Timer display for non-practice modes */}
          {mode !== 'practice' && (
            <div className="flex items-center justify-between text-sm mb-4">
              <span className="text-neo-black/60 dark:text-neo-white/60">
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
                        ? 'bg-neo-cyan border-neo-cyan'
                        : 'bg-white dark:bg-slate-600 dark:text-neo-white border-neo-black/20 dark:border-slate-500 hover:bg-neo-cyan/20 dark:hover:bg-neo-cyan/30'
                    )}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Language Selection - Always visible */}
          <div className="mb-4">
            <LanguageSelector
              selectedLanguage={gameLanguage}
              onLanguageChange={setGameLanguage}
            />
          </div>

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-neo-black/60 dark:text-neo-white/60 hover:text-neo-black dark:hover:text-neo-white transition-colors"
          >
            <FaCog className={cn('transition-transform', showAdvanced && 'rotate-90')} />
            {t('common.advancedSettings') || 'Advanced Settings'}
            <FaChevronDown className={cn('transition-transform', showAdvanced && 'rotate-180')} />
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
                  {/* Difficulty/Grid Size Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wide text-neo-black/70 dark:text-neo-white/70">
                      {t('singlePlayer.selectDifficulty') || 'Grid Size'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['EASY', 'MEDIUM', 'HARD'] as DifficultyLevel[]).map(level => {
                        const config = DIFFICULTIES[level];
                        const isSelected = difficulty === level;
                        return (
                          <button
                            key={level}
                            onClick={() => setDifficulty(level)}
                            className={cn(
                              'p-2 rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all text-center',
                              isSelected
                                ? 'bg-neo-yellow shadow-hard-pressed translate-x-[1px] translate-y-[1px] text-neo-black'
                                : 'bg-white dark:bg-slate-600 shadow-hard hover:shadow-hard-lg text-neo-black dark:text-neo-white'
                            )}
                          >
                            <div className="font-bold uppercase text-xs">
                              {t(config.nameKey) || level}
                            </div>
                            <div className="text-xs text-neo-black/60 dark:text-neo-white/60">
                              {config.rows}x{config.cols}
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
        className="w-full text-lg py-6 shadow-hard hover:shadow-hard-lg"
        onClick={handleStartGame}
      >
        <FaPlay className="mr-2" />
        {t('singlePlayer.startGame') || 'Start Game'}
      </Button>
    </motion.div>
  );
};

export default SinglePlayerLobby;
