'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Settings, Plus, Minus, Crown, Bot, Check, Monitor, MessageSquare, RefreshCw, LogOut, Copy } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import Avatar from '../../components/Avatar';
import RoomChat from '../../components/RoomChat';
import PresenceIndicator from '../../components/PresenceIndicator';
import BotControls from '../../components/BotControls';
import { useCrazyGamesInvite } from '../../hooks/useCrazyGamesInvite';
import { DIFFICULTIES, getRecommendedTimer } from '../../utils/consts';
import { cn } from '../../lib/utils';
import { useSocket } from '../../utils/SocketContext';
import { neoInfoToast } from '../../components/NeoToast';
import toast from 'react-hot-toast';
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
  highlightedCells: { row: number; col: number }[];
  tableData: LetterGrid;

  // Actions
  onStartGame: () => void;
  onExitRoom: () => void;
  onCancelTournament: () => void;
  onRegenerateBoard?: () => void;

  // Loading states
  tournamentCreating: boolean;
}

// Game presets for quick setup
const GAME_PRESETS = {
  fast: {
    nameKey: 'hostView.presetFast',
    icon: '⚡',
    timer: 1,
    difficulty: 'MEDIUM' as DifficultyLevel,
    minWordLength: 2,
  },
  party: {
    nameKey: 'hostView.presetParty',
    icon: '🎉',
    timer: 2,
    difficulty: 'MEDIUM' as DifficultyLevel,
    minWordLength: 2,
  },
  challenge: {
    nameKey: 'hostView.presetChallenge',
    icon: '🏆',
    timer: 3,
    difficulty: 'HARD' as DifficultyLevel,
    minWordLength: 3,
  },
} as const;

type PresetKey = keyof typeof GAME_PRESETS;
type MobileTab = 'settings' | 'players' | 'chat';

// ==================== Component ====================

