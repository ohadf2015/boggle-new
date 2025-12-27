import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaClock, FaUsers, FaQrcode, FaWhatsapp, FaLink, FaCog, FaPlus, FaMinus, FaCrown, FaChevronDown, FaChevronUp, FaTrophy, FaRobot, FaSignOutAlt } from 'react-icons/fa';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import ShareButton from '../../components/ShareButton';
import SlotMachineText from '../../components/SlotMachineText';
import Avatar from '../../components/Avatar';
import RoomChat from '../../components/RoomChat';
import PresenceIndicator from '../../components/PresenceIndicator';
import BotControls from '../../components/BotControls';
import { copyJoinUrl, shareViaWhatsApp } from '../../utils/share';
import { DIFFICULTIES, MIN_WORD_LENGTH_OPTIONS, getRecommendedTimer } from '../../utils/consts';
import { cn } from '../../lib/utils';
import { useSocket } from '../../utils/SocketContext';
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
  onShowQR: () => void;
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
  onShowQR,
  onExitRoom,
  onCancelTournament,

  // Loading states
  tournamentCreating,
}): React.ReactElement => {
  const { socket } = useSocket();
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | null>(null);
  const [showPresetDescription, setShowPresetDescription] = useState<PresetKey | null>(null);
  const [pressTimer, setPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Set default preset to 'fast' on mount
  React.useEffect(() => {
    if (selectedPreset === null) {
      handleApplyPreset('fast');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoized handlers
  const handleCopyLink = useCallback(() => {
    copyJoinUrl(gameCode, t);
  }, [gameCode, t]);

  const handleShareWhatsApp = useCallback(() => {
    shareViaWhatsApp(gameCode, '', t);
  }, [gameCode, t]);

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

  // Long-press handlers for preset description
  const handlePresetMouseDown = useCallback((presetKey: PresetKey) => {
    const timer = setTimeout(() => {
      setShowPresetDescription(presetKey);
    }, 1000); // 1 second
    setPressTimer(timer);
  }, []);

  const handlePresetMouseUp = useCallback(() => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  }, [pressTimer]);

  const handlePresetClick = useCallback((presetKey: PresetKey) => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    if (!showPresetDescription) {
      handleApplyPreset(presetKey);
    }
  }, [pressTimer, showPresetDescription, handleApplyPreset]);

  return (
    <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 w-full max-w-6xl pb-16 lg:pb-0">
      {/* Row 1: Room Code + Language + Share + Exit */}
      <Card className="bg-slate-800/95 text-neo-white px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-neo-black shadow-hard">
        <div className="flex items-center justify-between gap-2">
          {/* Exit Button + Room Code and Language */}
          <div className="flex items-center gap-2">
            {/* Exit Button */}
            <button
              onClick={onExitRoom}
              className="flex items-center gap-1 px-2 py-1 bg-neo-red/90 text-white font-bold text-xs rounded-neo border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:bg-neo-red active:shadow-none transition-all"
              title={t('hostView.exitRoom')}
            >
              <FaSignOutAlt className="text-xs" />
              <span className="hidden sm:inline">{t('hostView.exitRoom')}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-black tracking-wide text-neo-yellow">
                {gameCode}
              </span>
            </div>
            <Badge className="text-xs px-1.5 py-0 bg-neo-cream text-neo-black border border-neo-black font-semibold">
              {roomLanguage === 'he' ? '🇮🇱 עברית' : roomLanguage === 'sv' ? '🇸🇪 Svenska' : roomLanguage === 'ja' ? '🇯🇵 日本語' : '🇺🇸 English'}
            </Badge>
            {/* Room Name */}
            <span className="text-xs text-neo-cream/70 font-medium hidden md:inline truncate max-w-[150px]">
              {username}&apos;s Room
            </span>
            {tournamentData && (
              <Badge className="text-xs px-2 py-0 bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-0">
                <FaTrophy className="mr-1 text-[10px]" />
                R{tournamentData.currentRound}/{tournamentData.totalRounds}
              </Badge>
            )}
          </div>

          {/* Share Buttons - compact row with tooltips on mobile */}
          <div className="flex gap-1.5">
            <ShareButton
              variant="secondary"
              onClick={handleCopyLink}
              icon={<FaLink className="text-xs" />}
              className="px-2 py-1 text-xs h-7"
              tooltip={t('hostView.copyLink')}
            >
              <span className="hidden md:inline">{t('hostView.copyLink')}</span>
            </ShareButton>
            <ShareButton
              variant="whatsapp"
              onClick={handleShareWhatsApp}
              icon={<FaWhatsapp className="text-xs" />}
              className="px-2 py-1 text-xs h-7"
              tooltip={t('hostView.shareWhatsapp')}
            >
              <span className="hidden md:inline">{t('hostView.shareWhatsapp')}</span>
            </ShareButton>
            <ShareButton
              variant="secondary"
              onClick={onShowQR}
              icon={<FaQrcode className="text-xs" />}
              className="px-2 py-1 text-xs h-7"
              tooltip={t('hostView.qrCode')}
            >
              <span className="hidden md:inline">{t('hostView.qrCode')}</span>
            </ShareButton>
          </div>
        </div>
      </Card>

      {/* Row 2: Game Settings + Players List (side by side on desktop) */}
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-2 sm:gap-3 md:gap-4">
        {/* Game Settings - LEFT - Neo-Brutalist Dark */}
        <Card className="flex-1 p-2 sm:p-3 md:p-4 bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg">
          <h3 className="text-xs font-bold text-neo-cream/80 mb-2 flex items-center gap-1.5">
            <FaCog className="text-neo-cyan text-[10px]" />
            {t('hostView.gameSettings')}
          </h3>
          <div className="w-full space-y-2 sm:space-y-3">
            {/* Game Presets */}
            <div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
                {(Object.keys(GAME_PRESETS) as PresetKey[]).map((key) => {
                  const preset = GAME_PRESETS[key];
                  const isSelected = selectedPreset === key;
                  const presetStyles: Record<PresetKey, { bg: string; selected: string }> = {
                    fast: {
                      bg: 'bg-neo-yellow',
                      selected: 'bg-neo-yellow ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-800',
                    },
                    easy: {
                      bg: 'bg-neo-lime',
                      selected: 'bg-neo-lime ring-4 ring-green-400 ring-offset-2 ring-offset-slate-800',
                    },
                    party: {
                      bg: 'bg-neo-pink',
                      selected: 'bg-neo-pink ring-4 ring-pink-400 ring-offset-2 ring-offset-slate-800',
                    },
                    challenge: {
                      bg: 'bg-neo-orange',
                      selected: 'bg-neo-orange ring-4 ring-red-500 ring-offset-2 ring-offset-slate-800',
                    },
                  };
                  const style = presetStyles[key];
                  const difficultyName = t(DIFFICULTIES[preset.difficulty].nameKey);
                  return (
                    <motion.button
                      key={key}
                      onClick={() => handlePresetClick(key)}
                      onMouseDown={() => handlePresetMouseDown(key)}
                      onMouseUp={handlePresetMouseUp}
                      onMouseLeave={handlePresetMouseUp}
                      onTouchStart={() => handlePresetMouseDown(key)}
                      onTouchEnd={handlePresetMouseUp}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "sm:flex-1 sm:min-w-[80px] px-2 py-2 sm:px-3 sm:py-2.5 rounded-neo font-bold transition-all duration-100 border-3 border-neo-black",
                        style.bg,
                        isSelected
                          ? `shadow-none translate-x-[2px] translate-y-[2px] ${style.selected}`
                          : "shadow-hard hover:shadow-hard-lg hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                      )}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-lg sm:text-2xl">{preset.icon}</span>
                        <span className="font-black text-xs text-neo-black uppercase tracking-tight leading-tight">
                          {t(preset.nameKey) || key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                        <span className="text-[9px] text-neo-black/60 font-bold leading-tight">
                          {preset.timer}min • {difficultyName}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Bot Controls - Always visible */}
            <div className="pt-1">
              <BotControls
                socket={socket}
                gameCode={gameCode}
                players={playersReady.filter((p): p is PlayerData => typeof p !== 'string')}
                disabled={false}
              />
            </div>

            {/* Advanced Settings Toggle */}
            <button
              type="button"
              onClick={handleToggleAdvancedSettings}
              className="w-full flex items-center justify-between py-1 text-neo-cream/60 hover:text-neo-cream transition-colors duration-100"
            >
              <span className="text-xs font-bold">
                {t('hostView.advancedSettings')}
                {!showAdvancedSettings && (
                  <span className="text-[10px] text-neo-cream/50 ms-2 font-normal">
                    {timerValue}min • {t(DIFFICULTIES[difficulty].nameKey)} • {hostPlaying ? t('hostView.hostPlaysShort') || '▶' : '⏸'}
                  </span>
                )}
              </span>
              {showAdvancedSettings ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
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
                    <label className="text-xs font-bold uppercase text-neo-cream/90 flex items-center gap-1.5">
                      <FaClock className="text-neo-cyan text-xs" />
                      {t('hostView.roundDuration')}
                    </label>
                    <div className="flex items-center gap-2">
                      {/* Minus Button */}
                      <button
                        type="button"
                        onClick={handleDecreaseTimer}
                        disabled={timerValue <= 1}
                        className="w-9 h-9 flex items-center justify-center rounded-neo bg-neo-cream text-neo-black border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed font-black"
                      >
                        <FaMinus size={12} />
                      </button>

                      <div className="flex items-center gap-1.5">
                        <div className="text-2xl font-black text-neo-yellow w-10 text-center overflow-hidden h-9 flex items-center justify-center">
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

                      {/* Plus Button */}
                      <button
                        type="button"
                        onClick={handleIncreaseTimer}
                        disabled={timerValue >= 10}
                        className="w-9 h-9 flex items-center justify-center rounded-neo bg-neo-cream text-neo-black border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed font-black"
                      >
                        <FaPlus size={12} />
                      </button>
                    </div>
                  </div>

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
                    <label className="text-xs font-bold uppercase text-neo-cream/90">
                      {t('hostView.difficulty')}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(DIFFICULTIES) as DifficultyLevel[]).map((key) => {
                        const isSelected = difficulty === key;
                        const difficultyColors: Record<string, string> = {
                          EASY: 'bg-neo-lime text-neo-black',
                          MEDIUM: 'bg-neo-orange text-neo-black',
                          HARD: 'bg-neo-red text-neo-white',
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
                            <span className="text-[10px] font-bold opacity-70 ms-1">
                              {DIFFICULTIES[key].rows}x{DIFFICULTIES[key].cols}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Minimum Word Length Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-neo-cream/90">
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

            {/* Start Button */}
            <div className="pt-1 flex justify-center">
              <Button
                onClick={onStartGame}
                disabled={!timerValue || playersReady.length === 0 || tournamentCreating}
                className="w-full max-w-xs h-10 text-sm bg-neo-lime text-neo-black font-black"
              >
                {tournamentCreating ? t('hostView.creatingTournament') || 'Creating...' : t('hostView.startGame')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Players List - RIGHT */}
        <Card className="lg:w-[320px] h-auto p-2 sm:p-3 md:p-4 flex flex-col bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg">
          <h3 className="text-sm font-bold uppercase text-neo-cream/80 mb-2 flex items-center gap-2 flex-shrink-0">
            <FaUsers className="text-neo-pink/80" />
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
                        <span className="font-medium text-neo-cream/90">
                          <SlotMachineText text={playerUsername} />
                        </span>
                        {isHostPlayer && <FaCrown className="text-neo-yellow/80 text-sm" />}
                        {isBot && <FaRobot className="text-neo-cyan/70 text-sm" />}
                        {isMe && (
                          <span className="text-xs text-neo-cream/70 font-medium">
                            ({t('playerView.me')})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {playerWordCounts && playerWordCounts[playerUsername] !== undefined && (
                          <span className="text-neo-cream/70 text-sm font-medium">
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
            <p className="text-sm text-center text-neo-cream/75 font-medium mt-2">
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

      {/* Preset Description Bottom Drawer */}
      <AnimatePresence>
        {showPresetDescription && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPresetDescription(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 bg-slate-800 border-t-4 border-neo-black rounded-t-[24px] shadow-hard-xl"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-neo-cream/30 rounded-full" />
              </div>

              <div className="flex flex-col items-center gap-4 text-center p-6 pb-8">
                <span className="text-6xl">{GAME_PRESETS[showPresetDescription].icon}</span>
                <h2 className="text-2xl font-black uppercase text-neo-yellow">
                  {t(GAME_PRESETS[showPresetDescription].nameKey)}
                </h2>
                <div className="space-y-3 text-neo-cream">
                  <p className="text-lg font-bold">
                    {t(GAME_PRESETS[showPresetDescription].description)}
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm bg-neo-black/20 rounded-neo px-4 py-3 border-2 border-neo-black/30">
                    <span className="flex items-center gap-1.5">
                      <FaClock className="text-neo-cyan" />
                      <span className="font-bold">{GAME_PRESETS[showPresetDescription].timer} {t('hostView.minutes')}</span>
                    </span>
                    <span>•</span>
                    <span className="font-bold">
                      {t(DIFFICULTIES[GAME_PRESETS[showPresetDescription].difficulty].nameKey)}
                    </span>
                    <span>•</span>
                    <span className="text-xs opacity-80">
                      {GAME_PRESETS[showPresetDescription].minWordLength} {t('hostView.letterMinimum')}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => setShowPresetDescription(null)}
                  className="w-full bg-neo-cyan text-neo-black font-black hover:bg-neo-cyan/90 shadow-hard border-3 border-neo-black"
                >
                  {t('common.gotIt') || t('common.close') || 'Got it!'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HostPreGameView;
