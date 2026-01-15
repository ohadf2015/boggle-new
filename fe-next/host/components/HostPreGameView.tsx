'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Crown, Bot, Check, Monitor, MessageSquare, LogOut, Copy, ChevronDown, Timer, Grid3X3, Type } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import Avatar from '../../components/Avatar';
import RoomChat from '../../components/RoomChat';
import PresenceIndicator from '../../components/PresenceIndicator';
import BotControls from '../../components/BotControls';
import { MobileDrawer } from '../../components/layout/MobileDrawer';
import { useCrazyGamesInvite } from '../../hooks/useCrazyGamesInvite';
import { cn } from '../../lib/utils';
import { useSocket } from '../../utils/SocketContext';
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
}

interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
  standings?: unknown[];
  isComplete?: boolean;
}

interface HostPreGameViewProps {
  gameCode: string;
  roomLanguage: Language;
  language: Language;
  username: string;
  t: (path: string, params?: Record<string, string | number>) => string;
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
  playersReady: (string | PlayerData)[];
  playerWordCounts: Record<string, number>;
  shufflingGrid: LetterGrid | null;
  highlightedCells: { row: number; col: number }[];
  tableData: LetterGrid;
  onStartGame: () => void;
  onExitRoom: () => void;
  onCancelTournament: () => void;
  onRegenerateBoard?: () => void;
  tournamentCreating: boolean;
}

// Simple presets - Fast/Party/Challenge
const GAME_PRESETS = {
  fast: { nameKey: 'hostView.presetFast', detailsKey: 'hostView.presetFastDetails', icon: '⚡', timer: 1, difficulty: 'MEDIUM' as DifficultyLevel, minWordLength: 2 },
  party: { nameKey: 'hostView.presetParty', detailsKey: 'hostView.presetPartyDetails', icon: '🎉', timer: 2, difficulty: 'MEDIUM' as DifficultyLevel, minWordLength: 2 },
  challenge: { nameKey: 'hostView.presetChallenge', detailsKey: 'hostView.presetChallengeDetails', icon: '🏆', timer: 3, difficulty: 'HARD' as DifficultyLevel, minWordLength: 3 },
} as const;

type PresetKey = keyof typeof GAME_PRESETS;
type MobileTab = 'lobby' | 'chat';

// ==================== Component ====================