const HostPreGameView: React.FC<HostPreGameViewProps> = ({
  gameCode,
  username,
  t,
  timerValue,
  setTimerValue,
  timerDirection,
  setTimerDirection,
  difficulty,
  setDifficulty,
  minWordLength,
  setMinWordLength,
  tournamentData,
  hostPlaying,
  setHostPlaying,
  playersReady,
  onStartGame,
  onExitRoom,
  onCancelTournament,
  onRegenerateBoard,
  tournamentCreating,
}): React.ReactElement => {
  const { socket } = useSocket();
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('party');
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('settings');
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [codeCopied, setCodeCopied] = useState(false);

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
  useEffect(() => {
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

  const handleSetDifficulty = useCallback((key: DifficultyLevel) => {
    setDifficulty(key);
    const recommendedSeconds = getRecommendedTimer(key);
    const recommendedMinutes = Math.round(recommendedSeconds / 60);
    setTimerValue(recommendedMinutes);
    setTimerDirection(0);
  }, [setDifficulty, setTimerValue, setTimerDirection]);

  // Apply preset configuration
  const handleApplyPreset = useCallback((presetKey: PresetKey) => {
    const preset = GAME_PRESETS[presetKey];
    setTimerValue(preset.timer);
    setDifficulty(preset.difficulty);
    setMinWordLength(preset.minWordLength);
    setTimerDirection(0);
    setSelectedPreset(presetKey);
  }, [setTimerValue, setDifficulty, setMinWordLength, setTimerDirection]);

  // Copy room code handler
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCodeCopied(true);
      toast.success(t('roomCode.copied') || 'Code copied!', {
        duration: 1500,
        icon: '📋',
      });
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error(t('common.error') || 'Failed to copy');
    }
  }, [gameCode, t]);

  // Broadcast mode suggestion
  const hasShownBroadcastSuggestion = useRef<boolean>(false);
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

  // Render Settings Tab Content
  const renderSettingsContent = () => (
    <div className="flex flex-col gap-3 p-3 h-full overflow-y-auto">
      {/* Quick Presets */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase text-neo-cream/80">
          {t('hostView.quickSetup') || 'Quick Setup'}
        </label>
        <div className="flex gap-2">
          {(Object.keys(GAME_PRESETS) as PresetKey[]).map((key) => {
            const preset = GAME_PRESETS[key];
            const isSelected = selectedPreset === key;
            const presetColors: Record<PresetKey, string> = {
              fast: 'bg-neo-cyan border-neo-cyan',
              party: 'bg-neo-yellow border-neo-yellow',
              challenge: 'bg-neo-pink border-neo-pink',
            };
            return (
              <button
                key={key}
                onClick={() => handleApplyPreset(key)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-neo font-bold transition-all border-2",
                  isSelected
                    ? `${presetColors[key]} text-neo-black shadow-none`
                    : "bg-slate-700 border-slate-600 text-neo-cream shadow-hard-sm hover:shadow-hard"
                )}
              >
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-neo-black rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-neo-white" strokeWidth={3} />
                  </div>
                )}
                <span className="text-lg">{preset.icon}</span>
                <span className="text-xs font-black uppercase">
                  {t(preset.nameKey) || key}
                </span>
                <span className="text-[10px] opacity-80">
                  {preset.timer}min
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timer Control - Inline */}
      <div className="flex items-center justify-between bg-slate-700/50 rounded-neo p-2 border border-slate-600">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-neo-cyan" />
          <span className="text-xs font-bold uppercase text-neo-cream">{t('hostView.timer')}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDecreaseTimer}
            disabled={timerValue <= 1}
            className="w-7 h-7 flex items-center justify-center rounded bg-slate-600 text-neo-cream border border-slate-500 disabled:opacity-50"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-lg font-black text-neo-yellow w-6 text-center">{timerValue}</span>
          <span className="text-xs text-neo-cream/80">{t('hostView.min')}</span>
          <button
            onClick={handleIncreaseTimer}
            disabled={timerValue >= 10}
            className="w-7 h-7 flex items-center justify-center rounded bg-slate-600 text-neo-cream border border-slate-500 disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Difficulty Selection */}
      <div className="space-y-1">
        <label className="text-xs font-bold uppercase text-neo-cream/80">{t('hostView.difficulty')}</label>
        <div className="flex flex-wrap gap-1">
          {(['EASY', 'MEDIUM', 'HARD'] as DifficultyLevel[]).map((key) => {
            const isSelected = difficulty === key;
            const colors: Record<string, string> = {
              EASY: 'bg-neo-lime text-neo-black',
              MEDIUM: 'bg-neo-orange text-neo-black',
              HARD: 'bg-neo-red text-neo-white',
            };
            return (
              <button
                key={key}
                onClick={() => handleSetDifficulty(key)}
                className={cn(
                  "px-3 py-1 rounded-neo text-xs font-bold border-2 border-neo-black transition-all",
                  isSelected ? colors[key] : "bg-slate-700 text-neo-cream shadow-hard-sm"
                )}
              >
                {t(DIFFICULTIES[key].nameKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Broadcast Mode Toggle */}
      <div className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-neo border border-slate-600">
        <Monitor className="w-4 h-4 text-neo-cream/80" />
        <Checkbox
          id="broadcastMode"
          checked={!hostPlaying}
          onCheckedChange={(checked) => setHostPlaying(checked !== true)}
        />
        <label htmlFor="broadcastMode" className="text-xs font-bold uppercase text-neo-cream cursor-pointer flex-1">
          {t('hostView.broadcastModeTitle') || 'TV Mode'}
        </label>
      </div>

      {/* Bot Controls */}
      <BotControls
        socket={socket}
        gameCode={gameCode}
        players={playersReady.filter((p): p is PlayerData => typeof p !== 'string')}
        disabled={false}
      />
    </div>
  );

  // Render Players Tab Content
  const renderPlayersContent = () => (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <Users className="w-4 h-4 text-neo-pink" />
        <span className="text-sm font-bold uppercase text-neo-cream">
          {t('hostView.playersJoined')} ({playersReady.length})
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
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
                className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <Avatar
                    profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
                    avatarImage={avatar?.avatarImage}
                    size="md"
                  />
                  <span className="font-medium text-neo-cream text-sm">{playerUsername}</span>
                  {isHostPlayer && <Crown className="w-4 h-4 text-neo-yellow" />}
                  {isBot && <Bot className="w-4 h-4 text-neo-cyan" />}
                  {isMe && <span className="text-[10px] text-neo-cream/60">({t('playerView.me')})</span>}
                </div>
                {!isMe && !isBot && (
                  <PresenceIndicator status={presenceStatus} isWindowFocused={isWindowFocused} size="md" />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {playersReady.length === 0 && (
          <p className="text-sm text-center text-neo-cream/60 font-medium py-4">
            {t('hostView.waitingForPlayers')}
          </p>
        )}
      </div>
    </div>
  );

  // Render Chat Tab Content
  const renderChatContent = () => (
    <div className="h-full p-3">
      <RoomChat
        username="Host"
        isHost={true}
        gameCode={gameCode}
        className="h-full"
        onNewMessage={() => {
          if (mobileTab !== 'chat') {
            setUnreadChatCount(prev => prev + 1);
          }
        }}
      />
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-neo-navy overflow-hidden">
      {/* Header - Room Code + Start Button */}
      <header className="flex-shrink-0 px-3 py-2 bg-slate-800/95 border-b-4 border-neo-black">
        <div className="flex items-center justify-between gap-2">
          {/* Room Code */}
          <motion.button
            onClick={handleCopyCode}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-2 bg-neo-navy/60 hover:bg-neo-navy/80 rounded-neo border-2 border-neo-black shadow-hard-sm transition-all"
          >
            <span className="text-xl font-black tracking-[0.15em] text-neo-lime">{gameCode}</span>
            {codeCopied ? <Check className="w-4 h-4 text-neo-lime" /> : <Copy className="w-4 h-4 text-neo-cream/50" />}
          </motion.button>

          <div className="flex items-center gap-2">
            {/* Regenerate Button */}
            {onRegenerateBoard && (
              <Button
                onClick={onRegenerateBoard}
                disabled={tournamentCreating}
                variant="ghost"
                size="sm"
                className="text-neo-cream hover:bg-slate-700 border border-slate-600"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            {/* Exit Button */}
            <Button
              onClick={onExitRoom}
              variant="ghost"
              size="sm"
              className="text-neo-red hover:bg-neo-red/20 border border-neo-red/30"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Start Game Button - Always visible in header */}
        <Button
          onClick={onStartGame}
          disabled={!timerValue || playersReady.length === 0 || tournamentCreating}
          className="w-full mt-2 h-12 text-base bg-neo-lime text-neo-black font-black uppercase border-3 border-neo-black shadow-hard hover:shadow-hard-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {tournamentCreating ? t('hostView.creatingTournament') || 'Creating...' : (
            <>
              🎮 {t('hostView.startGame')}
              {playersReady.length > 0 && <span className="ml-2 opacity-80">({playersReady.length})</span>}
            </>
          )}
        </Button>
      </header>

      {/* Main Content - Tab Content */}
      <main className="flex-1 min-h-0 overflow-hidden bg-slate-800/95">
        <AnimatePresence mode="wait">
          {mobileTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              {renderSettingsContent()}
            </motion.div>
          )}
          {mobileTab === 'players' && (
            <motion.div key="players" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              {renderPlayersContent()}
            </motion.div>
          )}
          {mobileTab === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              {renderChatContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="flex-shrink-0 bg-slate-900/98 border-t-4 border-neo-black pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center h-14">
          {/* Settings Tab */}
          <button
            onClick={() => setMobileTab('settings')}
            className={cn(
              'flex-1 flex flex-col items-center justify-center h-full transition-all',
              mobileTab === 'settings' ? 'text-neo-yellow bg-slate-800/50' : 'text-neo-white/60 hover:text-neo-white/80'
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase mt-0.5">{t('hostView.settings') || 'Settings'}</span>
          </button>

          {/* Players Tab */}
          <button
            onClick={() => setMobileTab('players')}
            className={cn(
              'flex-1 flex flex-col items-center justify-center h-full transition-all',
              mobileTab === 'players' ? 'text-neo-yellow bg-slate-800/50' : 'text-neo-white/60 hover:text-neo-white/80'
            )}
          >
            <div className="relative">
              <Users className="w-5 h-5" />
              {playersReady.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-neo-pink text-neo-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center border border-neo-black">
                  {playersReady.length > 9 ? '9+' : playersReady.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase mt-0.5">{t('hostView.players') || 'Players'}</span>
          </button>

          {/* Chat Tab */}
          <button
            onClick={() => {
              setMobileTab('chat');
              setUnreadChatCount(0);
            }}
            className={cn(
              'flex-1 flex flex-col items-center justify-center h-full transition-all',
              mobileTab === 'chat' ? 'text-neo-yellow bg-slate-800/50' : 'text-neo-white/60 hover:text-neo-white/80'
            )}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              {unreadChatCount > 0 && mobileTab !== 'chat' && (
                <span className="absolute -top-1 -right-2 bg-neo-red text-neo-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center border border-neo-black">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase mt-0.5">{t('hostView.chat') || 'Chat'}</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default HostPreGameView;
