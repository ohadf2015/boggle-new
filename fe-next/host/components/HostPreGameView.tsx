import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Settings, Plus, Minus, Crown, ChevronDown, ChevronUp, Bot, Check, Monitor, Info } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import SlotMachineText from '../../components/SlotMachineText';
import Avatar from '../../components/Avatar';
import RoomChat from '../../components/RoomChat';
import PresenceIndicator from '../../components/PresenceIndicator';
import BotControls from '../../components/BotControls';
import GameRoomHeader from '../../components/game/GameRoomHeader';
import { DIFFICULTIES, MIN_WORD_LENGTH_OPTIONS, getRecommendedTimer } from '../../utils/consts';
import { cn } from '../../lib/utils';
import { useSocket } from '../../utils/SocketContext';
import { neoInfoToast } from '../../components/NeoToast';
import type { Language, LetterGrid, Avatar as AvatarType, PresenceStatus, DifficultyLevel } from '@/shared/types/game';

// ==================== Types ====================

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

interface GridPosition {
  row: number;
  col: number;
}

interface HostPreGameViewProps {
  // Core props
  gameCode: string;
  roomLanguage: Language;
  language: Language;
  username: string;
  t: (path: string, params?: Record<string, string | number>) => string;

  // Game settings
  timerValue: number;
  setTimerValue: React.Dispatch<React.SetStateAction<number>>;
  timerDirection: number;
  setTimerDirection: React.Dispatch<React.SetStateAction<number>>;
  difficulty: DifficultyLevel;
  setDifficulty: React.Dispatch<React.SetStateAction<DifficultyLevel>>;
  minWordLength: number;
  setMinWordLength: React.Dispatch<React.SetStateAction<number>>;
  gameType: 'regular' | 'tournament';
  setGameType: React.Dispatch<React.SetStateAction<'regular' | 'tournament'>>;
  tournamentRounds: number;
  setTournamentRounds: React.Dispatch<React.SetStateAction<number>>;
  tournamentData: TournamentData | null;
  hostPlaying: boolean;
  setHostPlaying: React.Dispatch<React.SetStateAction<boolean>>;

  // Players
  playersReady: (string | PlayerData)[];
  playerWordCounts: Record<string, number>;

  // Grid display
  shufflingGrid: LetterGrid | null;
  highlightedCells: GridPosition[];
  tableData: LetterGrid;

  // Actions
  onStartGame: () => void;
  onExitRoom: () => void;
  onCancelTournament: () => void;

  // Loading states
  tournamentCreating: boolean;
}

// ==================== Component ====================

// Game presets for quick setup
const GAME_PRESETS = {
  fast: {
    nameKey: 'hostView.presetFast',
    icon: '⚡',
    timer: 1,
    difficulty: 'MEDIUM' as DifficultyLevel,
    minWordLength: 2,
    description: 'hostView.presetFastDesc',
  },
  easy: {
    nameKey: 'hostView.presetEasy',
    icon: '🌱',
    timer: 2,
    difficulty: 'EASY' as DifficultyLevel,
    minWordLength: 2,
    description: 'hostView.presetEasyDesc',
  },
  party: {
    nameKey: 'hostView.presetParty',
    icon: '🎉',
    timer: 2,
    difficulty: 'MEDIUM' as DifficultyLevel,
    minWordLength: 2,
    description: 'hostView.presetPartyDesc',
  },
  challenge: {
    nameKey: 'hostView.presetChallenge',
    icon: '🏆',
    timer: 3,
    difficulty: 'HARD' as DifficultyLevel,
    minWordLength: 3,
    description: 'hostView.presetChallengeDesc',
  },
} as const;

type PresetKey = keyof typeof GAME_PRESETS;