const HostPreGameView: React.FC<HostPreGameViewProps> = ({
  gameCode,
  username,
  t,
  timerValue,
  setTimerValue,
  setTimerDirection,
  setDifficulty,
  setMinWordLength,
  hostPlaying,
  setHostPlaying,
  playersReady,
  onStartGame,
  onExitRoom,
  tournamentCreating,
}): React.ReactElement => {
  const { socket } = useSocket();
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('party');
  const [hasInitialized, setHasInitialized] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('lobby');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [presetInfoOpen, setPresetInfoOpen] = useState<PresetKey | null>(null);

  const { showInviteButton, hideInviteButton, isInviteButtonVisible } = useCrazyGamesInvite();

  // Show CrazyGames invite button
  useEffect(() => {
    if (gameCode) {
      showInviteButton(gameCode);
    }
    return () => {
      if (isInviteButtonVisible) hideInviteButton();
    };
  }, [gameCode, showInviteButton, hideInviteButton, isInviteButtonVisible]);

  // Apply default preset on mount
  useEffect(() => {
    if (!hasInitialized) {
      const preset = GAME_PRESETS['party'];
      setTimerValue(preset.timer);
      setDifficulty(preset.difficulty);
      setMinWordLength(2);
      setHasInitialized(true);
    }
  }, [hasInitialized, setTimerValue, setDifficulty, setMinWordLength]);

  // Apply preset
  const handleApplyPreset = useCallback((key: PresetKey) => {
    const preset = GAME_PRESETS[key];
    setTimerValue(preset.timer);
    setDifficulty(preset.difficulty);
    setMinWordLength(preset.difficulty === 'HARD' ? 3 : 2);
    setTimerDirection(0);
    setSelectedPreset(key);
  }, [setTimerValue, setDifficulty, setMinWordLength, setTimerDirection]);

  // Copy room code
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCodeCopied(true);
      toast.success(t('roomCode.copied') || 'Copied!', { duration: 1500, icon: '📋' });
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error(t('common.error'));
    }
  }, [gameCode, t]);

  // Get board size display text based on difficulty
  const getBoardSizeText = useCallback((difficulty: DifficultyLevel) => {
    if (difficulty === 'HARD') {
      return t('hostView.presetDrawerBoardHard') || '9×9 (Hard)';
    }
    return t('hostView.presetDrawerBoardMedium') || '7×7 (Medium)';
  }, [t]);

  // Handle selecting and applying a preset from the drawer
  const handleSelectAndApplyPreset = useCallback((key: PresetKey) => {
    handleApplyPreset(key);
    setPresetInfoOpen(null);
  }, [handleApplyPreset]);

  // Render Lobby Tab (Settings + Players combined)
  const renderLobbyContent = () => (
    <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
      {/* Quick Presets */}
      <div className="flex gap-2">
        {(Object.keys(GAME_PRESETS) as PresetKey[]).map((key) => {
          const preset = GAME_PRESETS[key];
          const isSelected = selectedPreset === key;
          const colors: Record<PresetKey, string> = {
            fast: 'bg-neo-cyan border-neo-cyan',
            party: 'bg-neo-yellow border-neo-yellow',
            challenge: 'bg-neo-pink border-neo-pink',
          };
          return (
            <button
              key={key}
              onClick={() => setPresetInfoOpen(key)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 p-2 rounded-neo font-bold transition-all border-2 relative",
                isSelected
                  ? `${colors[key]} text-neo-black shadow-none`
                  : "bg-slate-700 border-slate-600 text-neo-cream shadow-hard-sm"
              )}
            >
              {isSelected && (
                <Check className="absolute -top-1 -right-1 w-4 h-4 bg-neo-black text-neo-white rounded-full p-0.5" />
              )}
              <span className="text-lg">{preset.icon}</span>
              <span className="text-[10px] font-black uppercase">{t(preset.nameKey)}</span>
              <span className="text-[9px] opacity-70">{preset.timer}min</span>
            </button>
          );
        })}
      </div>

      {/* TV Mode Toggle */}
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

      {/* Players Section */}
      <div className="flex-1 min-h-0 bg-slate-700/30 rounded-neo border border-slate-600 overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-slate-600/50 flex-shrink-0">
          <Users className="w-4 h-4 text-neo-pink" />
          <span className="text-xs font-bold uppercase text-neo-cream">
            {t('hostView.playersJoined')} ({playersReady.length})
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
          <AnimatePresence>
            {playersReady.map((player, index) => {
              const name = typeof player === 'string' ? player : player.username;
              const avatar = typeof player === 'object' ? player.avatar : null;
              const isHostPlayer = typeof player === 'object' ? player.isHost : false;
              const presence = typeof player === 'object' ? player.presenceStatus : 'active' as PresenceStatus;
              const isBot = typeof player === 'object' ? player.isBot : false;
              const isMe = name === username;

              return (
                <motion.div
                  key={name}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 10, opacity: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center justify-between px-2 py-1 rounded bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    <Avatar profilePictureUrl={avatar?.profilePictureUrl ?? undefined} avatarImage={avatar?.avatarImage} size="sm" />
                    <span className="font-medium text-neo-cream text-sm truncate max-w-[120px]">{name}</span>
                    {isHostPlayer && <Crown className="w-3 h-3 text-neo-yellow" />}
                    {isBot && <Bot className="w-3 h-3 text-neo-cyan" />}
                    {isMe && <span className="text-[9px] text-neo-cream/50">({t('playerView.me')})</span>}
                  </div>
                  {!isMe && !isBot && <PresenceIndicator status={presence} size="sm" />}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {playersReady.length === 0 && (
            <p className="text-xs text-center text-neo-cream/50 py-3">{t('hostView.waitingForPlayers')}</p>
          )}
        </div>
      </div>

      {/* Advanced Settings (Collapsible) */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-neo-cream transition-colors py-1"
      >
        <span>{t('common.advancedSettings') || 'More Options'}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", showAdvanced && "rotate-180")} />
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <BotControls
              socket={socket}
              gameCode={gameCode}
              players={playersReady.filter((p): p is PlayerData => typeof p !== 'string')}
              disabled={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Render Chat Tab
  const renderChatContent = () => (
    <div className="h-full p-3">
      <RoomChat
        username="Host"
        isHost={true}
        gameCode={gameCode}
        className="h-full"
        onNewMessage={() => {
          if (mobileTab !== 'chat') setUnreadChatCount(prev => prev + 1);
        }}
      />
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-neo-navy overflow-hidden">
      {/* Header - Compact */}
      <header className="flex-shrink-0 px-3 py-2 bg-slate-800/95 border-b-3 border-neo-black">
        <div className="flex items-center justify-between gap-2">
          {/* Room Code */}
          <motion.button
            onClick={handleCopyCode}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-neo-navy/60 hover:bg-neo-navy/80 rounded-neo border-2 border-neo-black shadow-hard-sm transition-all"
          >
            <span className="text-lg font-black tracking-wider text-neo-lime">{gameCode}</span>
            {codeCopied ? <Check className="w-4 h-4 text-neo-lime" /> : <Copy className="w-4 h-4 text-neo-cream/50" />}
          </motion.button>

          {/* Timer Display */}
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 rounded border border-slate-600">
            <Clock className="w-3 h-3 text-neo-cyan" />
            <span className="text-sm font-bold text-neo-cream">{timerValue}min</span>
          </div>

          {/* Exit Button */}
          <Button onClick={onExitRoom} variant="ghost" size="sm" className="text-neo-red hover:bg-neo-red/20 border border-neo-red/30 p-2">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content - 2 Tabs */}
      <main className="flex-1 min-h-0 overflow-hidden bg-slate-800/95">
        <AnimatePresence mode="wait">
          {mobileTab === 'lobby' && (
            <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              {renderLobbyContent()}
            </motion.div>
          )}
          {mobileTab === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              {renderChatContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Start Game Button - Fixed at bottom */}
      <div className="flex-shrink-0 px-3 py-2 bg-slate-900/98 border-t-3 border-neo-black">
        <Button
          onClick={onStartGame}
          disabled={!timerValue || playersReady.length === 0 || tournamentCreating}
          className="w-full h-12 text-base bg-neo-lime text-neo-black font-black uppercase border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed active:translate-y-0.5 disabled:opacity-50 transition-all"
        >
          {tournamentCreating ? t('hostView.creatingTournament') : (
            <>🎮 {t('hostView.startGame')} {playersReady.length > 0 && <span className="ml-1 opacity-70">({playersReady.length})</span>}</>
          )}
        </Button>
      </div>

      {/* Bottom Tab Bar - 2 Tabs */}
      <nav className="flex-shrink-0 bg-slate-900/98 border-t border-slate-700 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center h-12">
          {/* Lobby Tab */}
          <button
            onClick={() => setMobileTab('lobby')}
            className={cn(
              'flex-1 flex flex-col items-center justify-center h-full transition-all',
              mobileTab === 'lobby' ? 'text-neo-yellow bg-slate-800/50' : 'text-neo-white/60'
            )}
          >
            <div className="relative">
              <Users className="w-5 h-5" />
              {playersReady.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-neo-pink text-neo-white text-[8px] font-bold rounded-full min-w-[12px] h-[12px] flex items-center justify-center border border-neo-black">
                  {playersReady.length > 9 ? '9+' : playersReady.length}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold uppercase mt-0.5">{t('hostView.lobby')}</span>
          </button>

          {/* Chat Tab */}
          <button
            onClick={() => { setMobileTab('chat'); setUnreadChatCount(0); }}
            className={cn(
              'flex-1 flex flex-col items-center justify-center h-full transition-all',
              mobileTab === 'chat' ? 'text-neo-yellow bg-slate-800/50' : 'text-neo-white/60'
            )}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              {unreadChatCount > 0 && mobileTab !== 'chat' && (
                <span className="absolute -top-1 -right-2 bg-neo-red text-neo-white text-[8px] font-bold rounded-full min-w-[12px] h-[12px] flex items-center justify-center border border-neo-black">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold uppercase mt-0.5">{t('hostView.chat') || 'Chat'}</span>
          </button>
        </div>
      </nav>

      {/* Preset Info Drawer */}
      <MobileDrawer
        isOpen={presetInfoOpen !== null}
        onClose={() => setPresetInfoOpen(null)}
        title={presetInfoOpen ? t(GAME_PRESETS[presetInfoOpen].nameKey) : ''}
        height="auto"
      >
        {presetInfoOpen && (
          <div className="space-y-4">
            {/* Preset Header */}
            <div className="flex items-center gap-3">
              <span className="text-4xl">{GAME_PRESETS[presetInfoOpen].icon}</span>
              <div>
                <h3 className="text-lg font-black text-neo-black">
                  {t(GAME_PRESETS[presetInfoOpen].nameKey)}
                </h3>
                <p className="text-sm text-neo-black/70">
                  {t(`hostView.preset${presetInfoOpen.charAt(0).toUpperCase() + presetInfoOpen.slice(1)}Desc`)}
                </p>
              </div>
            </div>

            {/* Detailed Description */}
            <p className="text-sm text-neo-black/80 leading-relaxed">
              {t(GAME_PRESETS[presetInfoOpen].detailsKey)}
            </p>

            {/* Settings Breakdown */}
            <div className="bg-neo-black/5 rounded-neo p-3 space-y-2 border-2 border-neo-black/10">
              <h4 className="text-xs font-black uppercase text-neo-black/60 mb-2">
                {t('common.settings') || 'Settings'}
              </h4>

              {/* Timer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-neo-black/60" />
                  <span className="text-sm font-bold text-neo-black">
                    {t('hostView.presetDrawerTimer') || 'Timer'}
                  </span>
                </div>
                <span className="text-sm font-black text-neo-black">
                  {GAME_PRESETS[presetInfoOpen].timer} min
                </span>
              </div>

              {/* Board Size */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-neo-black/60" />
                  <span className="text-sm font-bold text-neo-black">
                    {t('hostView.presetDrawerBoard') || 'Board Size'}
                  </span>
                </div>
                <span className="text-sm font-black text-neo-black">
                  {getBoardSizeText(GAME_PRESETS[presetInfoOpen].difficulty)}
                </span>
              </div>

              {/* Min Word Length */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-neo-black/60" />
                  <span className="text-sm font-bold text-neo-black">
                    {t('hostView.presetDrawerMinWord') || 'Min Word Length'}
                  </span>
                </div>
                <span className="text-sm font-black text-neo-black">
                  {GAME_PRESETS[presetInfoOpen].minWordLength} {t('hostView.presetDrawerLetters') || 'letters'}
                </span>
              </div>
            </div>

            {/* Use This Mode Button */}
            <Button
              onClick={() => handleSelectAndApplyPreset(presetInfoOpen)}
              className="w-full h-12 text-base bg-neo-lime text-neo-black font-black uppercase border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed active:translate-y-0.5 transition-all"
            >
              {t('hostView.presetDrawerUseMode') || 'Use This Mode'}
            </Button>
          </div>
        )}
      </MobileDrawer>
    </div>
  );
};

export default HostPreGameView;
