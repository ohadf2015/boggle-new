'use client';

import React, { memo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaClock, FaCog, FaPlus, FaMinus, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import type { Socket } from 'socket.io-client';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Checkbox } from '../../../components/ui/checkbox';
import GameTypeSelector from '../../../components/GameTypeSelector';
import BotControls from '../../../components/BotControls';
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
    <Card className="flex-1 p-3 sm:p-4 md:p-5 bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg">
      <h3 className="text-base font-black uppercase text-neo-cream mb-4 flex items-center gap-2">
        <FaCog className="text-neo-cyan text-sm" />
        {t('hostView.gameSettings')}
      </h3>
      <div className="w-full space-y-3 sm:space-y-4">
        {/* Timer Input */}
        <div className="space-y-2">
          <label className="text-sm font-bold uppercase text-neo-cream flex items-center gap-2">
            <FaClock className="text-neo-cyan text-sm" />
            {t('hostView.roundDuration')}
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDecreaseTimer}
              disabled={timerValue <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-neo bg-neo-cream text-neo-black border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed font-black"
            >
              <FaMinus size={14} />
            </button>

            <div className="flex items-center gap-2">
              <div className="text-3xl font-black text-neo-yellow w-12 text-center overflow-hidden h-10 flex items-center justify-center">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={timerValue}
                    initial={{ y: timerDirection > 0 ? 20 : -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: timerDirection > 0 ? -20 : 20, opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                  >
                    {timerValue}
                  </motion.span>
                </AnimatePresence>
              </div>
              <span className="text-base text-neo-cream font-bold">{t('hostView.minutes')}</span>
            </div>

            <button
              type="button"
              onClick={handleIncreaseTimer}
              disabled={timerValue >= 10}
              className="w-10 h-10 flex items-center justify-center rounded-neo bg-neo-cream text-neo-black border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed font-black"
            >
              <FaPlus size={14} />
            </button>
          </div>
        </div>

        {/* Game Type Selector */}
        <GameTypeSelector
          gameType={gameType}
          setGameType={setGameType}
          tournamentRounds={tournamentRounds}
          setTournamentRounds={setTournamentRounds}
        />

        {/* Bot Controls */}
        <div className="pt-2 border-t border-neo-cream/20">
          <BotControls
            socket={socket}
            gameCode={gameCode}
            players={playerDataOnly}
            disabled={false}
          />
        </div>

        {/* Advanced Settings Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvancedSettings(prev => !prev)}
          className="w-full flex items-center justify-between py-2 text-neo-cream/70 hover:text-neo-cream transition-colors duration-100"
        >
          <span className="text-sm font-bold uppercase">
            {t('hostView.advancedSettings')}
          </span>
          {showAdvancedSettings ? <FaChevronUp /> : <FaChevronDown />}
        </button>

        {/* Collapsible Advanced Settings */}
        <AnimatePresence>
          {showAdvancedSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden space-y-4"
            >
              {/* Host Play Option */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id="hostPlays"
                  checked={hostPlaying}
                  onCheckedChange={(checked) => setHostPlaying(checked === true)}
                />
                <label htmlFor="hostPlays" className="text-sm font-bold text-neo-cream cursor-pointer">
                  {t('hostView.hostPlays')}
                </label>
              </div>

              {/* Cancel Tournament Button */}
              {tournamentData && (
                <Button
                  onClick={onCancelTournament}
                  className="w-full bg-neo-red text-neo-white text-xs py-2"
                >
                  {t('hostView.cancelTournament') || 'Cancel Tournament'}
                </Button>
              )}

              {/* Difficulty Selection */}
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase text-neo-cream">
                  {t('hostView.difficulty')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(DIFFICULTIES) as DifficultyLevel[]).map((key) => {
                    const isSelected = difficulty === key;
                    const difficultyColors: Record<string, string> = {
                      easy: 'bg-neo-lime',
                      normal: 'bg-neo-yellow',
                      medium: 'bg-neo-orange',
                      hard: 'bg-neo-red text-neo-white',
                      extreme: 'bg-neo-purple text-neo-white'
                    };
                    return (
                      <motion.button
                        key={key}
                        onClick={() => handleSetDifficulty(key)}
                        whileHover={{ x: -1, y: -1 }}
                        whileTap={{ x: 2, y: 2 }}
                        className={cn(
                          "px-3 py-2 rounded-neo font-bold transition-all duration-100 border-3 border-neo-black",
                          isSelected
                            ? `${difficultyColors[key] || 'bg-neo-cyan'} shadow-none translate-x-[2px] translate-y-[2px]`
                            : "bg-neo-cream text-neo-black shadow-hard-sm hover:shadow-hard"
                        )}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-black text-sm">{t(DIFFICULTIES[key].nameKey)}</span>
                          <span className="text-xs font-bold opacity-80">
                            ({DIFFICULTIES[key].rows}x{DIFFICULTIES[key].cols})
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Minimum Word Length Selection */}
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase text-neo-cream">
                  {t('hostView.minWordLength') || 'Minimum Word Length'}
                </label>
                <div className="flex gap-2">
                  {MIN_WORD_LENGTH_OPTIONS.map((option) => {
                    const isSelected = minWordLength === option.value;
                    return (
                      <motion.button
                        key={option.value}
                        onClick={() => handleSetMinWordLength(option.value)}
                        whileHover={{ x: -1, y: -1 }}
                        whileTap={{ x: 2, y: 2 }}
                        className={cn(
                          "px-4 py-2 rounded-neo font-bold transition-all duration-100 border-3 border-neo-black",
                          isSelected
                            ? "bg-neo-cyan text-neo-black shadow-none translate-x-[2px] translate-y-[2px]"
                            : "bg-neo-cream text-neo-black shadow-hard-sm hover:shadow-hard"
                        )}
                      >
                        {t(option.labelKey) || `${option.value} letters`}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Button */}
        <div className="pt-2 flex justify-center">
          <Button
            onClick={onStartGame}
            disabled={!timerValue || players.length === 0 || tournamentCreating}
            className="w-full max-w-xs h-11 text-base bg-neo-lime text-neo-black"
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