const HostPreGameView: React.FC<HostPreGameViewProps> = ({
  // Core props
  gameCode,
  roomLanguage,
  language,
  username,
  t,

  // Game settings
  timerValue,
  setTimerValue,
  timerDirection,
  setTimerDirection,
  difficulty,
  setDifficulty,
  minWordLength,
  setMinWordLength,
  gameType,
  setGameType,
  tournamentRounds,
  setTournamentRounds,
  tournamentData,
  hostPlaying,
  setHostPlaying,

  // Players
  playersReady,
  playerWordCounts,

  // Grid display
  shufflingGrid,
  highlightedCells,
  tableData,

  // Actions
  onStartGame,
  onExitRoom,
  onCancelTournament,

  // Loading states
  tournamentCreating,
}): React.ReactElement => {
  const { socket } = useSocket();
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  // Default to 'party' preset (Standard: 2min, MEDIUM difficulty) for balanced gameplay
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('party');
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);

  // Apply default preset on mount
  React.useEffect(() => {
    if (!hasInitialized) {
      const defaultPreset = GAME_PRESETS['party'];
      setTimerValue(defaultPreset.timer);
      setDifficulty(defaultPreset.difficulty);
      setMinWordLength(defaultPreset.minWordLength);
      setHasInitialized(true);
    }
  }, [hasInitialized, setTimerValue, setDifficulty, setMinWordLength]);

  const handleDecreaseTimer = useCallback(() => {
    setTimerDirection(-1);
    setTimerValue(prev => Math.max(1, prev - 1));
  }, [setTimerDirection, setTimerValue]);

  const handleIncreaseTimer = useCallback(() => {
    setTimerDirection(1);
    setTimerValue(prev => Math.min(10, prev + 1));
  }, [setTimerDirection, setTimerValue]);

  const handleToggleAdvancedSettings = useCallback(() => {
    setShowAdvancedSettings(prev => !prev);
  }, []);

  const handleSetDifficulty = useCallback((key: DifficultyLevel) => {
    setDifficulty(key);
    // Auto-adjust timer to recommended value for this difficulty
    const recommendedSeconds = getRecommendedTimer(key);
    const recommendedMinutes = Math.round(recommendedSeconds / 60);
    setTimerValue(recommendedMinutes);
    setTimerDirection(0); // Reset animation direction
  }, [setDifficulty, setTimerValue, setTimerDirection]);

  const handleSetMinWordLength = useCallback((value: number) => {
    setMinWordLength(value);
  }, [setMinWordLength]);

  // Apply preset configuration
  const handleApplyPreset = useCallback((presetKey: PresetKey) => {
    const preset = GAME_PRESETS[presetKey];
    setTimerValue(preset.timer);
    setDifficulty(preset.difficulty);
    setMinWordLength(preset.minWordLength);
    setTimerDirection(0);
    setSelectedPreset(presetKey);
  }, [setTimerValue, setDifficulty, setMinWordLength, setTimerDirection]);

  // Sticky start button visibility state
  const [showStickyStart, setShowStickyStart] = useState<boolean>(false);
  const startButtonRef = React.useRef<HTMLDivElement>(null);

  // Track if we've shown the broadcast mode suggestion
  const hasShownBroadcastSuggestion = useRef<boolean>(false);

  // Show broadcast mode suggestion when room reaches 4+ players (only once per session)
  useEffect(() => {
    if (playersReady.length >= 4 && !hasShownBroadcastSuggestion.current && hostPlaying) {
      hasShownBroadcastSuggestion.current = true;
      neoInfoToast(t('hostView.broadcastSuggestion'), {
        icon: '💡',
        duration: 6000,
        id: 'broadcast-mode-suggestion',
      });
    }
  }, [playersReady.length, hostPlaying, t]);

  // Intersection observer to show sticky button when original is out of view
  React.useEffect(() => {
    if (!startButtonRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyStart(!entry.isIntersecting);
      },
      { threshold: 0.5 }
    );

    observer.observe(startButtonRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 w-full max-w-6xl pb-16 lg:pb-0">
      {/* Row 1: Room Code + Language + Share + Exit */}
      <GameRoomHeader
        gameCode={gameCode}
        roomLanguage={roomLanguage}
        username={username}
        t={t}
        onExitRoom={onExitRoom}
        isHost={true}
        tournamentData={tournamentData}
        showRoomName={true}
      />

      {/* Row 2: Game Settings + Players List (side by side on desktop) */}
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-2 sm:gap-3 md:gap-4">
        {/* Game Settings - LEFT - Neo-Brutalist Dark */}
        <Card className="flex-1 p-2 sm:p-3 md:p-4 bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg">
          <h3 className="text-sm font-black uppercase text-neo-cream mb-3 flex items-center gap-2">
            <Settings className="text-neo-cyan text-xs" />
            {t('hostView.gameSettings')}
          </h3>
          <div className="w-full space-y-2 sm:space-y-3">
            {/* Game Presets - Quick Setup */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-neo-cream">
                {t('hostView.quickSetup') || 'Quick Setup'}
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(GAME_PRESETS) as PresetKey[]).map((key) => {
                  const preset = GAME_PRESETS[key];
                  const isSelected = selectedPreset === key;
                  const presetStyles: Record<PresetKey, { bg: string; ring: string; glow: string }> = {
                    fast: {
                      bg: 'bg-neo-yellow',
                      ring: 'ring-neo-yellow',
                      glow: 'shadow-[0_0_20px_rgba(255,237,0,0.6)]',
                    },
                    easy: {
                      bg: 'bg-neo-lime',
                      ring: 'ring-neo-lime',
                      glow: 'shadow-[0_0_20px_rgba(0,255,127,0.6)]',
                    },
                    party: {
                      bg: 'bg-neo-pink',
                      ring: 'ring-neo-pink',
                      glow: 'shadow-[0_0_20px_rgba(255,20,147,0.6)]',
                    },
                    challenge: {
                      bg: 'bg-neo-orange',
                      ring: 'ring-neo-orange',
                      glow: 'shadow-[0_0_20px_rgba(255,140,0,0.6)]',
                    },
                  };
                  const style = presetStyles[key];
                  const difficultyName = t(DIFFICULTIES[preset.difficulty].nameKey);
                  return (
                    <motion.button
                      key={key}
                      onClick={() => handleApplyPreset(key)}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "relative flex-1 min-w-[90px] px-2 py-2 rounded-neo font-bold transition-all duration-150 border-3 border-neo-black",
                        style.bg,
                        isSelected
                          ? `ring-4 ${style.ring} ring-offset-2 ring-offset-slate-800 ${style.glow} scale-105 z-10`
                          : "shadow-hard hover:shadow-hard-lg hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] opacity-80 hover:opacity-100"
                      )}
                    >
                      {/* Active indicator checkmark */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-neo-black rounded-full flex items-center justify-center border-2 border-neo-white z-20"
                        >
                          <Check className="w-3.5 h-3.5 text-neo-white" strokeWidth={3} />
                        </motion.div>
                      )}
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-xl drop-shadow-sm">{preset.icon}</span>
                        <span className="font-black text-sm text-neo-black uppercase tracking-wide">
                          {t(preset.nameKey) || key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                        <span className="text-[10px] text-neo-black/90 font-bold">
                          {preset.timer} {t('hostView.min')} • {difficultyName}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>


            {/* Bot Controls - Always visible */}
            <div className="pt-2 border-t border-neo-cream/20">
              <BotControls
                socket={socket}
                gameCode={gameCode}
                players={playersReady.filter((p): p is PlayerData => typeof p !== 'string')}
                disabled={false}
              />
            </div>

            {/* Broadcast Mode - Prominent Section */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "pt-2 border-t border-neo-cream/20",
                playersReady.length >= 4 && hostPlaying && "animate-pulse-subtle"
              )}
            >
              <div className={cn(
                "p-3 rounded-neo border-3 transition-all duration-200",
                !hostPlaying
                  ? "bg-neo-cyan/20 border-neo-cyan shadow-hard-sm"
                  : "bg-slate-700/50 border-neo-cream/20"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-neo border-2 border-neo-black transition-colors",
                    !hostPlaying ? "bg-neo-cyan" : "bg-slate-600"
                  )}>
                    <Monitor className={cn(
                      "w-5 h-5",
                      !hostPlaying ? "text-neo-black" : "text-neo-cream"
                    )} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="broadcastMode"
                        checked={!hostPlaying}
                        onCheckedChange={(checked) => setHostPlaying(checked !== true)}
                      />
                      <label
                        htmlFor="broadcastMode"
                        className="text-sm font-black uppercase text-neo-cream cursor-pointer flex-1"
                      >
                        {t('hostView.broadcastModeTitle')}
                      </label>
                    </div>
                    <p className="text-xs text-neo-cream/80 font-medium leading-relaxed pl-8">
                      {t('hostView.broadcastModeDescription')}
                    </p>
                    {playersReady.length >= 4 && hostPlaying && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-start gap-2 pl-8 pt-1"
                      >
                        <Info className="w-4 h-4 text-neo-cyan flex-shrink-0 mt-0.5" />
                        <span className="text-xs font-bold text-neo-cyan">
                          {t('hostView.broadcastModeHint')}
                        </span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Advanced Settings Toggle with Preview */}
            <button
              type="button"
              onClick={handleToggleAdvancedSettings}
              className="w-full flex items-center justify-between py-1.5 text-neo-cream/90 hover:text-neo-cream transition-colors duration-100"
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-xs font-bold uppercase">
                  {t('hostView.advancedSettings')}
                </span>
                {!showAdvancedSettings && (
                  <span className="text-[10px] text-neo-cream/90">
                    {timerValue}min • {t(DIFFICULTIES[difficulty].nameKey)} • {minWordLength}+ {t('hostView.letters') || 'letters'}
                  </span>
                )}
              </div>
              {showAdvancedSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {/* Collapsible Advanced Settings */}
            <AnimatePresence>
              {showAdvancedSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-3"
                >
                  {/* Timer Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-neo-cream flex items-center gap-1.5">
                      <Clock className="text-neo-cyan text-xs" />
                      {t('hostView.roundDuration')}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDecreaseTimer}
                        disabled={timerValue <= 1}
                        className="w-8 h-8 flex items-center justify-center rounded-neo bg-neo-cream text-neo-black border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed font-black"
                      >
                        <Minus size={12} />
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
                        className="w-8 h-8 flex items-center justify-center rounded-neo bg-neo-cream text-neo-black border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed font-black"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Cancel Tournament Button - Only show if tournament has started */}
                  {tournamentData && (
                    <Button
                      onClick={onCancelTournament}
                      className="w-full bg-neo-red text-neo-white text-xs py-2"
                    >
                      {t('hostView.cancelTournament') || 'Cancel Tournament'}
                    </Button>
                  )}

                  {/* Difficulty Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-neo-cream">
                      {t('hostView.difficulty')}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(DIFFICULTIES) as DifficultyLevel[]).map((key) => {
                        const isSelected = difficulty === key;
                        const difficultyColors: Record<string, string> = {
                          EASY: 'bg-neo-lime text-neo-black',
                          NORMAL: 'bg-neo-yellow text-neo-black',
                          MEDIUM: 'bg-neo-orange text-neo-black',
                          HARD: 'bg-neo-red text-neo-white',
                          EXTREME: 'bg-neo-purple text-neo-white'
                        };
                        return (
                          <motion.button
                            key={key}
                            onClick={() => handleSetDifficulty(key)}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                              "px-2 py-1.5 rounded-neo font-bold transition-all duration-100 border-2 border-neo-black text-xs",
                              isSelected
                                ? `${difficultyColors[key] || 'bg-neo-cyan text-neo-black'} shadow-none translate-x-[1px] translate-y-[1px]`
                                : "bg-neo-cream text-neo-black shadow-hard-sm hover:shadow-hard"
                            )}
                          >
                            <span className="font-black">{t(DIFFICULTIES[key].nameKey)}</span>
                            <span className="text-[10px] font-bold opacity-90 ms-1">
                              {DIFFICULTIES[key].rows}x{DIFFICULTIES[key].cols}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Minimum Word Length Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-neo-cream">
                      {t('hostView.minWordLength') || 'Min Word Length'}
                    </label>
                    <div className="flex gap-1.5">
                      {MIN_WORD_LENGTH_OPTIONS.map((option) => {
                        const isSelected = minWordLength === option.value;
                        return (
                          <motion.button
                            key={option.value}
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Start Game Button - PROMINENT HOST-ONLY ACTION */}
            <div ref={startButtonRef} className="pt-3 flex justify-center">
              <Button
                onClick={onStartGame}
                disabled={!timerValue || playersReady.length === 0 || tournamentCreating}
                className="w-full max-w-md h-14 text-lg bg-neo-lime text-neo-black font-black uppercase border-3 border-neo-black shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tournamentCreating ? (t('hostView.creatingTournament') || 'Creating...') : (
                  <>
                    🎮 {t('hostView.startGame') || 'Start Game'}
                    {playersReady.length > 0 && (
                      <span className="ml-2 text-sm opacity-80">({playersReady.length} {t('hostView.players') || 'players'})</span>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Players List - RIGHT */}
        <Card className="lg:w-[320px] h-auto p-2 sm:p-3 md:p-4 flex flex-col bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg">
          <h3 className="text-sm font-bold uppercase text-neo-cream mb-2 flex items-center gap-2 flex-shrink-0">
            <Users className="text-neo-pink" />
            {t('hostView.playersJoined')} ({playersReady.length})
          </h3>
          <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
            <AnimatePresence>
              {playersReady.map((player, index) => {
                const playerUsername = typeof player === 'string' ? player : player.username;
                const avatar = typeof player === 'object' ? player.avatar : null;
                const isHostPlayer = typeof player === 'object' ? player.isHost : false;
                const presenceStatus = typeof player === 'object' ? player.presenceStatus : 'active' as PresenceStatus;
                const isWindowFocused = typeof player === 'object' ? player.isWindowFocused : true;
                const isBot = typeof player === 'object' ? player.isBot : false;
                const isMe = playerUsername === username;

                return (
                  <motion.div
                    key={playerUsername}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 10, opacity: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors",
                        "bg-white/5 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
                          avatarEmoji={avatar?.emoji}
                          avatarImage={avatar?.avatarImage}
                          avatarColor={avatar?.color}
                          size="lg"
                        />
                        <span className="font-medium text-neo-cream">
                          <SlotMachineText text={playerUsername} />
                        </span>
                        {isHostPlayer && <Crown className="text-neo-yellow text-sm" />}
                        {isBot && <Bot className="text-neo-cyan text-sm" />}
                        {isMe && (
                          <span className="text-xs text-neo-cream/90 font-medium">
                            ({t('playerView.me')})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {playerWordCounts && playerWordCounts[playerUsername] !== undefined && (
                          <span className="text-neo-cream/90 text-sm font-medium">
                            {playerWordCounts[playerUsername] || 0}
                          </span>
                        )}
                        {!isMe && !isBot && (
                          <PresenceIndicator
                            status={presenceStatus}
                            isWindowFocused={isWindowFocused}
                            size="lg"
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          {playersReady.length === 0 && (
            <p className="text-sm text-center text-neo-cream/90 font-medium mt-2">
              {t('hostView.waitingForPlayers')}
            </p>
          )}
        </Card>
      </div>

      {/* Row 3: Chat */}
      <div className="w-full max-w-2xl mx-auto">
        <RoomChat
          username="Host"
          isHost={true}
          gameCode={gameCode}
          className="h-full min-h-[240px] max-h-[280px]"
        />
      </div>

      {/* Sticky Start Button - Mobile only, appears when original button is out of view */}
      <AnimatePresence>
        {showStickyStart && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-0 left-0 right-0 p-3 bg-slate-900/95 backdrop-blur-sm border-t-2 border-neo-black z-50 lg:hidden"
          >
            <Button
              onClick={onStartGame}
              disabled={!timerValue || playersReady.length === 0 || tournamentCreating}
              className="w-full h-12 text-base bg-neo-lime text-neo-black font-black shadow-hard border-2 border-neo-black"
            >
              {tournamentCreating ? t('hostView.creatingTournament') || 'Creating...' : t('hostView.startGame')}
              {playersReady.length > 0 && (
                <span className="ml-2 text-sm opacity-75">({playersReady.length} {t('hostView.players')})</span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HostPreGameView;
