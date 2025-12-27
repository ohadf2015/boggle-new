'use client';

import React, { memo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaClock, FaCog, FaPlus, FaMinus, FaChevronDown, FaChevronUp, FaCheck, FaPlay, FaStop } from 'react-icons/fa';
import type { Socket } from 'socket.io-client';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Checkbox } from '../../../components/ui/checkbox';
import { Switch } from '../../../components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import GameTypeSelector from '../../../components/GameTypeSelector';
import BotControls from '../../../components/BotControls';
import { useAutoFillBots } from '../../../hooks/useAutoFillBots';
import { DIFFICULTIES, MIN_WORD_LENGTH_OPTIONS, getRecommendedTimer } from '../../../utils/consts';
import { cn } from '../../../lib/utils';
import type { DifficultyLevel, Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';

interface PlayerData {
  username: string;
  avatar?: AvatarType | null;
  isHost?: boolean;
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
  isBot?: boolean;
  presence?: 'active' | 'idle' | 'afk';
  disconnected?: boolean;
}

interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
  standings?: unknown[];
  isComplete?: boolean;
}

interface GameSettingsPanelProps {
  // Timer
  timerValue: number;
  setTimerValue: React.Dispatch<React.SetStateAction<number>>;
  timerDirection: number;
  setTimerDirection: React.Dispatch<React.SetStateAction<number>>;

  // Game type
  gameType: 'regular' | 'tournament';
  setGameType: React.Dispatch<React.SetStateAction<'regular' | 'tournament'>>;
  tournamentRounds: number;
  setTournamentRounds: React.Dispatch<React.SetStateAction<number>>;
  tournamentData: TournamentData | null;

  // Difficulty
  difficulty: DifficultyLevel;
  setDifficulty: React.Dispatch<React.SetStateAction<DifficultyLevel>>;

  // Word length
  minWordLength: number;
  setMinWordLength: React.Dispatch<React.SetStateAction<number>>;

  // Host playing
  hostPlaying: boolean;
  setHostPlaying: React.Dispatch<React.SetStateAction<boolean>>;

  // Bots
  socket: Socket | null;
  gameCode: string;
  players: (string | PlayerData)[];

  // Actions
  onStartGame: () => void;
  onCancelTournament: () => void;

  // States
  tournamentCreating: boolean;

  // Translation
  t: (path: string, params?: Record<string, string | number>) => string;
}

/**
 * GameSettingsPanel - All game configuration options
 */
