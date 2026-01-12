import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Settings, Plus, Minus, Crown, ChevronDown, ChevronUp, Bot, Check, Monitor, Info, MessageSquare, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import SlotMachineText from '../../components/SlotMachineText';
import Avatar from '../../components/Avatar';
import RoomChat from '../../components/RoomChat';
import PresenceIndicator from '../../components/PresenceIndicator';
import BotControls from '../../components/BotControls';
import GameRoomHeader from '../../components/game/GameRoomHeader';
import CrazyGamesBanner from '../../components/CrazyGamesBanner';
import { useCrazyGamesInvite } from '../../hooks/useCrazyGamesInvite';
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
  onRegenerateBoard?: () => void;

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

// Mobile tab type
type MobileTab = 'settings' | 'players' | 'chat';

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
  onRegenerateBoard,

  // Loading states
  tournamentCreating,
}): React.ReactElement => {
  const { socket } = useSocket();
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  // Default to 'party' preset (Standard: 2min, MEDIUM difficulty) for balanced gameplay
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('party');
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<MobileTab>('settings');
  // Unread chat messages count
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // CrazyGames invite button integration
  const { showInviteButton, hideInviteButton, isInviteButtonVisible } = useCrazyGamesInvite();

  // Show CrazyGames invite button when in lobby
  useEffect(() => {
    if (gameCode) {
      showInviteButton(gameCode);
    }
    return () => {
      if (isInviteButtonVisible) {
        hideInviteButton();
      }
    };
  }, [gameCode, showInviteButton, hideInviteButton, isInviteButtonVisible]);

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


  return (
    <div className="flex flex-col gap-2 sm:gap-2 md:gap-3 w-full pb-40 lg:pb-0">
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

      {/* Row 2: Game Settings + Players List (side by side on desktop, tabbed on mobile) */}
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-2 sm:gap-3 md:gap-4">
        {/* Game Settings - LEFT - Neo-Brutalist Dark */}
        <Card className={cn(
          "flex-1 p-2 sm:p-3 md:p-4 bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg",
          mobileTab !== 'settings' && "hidden lg:block"
        )}>
          <h3 className="hidden lg:flex text-sm font-black uppercase text-neo-cream mb-3 items-center gap-2">
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
                  const difficultyName = t(DIFFICULTIES[preset.difficulty].nameKey);
                  // Colorful backgrounds with glow for each preset when selected
                  const presetColors: Record<PresetKey, string> = {
                    fast: 'bg-neo-cyan border-neo-cyan shadow-[0_0_20px_rgba(0,255,255,0.5),0_0_40px_rgba(0,255,255,0.3)]',
                    easy: 'bg-neo-lime border-neo-lime shadow-[0_0_20px_rgba(192,255,62,0.5),0_0_40px_rgba(192,255,62,0.3)]',
                    party: 'bg-neo-yellow border-neo-yellow shadow-[0_0_20px_rgba(255,224,102,0.5),0_0_40px_rgba(255,224,102,0.3)]',
                    challenge: 'bg-neo-pink border-neo-pink shadow-[0_0_20px_rgba(255,20,147,0.5),0_0_40px_rgba(255,20,147,0.3)]',
                  };
                  return (
                    <motion.button
                      key={key}
                      onClick={() => handleApplyPreset(key)}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "relative flex-1 min-w-[90px] px-2 py-2 rounded-neo font-bold transition-all duration-150 border-3",
                        isSelected
                          ? `${presetColors[key]} ring-2 ring-white/30 ring-offset-2 ring-offset-slate-800 scale-105 z-10`
                          : "bg-slate-700 border-slate-600 shadow-hard hover:shadow-hard-lg hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] hover:bg-slate-600 hover:border-slate-500"
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
                        <span className={cn(
                          "font-black text-sm uppercase tracking-wide",
                          isSelected ? "text-neo-black" : "text-neo-cream"
                        )}>
                          {t(preset.nameKey) || key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold",
                          isSelected ? "text-neo-black/80" : "text-neo-cream/70"
                        )}>
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

            {/* Broadcast Mode - Subtle Section */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-2 border-t border-neo-cream/20"
            >
              <div className={cn(
                "p-3 rounded-neo border-2 transition-all duration-200",
                !hostPlaying
                  ? "bg-slate-700 border-neo-cream/40"
                  : "bg-slate-700/50 border-slate-600"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-neo border-2 transition-colors",
                    !hostPlaying ? "bg-slate-600 border-neo-cream/30" : "bg-slate-600 border-slate-500"
                  )}>
                    <Monitor className="w-5 h-5 text-neo-cream" />
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
                        <Info className="w-4 h-4 text-neo-cream/70 flex-shrink-0 mt-0.5" />
                        <span className="text-xs font-medium text-neo-cream/70">
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
              className="w-full flex items-center justify-between py-2 px-3 rounded-neo border-2 border-neo-cream/30 hover:border-neo-cream/60 bg-neo-cream/10 hover:bg-neo-cream/20 text-neo-cream/90 hover:text-neo-cream transition-all duration-100 shadow-hard-sm hover:shadow-hard"
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-xs font-bold uppercase flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" />
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
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-neo-cream flex items-center gap-2">
                      <Clock className="text-neo-cyan text-sm" />
                      {t('hostView.roundDuration')}
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleDecreaseTimer}
                        disabled={timerValue <= 1}
                        className="w-10 h-10 flex items-center justify-center rounded-neo bg-neo-cream text-neo-black border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed font-black"
                      >
                        <Minus size={14} />
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
                        <Plus size={14} />
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

            {/* Start Game Button - Desktop only (inside card) */}
            <div className="pt-3 hidden lg:flex justify-center gap-2">
              {onRegenerateBoard && (
                <Button
                  onClick={onRegenerateBoard}
                  disabled={tournamentCreating}
                  className="h-14 px-4 bg-slate-600 text-neo-white font-bold uppercase border-3 border-neo-black shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-slate-500 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('hostView.regenerateBoard') || 'Regenerate Board'}
                >
                  <RefreshCw className="w-5 h-5" />
                </Button>
              )}
              <Button
                onClick={onStartGame}
                disabled={!timerValue || playersReady.length === 0 || tournamentCreating}
                className="flex-1 max-w-md h-14 text-lg bg-neo-lime text-neo-black font-black uppercase border-3 border-neo-black shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        <Card className={cn(
          "lg:w-[320px] h-auto p-2 sm:p-3 md:p-4 flex flex-col bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg",
          mobileTab === 'players' ? "flex" : "hidden lg:flex"
        )}>
          <h3 className="hidden lg:flex text-sm font-bold uppercase text-neo-cream mb-2 items-center gap-2 flex-shrink-0">
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
                          avatarImage={avatar?.avatarImage}
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
      <div className={cn(
        "w-full lg:max-w-3xl mx-auto",
        mobileTab === 'chat' ? "block" : "hidden lg:block"
      )}>
        <RoomChat
          username="Host"
          isHost={true}
          gameCode={gameCode}
          className="h-full min-h-[240px] max-h-[280px]"
          onNewMessage={() => {
            // Increment unread count if not on chat tab (mobile only)
            if (mobileTab !== 'chat') {
              setUnreadChatCount(prev => prev + 1);
            }
          }}
        />
      </div>

      {/* CrazyGames Banner Ad - Pre-game Lobby */}
      <div className="flex justify-center py-2">
        <CrazyGamesBanner size="728x90" className="hidden lg:block" />
        <CrazyGamesBanner size="320x50" className="lg:hidden" />
      </div>

      {/* Fixed Bottom Bar - Mobile only: Start Button + Tabs */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/98 backdrop-blur-sm border-t-2 border-neo-black z-50 lg:hidden">
        {/* Start Button - Above tabs for prominence */}
        <div className="p-3 pb-2 flex gap-2">
          {onRegenerateBoard && (
            <Button
              onClick={onRegenerateBoard}
              disabled={tournamentCreating}
              className="h-12 px-3 bg-slate-600 text-neo-white font-bold shadow-hard border-2 border-neo-black"
              title={t('hostView.regenerateBoard') || 'Regenerate Board'}
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          )}
          <Button
            onClick={onStartGame}
            disabled={!timerValue || playersReady.length === 0 || tournamentCreating}
            className="flex-1 h-12 text-base bg-neo-lime text-neo-black font-black shadow-hard border-2 border-neo-black"
          >
            {tournamentCreating ? t('hostView.creatingTournament') || 'Creating...' : (
              <>
                🎮 {t('hostView.startGame')}
                {playersReady.length > 0 && (
                  <span className="ml-2 text-sm opacity-75">({playersReady.length})</span>
                )}
              </>
            )}
          </Button>
        </div>
        {/* Bottom Tabs */}
        <div className="flex border-t border-slate-700">
          <button
            type="button"
            onClick={() => setMobileTab('settings')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 font-bold text-xs uppercase transition-all duration-150",
              mobileTab === 'settings'
                ? "bg-slate-800 text-neo-cream border-t-2 border-neo-lime"
                : "bg-transparent text-neo-cream/60 hover:text-neo-cream hover:bg-slate-800/50"
            )}
          >
            <Settings size={16} />
            <span className="hidden xs:inline">{t('hostView.settings') || 'Settings'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('players')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 font-bold text-xs uppercase transition-all duration-150",
              mobileTab === 'players'
                ? "bg-slate-800 text-neo-cream border-t-2 border-neo-pink"
                : "bg-transparent text-neo-cream/60 hover:text-neo-cream hover:bg-slate-800/50"
            )}
          >
            <Users size={16} />
            <span className="hidden xs:inline">{t('hostView.players') || 'Players'}</span>
            {playersReady.length > 0 && (
              <span className={cn(
                "min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-black",
                mobileTab === 'players'
                  ? "bg-neo-pink text-neo-white"
                  : "bg-neo-lime text-neo-black"
              )}>
                {playersReady.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileTab('chat');
              setUnreadChatCount(0);
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 font-bold text-xs uppercase transition-all duration-150",
              mobileTab === 'chat'
                ? "bg-slate-800 text-neo-cream border-t-2 border-neo-cyan"
                : "bg-transparent text-neo-cream/60 hover:text-neo-cream hover:bg-slate-800/50"
            )}
          >
            <div className="relative">
              <MessageSquare size={16} />
              {unreadChatCount > 0 && mobileTab !== 'chat' && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 flex items-center justify-center bg-neo-red text-neo-white text-[10px] font-black rounded-full border-2 border-neo-black"
                >
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </motion.span>
              )}
            </div>
            <span className="hidden xs:inline">{t('hostView.chat') || 'Chat'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostPreGameView;