export const GameSettingsPanel = memo<GameSettingsPanelProps>(({
  timerValue,
  setTimerValue,
  timerDirection,
  setTimerDirection,
  gameType,
  setGameType,
  tournamentRounds,
  setTournamentRounds,
  tournamentData,
  difficulty,
  setDifficulty,
  minWordLength,
  setMinWordLength,
  hostPlaying,
  setHostPlaying,
  socket,
  gameCode,
  players,
  onStartGame,
  onCancelTournament,
  tournamentCreating,
  t,
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Auto-start functionality
  const {
    autoStartEnabled,
    countdown,
    toggleAutoStart,
    cancelAutoStart,
    isReadyToAutoStart,
  } = useAutoFillBots({
    socket,
    enabled: true,
    currentPlayerCount: players.length,
  });

  const handleDecreaseTimer = useCallback(() => {
    setTimerDirection(-1);
    setTimerValue(prev => Math.max(1, prev - 1));
  }, [setTimerDirection, setTimerValue]);

  const handleIncreaseTimer = useCallback(() => {
    setTimerDirection(1);
    setTimerValue(prev => Math.min(10, prev + 1));
  }, [setTimerDirection, setTimerValue]);

  const handleSetDifficulty = useCallback((key: DifficultyLevel) => {
    setDifficulty(key);
    const recommendedSeconds = getRecommendedTimer(key);
    const recommendedMinutes = Math.round(recommendedSeconds / 60);
    setTimerValue(recommendedMinutes);
    setTimerDirection(0);
  }, [setDifficulty, setTimerValue, setTimerDirection]);

  const handleSetMinWordLength = useCallback((value: number) => {
    setMinWordLength(value);
  }, [setMinWordLength]);

  const playerDataOnly = players.filter((p): p is PlayerData => typeof p !== 'string');

  return (
    <Card className="flex-1 p-3 sm:p-4 bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg">
      <h3 className="text-sm font-black uppercase text-neo-cream mb-3 flex items-center gap-2">
        <FaCog className="text-neo-cyan text-xs" />
        {t('hostView.gameSettings')}
      </h3>
      <div className="w-full space-y-3">
        {/* Game Type Selector - First for logical flow */}
        <GameTypeSelector
          gameType={gameType}
          setGameType={setGameType}
          tournamentRounds={tournamentRounds}
          setTournamentRounds={setTournamentRounds}
        />

        {/* Timer Input - Compact */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase text-neo-cream/80 flex items-center gap-1.5">
            <FaClock className="text-neo-cyan text-xs" />
            {t('hostView.roundDuration')}
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDecreaseTimer}
              disabled={timerValue <= 1}
              aria-label={t('hostView.decreaseTimer') || 'Decrease timer'}
              className="w-8 h-8 flex items-center justify-center rounded-neo bg-neo-cream text-neo-black border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed font-black"
            >
              <FaMinus size={12} aria-hidden="true" />
            </button>

            <div className="flex items-center gap-1.5">
              <div className="text-2xl font-black text-neo-yellow w-8 text-center overflow-hidden h-8 flex items-center justify-center">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={timerValue}
                    initial={{ y: timerDirection > 0 ? 16 : -16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: timerDirection > 0 ? -16 : 16, opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                  >
                    {timerValue}
                  </motion.span>
                </AnimatePresence>
              </div>
              <span className="text-sm text-neo-cream font-bold">{t('hostView.minutes')}</span>
            </div>

            <button
              type="button"
              onClick={handleIncreaseTimer}
              disabled={timerValue >= 10}
              aria-label={t('hostView.increaseTimer') || 'Increase timer'}
              className="w-8 h-8 flex items-center justify-center rounded-neo bg-neo-cream text-neo-black border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed font-black"
            >
              <FaPlus size={12} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* More Settings Toggle - Combines Bots + Advanced */}
        <button
          type="button"
          onClick={() => setShowAdvancedSettings(prev => !prev)}
          aria-expanded={showAdvancedSettings}
          aria-controls="more-settings-panel"
          className="w-full flex items-center justify-between py-1.5 text-neo-cream/70 hover:text-neo-cream transition-colors duration-100 border-t border-neo-cream/10 pt-3"
        >
          <span className="text-xs font-bold uppercase flex items-center gap-2">
            {t('hostView.moreSettings') || t('hostView.advancedSettings')}
            {playerDataOnly.filter(p => p.isBot).length > 0 && (
              <span className="bg-neo-cyan text-neo-black text-[10px] px-1.5 py-0.5 rounded font-bold">
                {playerDataOnly.filter(p => p.isBot).length} {t('bots.title') || 'bots'}
              </span>
            )}
          </span>
          {showAdvancedSettings ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
        </button>

        {/* Collapsible More Settings - Bots + Advanced combined */}
        <AnimatePresence>
          {showAdvancedSettings && (
            <motion.div
              id="more-settings-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 bg-neo-black/20 text-white rounded-neo p-3 border border-neo-cream/10">
                {/* Difficulty Selection - Compact */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-neo-cream/80">
                    {t('hostView.difficulty')}
                  </label>
                  <TooltipProvider delayDuration={300}>
                    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('hostView.difficulty')}>
                      {(Object.keys(DIFFICULTIES) as DifficultyLevel[]).map((key) => {
                        const isSelected = difficulty === key;
                        const difficultyConfig = DIFFICULTIES[key];
                        const recommendedMinutes = Math.round(getRecommendedTimer(key) / 60);
                        const difficultyColors: Record<string, string> = {
                          EASY: 'bg-neo-lime',
                          MEDIUM: 'bg-neo-orange',
                          HARD: 'bg-neo-red text-neo-white',
                        };
                        return (
                          <Tooltip key={key}>
                            <TooltipTrigger asChild>
                              <motion.button
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() => handleSetDifficulty(key)}
                                whileTap={{ scale: 0.95 }}
                                className={cn(
                                  "relative px-2 py-1.5 rounded-neo font-bold transition-all duration-100 border-2 text-xs flex items-center gap-1",
                                  isSelected
                                    ? `${difficultyColors[key] || 'bg-neo-cyan'} border-neo-black ring-2 ring-neo-white ring-offset-1 ring-offset-neo-black shadow-none`
                                    : "bg-neo-cream text-neo-black border-neo-black shadow-hard-sm hover:shadow-hard"
                                )}
                              >
                                {isSelected && (
                                  <FaCheck className="text-[10px]" aria-hidden="true" />
                                )}
                                <span className="font-black">{t(difficultyConfig.nameKey)}</span>
                                <span className="text-[10px] font-bold opacity-70">
                                  {difficultyConfig.rows}x{difficultyConfig.cols}
                                </span>
                              </motion.button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-center">
                              <p className="font-black">{t(difficultyConfig.nameKey)}</p>
                              <p className="text-xs opacity-80">
                                {t('hostView.difficultyTooltipGrid', { rows: difficultyConfig.rows, cols: difficultyConfig.cols }) || `${difficultyConfig.rows}×${difficultyConfig.cols} grid`}
                              </p>
                              <p className="text-xs opacity-80">
                                {t('hostView.difficultyTooltipTimer', { minutes: recommendedMinutes }) || `${recommendedMinutes} min recommended`}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TooltipProvider>
                </div>

                {/* Minimum Word Length - Compact inline */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-neo-cream/80">
                    {t('hostView.minWordLength') || 'Min Word Length'}
                  </label>
                  <div className="flex gap-1.5" role="radiogroup" aria-label={t('hostView.minWordLength') || 'Minimum Word Length'}>
                    {MIN_WORD_LENGTH_OPTIONS.map((option) => {
                      const isSelected = minWordLength === option.value;
                      return (
                        <motion.button
                          key={option.value}
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => handleSetMinWordLength(option.value)}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            "px-3 py-1.5 rounded-neo font-bold transition-all duration-100 border-2 border-neo-black text-xs",
                            isSelected
                              ? "bg-neo-cyan text-neo-black shadow-none translate-x-[1px] translate-y-[1px]"
                              : "bg-neo-cream text-neo-black shadow-hard-sm hover:shadow-hard"
                          )}
                        >
                          {t(option.labelKey) || `${option.value}`}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Host Play Option - Compact */}
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="hostPlays"
                    checked={hostPlaying}
                    onCheckedChange={(checked) => setHostPlaying(checked === true)}
                  />
                  <label htmlFor="hostPlays" className="text-xs font-bold text-neo-cream cursor-pointer">
                    {t('hostView.hostPlays')}
                  </label>
                </div>

                {/* Auto-start toggle */}
                <div className="pt-2 border-t border-neo-cream/10">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <FaPlay className="text-neo-lime text-xs" />
                      <span className="text-xs font-bold text-neo-cream/80">
                        {t('bots.autoStart') || 'Auto-start after 30s'}
                      </span>
                    </div>
                    <Switch
                      checked={autoStartEnabled}
                      onCheckedChange={toggleAutoStart}
                      disabled={!isReadyToAutoStart}
                      className="data-[state=checked]:bg-neo-lime"
                    />
                  </div>

                  {/* Countdown display */}
                  <AnimatePresence>
                    {countdown !== null && countdown > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center justify-between bg-neo-lime/20 rounded-neo px-2 py-1.5 border border-neo-lime/30 mt-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-neo-lime text-neo-black border-2 border-neo-black flex items-center justify-center">
                              <span className="font-black text-neo-black text-sm">{countdown}</span>
                            </div>
                            {/* Circular progress indicator */}
                            <svg
                              className="absolute inset-0 w-8 h-8 -rotate-90"
                              viewBox="0 0 32 32"
                            >
                              <circle
                                cx="16"
                                cy="16"
                                r="14"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeDasharray={`${(countdown / 30) * 88} 88`}
                                className="text-neo-lime"
                              />
                            </svg>
                          </div>
                          <span className="text-[10px] font-bold text-neo-cream">
                            {t('bots.startingIn') || 'Starting in...'}
                          </span>
                        </div>
                        <motion.button
                          type="button"
                          onClick={cancelAutoStart}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-1 px-2 py-1 rounded-neo text-[10px] font-bold bg-neo-red text-white border-2 border-neo-black shadow-hard-sm hover:shadow-hard transition-all"
                        >
                          <FaStop size={8} />
                          {t('bots.cancel') || 'Cancel'}
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Info text when not ready for auto-start */}
                  {autoStartEnabled && !isReadyToAutoStart && (
                    <p className="text-[10px] text-neo-cream/50 text-center mt-1">
                      {t('bots.waitingForPlayers') || 'Waiting for at least 2 players...'}
                    </p>
                  )}
                </div>

                {/* Cancel Tournament Button */}
                {tournamentData && (
                  <Button
                    onClick={onCancelTournament}
                    className="w-full bg-neo-red text-neo-white text-xs py-1.5"
                  >
                    {t('hostView.cancelTournament') || 'Cancel Tournament'}
                  </Button>
                )}

                {/* Bot Controls - Integrated */}
                <div className="pt-2 border-t border-neo-cream/10">
                  <BotControls
                    socket={socket}
                    gameCode={gameCode}
                    players={playerDataOnly}
                    disabled={false}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Button - Compact */}
        <div className="pt-1 flex justify-center">
          <Button
            onClick={onStartGame}
            disabled={!timerValue || players.length === 0 || tournamentCreating}
            className="w-full max-w-xs h-10 text-sm bg-neo-lime text-neo-black font-black"
          >
            {tournamentCreating ? t('hostView.creatingTournament') || 'Creating...' : t('hostView.startGame')}
          </Button>
        </div>
      </div>
    </Card>
  );
});

GameSettingsPanel.displayName = 'GameSettingsPanel';

export default GameSettingsPanel;
