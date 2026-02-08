'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Crown, Bot, Monitor, LogOut, ChevronDown, BookOpen, Copy, Plus } from 'lucide-react';
import { Checkbox } from '../../components/ui/checkbox';
import Avatar from '../../components/Avatar';
import RoomChat from '../../components/RoomChat';
import BotControls from '../../components/BotControls';
import { useCrazyGamesInvite } from '../../hooks/useCrazyGamesInvite';
import { useNativeShare } from '../../hooks/useNativeShare';
import { cn } from '../../lib/utils';
import { getJoinUrl, copyJoinUrl } from '../../utils/share';
import { useSocket } from '../../utils/SocketContext';

import { GAME_PRESETS, type PresetKey } from './pre-game/PresetSelector';
import { StartButton } from './pre-game/StartButton';
import { MobileShareSection } from './pre-game/MobileShareSection';
import { PresetInfoDrawer } from './pre-game/PresetInfoDrawer';
import {
  DesktopLobbyLayout,
  InviteCard,
} from './pre-game/desktop';
import TvTutorialOverlay, { isTvTutorialComplete } from './tv-broadcast/TvTutorialOverlay';
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

interface LessonData {
  lessonId: string;
  lessonName: string;
  vocabularyWords: string[];
  language: Language;
  templateSettings?: {
    timerSeconds: number;
    difficulty: string;
    minWordLength: number;
    allowLateJoin: boolean;
  } | null;
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
  /** Lesson data when starting from teacher dashboard */
  lessonData?: LessonData | null;
}

// ==================== Component ====================

function HostPreGameView({
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
  lessonData,
}: HostPreGameViewProps): React.ReactElement {
  const { socket } = useSocket();
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('party');
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [presetInfoOpen, setPresetInfoOpen] = useState<PresetKey | null>(null);
  const [showTvTutorial, setShowTvTutorial] = useState(false);

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

  // Track previous hostPlaying value to detect when TV mode is enabled
  const prevHostPlayingRef = useRef(hostPlaying);
  const [tvTutorialInitialized, setTvTutorialInitialized] = useState(false);

  // Show TV tutorial ONLY when user actively toggles TV mode (not on initial mount)
  useEffect(() => {
    // Mark as initialized on first render (skip tutorial trigger on mount)
    if (!tvTutorialInitialized) {
      setTvTutorialInitialized(true);
      prevHostPlayingRef.current = hostPlaying;
      return;
    }

    const wasHostPlaying = prevHostPlayingRef.current;
    const isNowTvMode = !hostPlaying;

    // Only show tutorial when user actively toggles from hostPlaying=true to hostPlaying=false
    if (wasHostPlaying && isNowTvMode && !isTvTutorialComplete()) {
      setShowTvTutorial(true);
    }

    prevHostPlayingRef.current = hostPlaying;
  }, [hostPlaying, tvTutorialInitialized]);

  // Apply preset
  const handleApplyPreset = useCallback(
    (key: PresetKey) => {
      const preset = GAME_PRESETS[key];
      setTimerValue(preset.timer);
      setDifficulty(preset.difficulty);
      setMinWordLength(preset.difficulty === 'HARD' ? 3 : 2);
      setTimerDirection(0);
      setSelectedPreset(key);
    },
    [setTimerValue, setDifficulty, setMinWordLength, setTimerDirection]
  );

  // Handle preset drawer selection
  const handleSelectAndApplyPreset = useCallback(
    (key: PresetKey) => {
      handleApplyPreset(key);
      setPresetInfoOpen(null);
    },
    [handleApplyPreset]
  );


  // Filter out host when TV mode is enabled (host is spectating, not playing)
  const filteredPlayersForDisplay = useMemo(() => {
    // When host is playing, show all players
    if (hostPlaying) return playersReady;

    // When TV mode is enabled, filter out the host
    return playersReady.filter(player => {
      const name = typeof player === 'string' ? player : player.username;
      const isHostPlayer = typeof player === 'object' ? player.isHost : false;

      // Filter out player if they are the host (by isHost flag OR by matching username)
      if (isHostPlayer || name === username) {
        return false;
      }
      return true;
    });
  }, [playersReady, hostPlaying, username]);

  // CrazyGames invite integration with room lifecycle
  const maxPlayers = 8; // Standard max players for multiplayer
  const gameState: 'waiting' | 'playing' | 'ended' = 'waiting'; // Pre-game is always waiting

  const { showInviteButton, hideInviteButton, isInviteButtonVisible } = useCrazyGamesInvite({
    maxPlayers,
    currentPlayers: filteredPlayersForDisplay.length,
    gameState,
  });

  // Show CrazyGames invite button when room is created
  useEffect(() => {
    if (gameCode && gameState === 'waiting') {
      showInviteButton(gameCode);
    }
    return () => {
      if (isInviteButtonVisible) hideInviteButton();
    };
  }, [gameCode, gameState, showInviteButton, hideInviteButton, isInviteButtonVisible]);

  const isStartDisabled = !timerValue || filteredPlayersForDisplay.length === 0 || tournamentCreating;

  // Share handler for empty player slots
  const { tryNativeShare } = useNativeShare();
  const handleEmptySlotClick = useCallback(async () => {
    const joinUrl = getJoinUrl(gameCode, 'lobby-slot');
    const shared = await tryNativeShare({
      title: t('share.inviteTitle') || 'Join my LexiClash game!',
      text: `${t('share.inviteMessage') || 'Join my LexiClash game!'}\n${t('share.code') || 'Code'}: ${gameCode}`,
      url: joinUrl,
    });
    if (!shared) {
      copyJoinUrl(gameCode, t, 'lobby-slot');
    }
  }, [gameCode, t, tryNativeShare]);

  // Avatar color palette for players without custom avatars
  const avatarColors = ['bg-neo-cyan', 'bg-neo-pink', 'bg-purple-400', 'bg-neo-lime', 'bg-neo-yellow', 'bg-orange-400', 'bg-teal-400', 'bg-rose-400'];
  const emptySlots = Math.max(0, Math.min(5, maxPlayers) - filteredPlayersForDisplay.length);

  // Preset color mapping for the Command Center style
  const presetActiveColors: Record<string, string> = {
    fast: 'bg-neo-cyan text-neo-black',
    party: 'bg-neo-pink text-white',
    challenge: 'bg-neo-orange text-neo-black',
  };

  // Render player roster (shared between mobile and desktop)
  const renderPlayerRoster = (hostLabel?: string): React.ReactElement => (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {t('hostView.commandersJoined') || 'Commanders Joined'}
        </h3>
        {hostLabel && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {hostLabel}
          </span>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <AnimatePresence>
          {filteredPlayersForDisplay.map((player, index) => {
            const name = typeof player === 'string' ? player : player.username;
            const avatar = typeof player === 'object' ? player.avatar : null;
            const isHostPlayer = typeof player === 'object' ? player.isHost : false;
            const isBot = typeof player === 'object' ? player.isBot : false;

            return (
              <motion.div
                key={name}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, y: [0, -4, 0] }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{
                  y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 },
                }}
                className="flex-shrink-0 flex flex-col items-center gap-2"
              >
                <div className="relative">
                  {isHostPlayer && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Crown className="w-4 h-4 text-neo-yellow" />
                    </div>
                  )}
                  <div className={cn(
                    'w-16 h-16 rounded-full border-3 border-neo-black flex items-center justify-center overflow-hidden',
                    avatarColors[index % avatarColors.length]
                  )}>
                    {avatar?.profilePictureUrl || avatar?.avatarImage ? (
                      <Avatar
                        profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
                        avatarImage={avatar?.avatarImage}
                        size="md"
                      />
                    ) : (
                      <span className="text-2xl font-black text-neo-black">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {isBot && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neo-cyan border-2 border-neo-black rounded-full flex items-center justify-center">
                      <Bot className="w-3 h-3 text-neo-black" />
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-bold truncate w-16 text-center text-neo-cream">
                  {name}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty Slots - click to share invite */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <button
            key={`empty-${i}`}
            onClick={handleEmptySlotClick}
            className="flex-shrink-0 flex flex-col items-center gap-2 pt-2 cursor-pointer group"
            aria-label={t('hostView.invitePlayer') || 'Invite player'}
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-neo-cyan/30 bg-white/5 flex items-center justify-center group-hover:border-neo-cyan/60 group-hover:bg-white/10 transition-colors">
              <Plus className="w-5 h-5 text-neo-cyan/50 group-hover:text-neo-cyan transition-colors" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 uppercase group-hover:text-slate-400 transition-colors">
              {t('share.invite') || 'Invite'}
            </span>
          </button>
        ))}
      </div>
    </section>
  );

  // Render battle mode card (shared between mobile and desktop)
  const renderBattleModeCard = (): React.ReactElement => (
    <section>
      <div className="bg-neo-cream text-neo-black p-4 rounded-xl border-3 border-neo-black shadow-hard">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-neo-display font-bold text-xl leading-none uppercase">
              {t('hostView.battleMode') || 'Battle Mode'}
            </h2>
            <p className="text-[9px] font-bold uppercase text-gray-500 tracking-widest mt-1">
              {t('hostView.preset') || 'Preset'}: {t(GAME_PRESETS[selectedPreset].nameKey)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="bg-neo-cyan px-2 py-0.5 border-2 border-neo-black rounded text-[9px] font-black">
              {timerValue}:00 {t('common.minutes') || 'MIN'}
            </span>
            <span className="bg-neo-pink px-2 py-0.5 border-2 border-neo-black rounded text-[9px] font-black text-white">
              {GAME_PRESETS[selectedPreset].difficulty}
            </span>
          </div>
        </div>

        {/* Preset Buttons - Inline 3-column */}
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(GAME_PRESETS) as Array<keyof typeof GAME_PRESETS>).map((key) => {
            const isActive = selectedPreset === key;
            return (
              <button
                key={key}
                onClick={() => handleApplyPreset(key)}
                className={cn(
                  'py-2 rounded font-bold text-[10px] uppercase border-2 border-neo-black transition-all',
                  isActive
                    ? `${presetActiveColors[key]} shadow-hard-sm`
                    : 'bg-transparent hover:bg-gray-100'
                )}
              >
                {t(GAME_PRESETS[key].nameKey)}
              </button>
            );
          })}
        </div>

        {/* Advanced Settings Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full mt-3 py-1 flex items-center justify-center gap-1 text-[9px] font-black uppercase border-t border-neo-black/10 pt-3 text-gray-500 hover:text-neo-black transition-colors"
          aria-expanded={showAdvanced}
          aria-controls="advanced-settings-panel"
        >
          {t('common.advancedSettings') || 'Advanced Settings'}
          <ChevronDown className={cn('w-3 h-3 transition-transform', showAdvanced && 'rotate-180')} aria-hidden="true" />
        </button>
      </div>

      {/* Advanced settings dropdown (outside cream card for contrast) */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            id="advanced-settings-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-2"
          >
            {/* TV Mode Toggle */}
            <div className="flex items-center gap-2 p-2 bg-neo-navy/40 rounded-neo border border-neo-black/50 mb-2">
              <Monitor className="w-4 h-4 text-neo-cream/80" />
              <Checkbox
                id="broadcastMode"
                checked={!hostPlaying}
                onCheckedChange={(checked) => setHostPlaying(checked !== true)}
              />
              <label
                htmlFor="broadcastMode"
                className="text-xs font-bold uppercase text-neo-cream cursor-pointer flex-1"
              >
                {t('hostView.broadcastModeTitle') || 'TV Mode'}
              </label>
            </div>

            <BotControls
              socket={socket}
              gameCode={gameCode}
              players={playersReady.filter((p): p is PlayerData => typeof p !== 'string')}
              disabled={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );

  // Render Command Center Mobile Content (single-scroll vertical flow)
  const renderLobbyContent = (): React.ReactElement => (
    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4 min-h-0">

      {/* 1. Start Button - HERO at top */}
      <section>
        <StartButton
          onStartGame={onStartGame}
          disabled={isStartDisabled}
          tournamentCreating={tournamentCreating}
          playerCount={filteredPlayersForDisplay.length}
          maxPlayers={maxPlayers}
          t={t}
        />
      </section>

      {/* 2. Player Roster - Horizontal scroll */}
      {renderPlayerRoster(`${t('hostView.hostIs') || 'Host is'} ${username}`)}

      {/* 3. Battle Mode Settings Card */}
      {renderBattleModeCard()}

      {/* 4. Share/Invite Strip */}
      <MobileShareSection gameCode={gameCode} t={t} />

      {/* 5. Battle Feed / Chat */}
      <section className="pb-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-2">
          {t('hostView.battleFeed') || 'Battle Feed'}
        </h3>
        <div className="bg-neo-navy/30 rounded-neo-lg border-2 border-neo-black/50 overflow-hidden h-72">
          <RoomChat
            username="Host"
            isHost={true}
            gameCode={gameCode}
            className="h-full"
            onNewMessage={() => {}}
          />
        </div>
      </section>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy lg:max-w-7xl lg:mx-auto">
      {/* Lesson Mode Banner */}
      {lessonData && (
        <div className="flex-shrink-0 px-3 py-2 bg-neo-purple/20 border-b-2 border-neo-purple/50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-neo-purple" />
            <span className="text-sm font-bold text-neo-purple">
              {t('hostView.lessonMode') || 'Lesson Mode'}:
            </span>
            <span className="text-sm text-neo-cream">
              {lessonData.lessonName}
            </span>
            <span className="text-xs text-neo-cream/60">
              ({lessonData.vocabularyWords.length} {t('hostView.words') || 'words'})
            </span>
          </div>
        </div>
      )}

      {/* Header - Command Center: Room code + player count + exit */}
      <header className="flex-shrink-0 px-4 py-3 bg-neo-navy/95 border-b-3 border-neo-black sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2">
          {/* Room Code Display */}
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest leading-none mb-1">
              {t('roomCode.label') || 'Room Code'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-neo-display font-bold text-neo-cyan uppercase leading-none"
                style={{ textShadow: '0 0 12px rgba(0, 255, 255, 0.6)' }}
              >
                {gameCode}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(gameCode);
                }}
                className="text-slate-400 hover:text-neo-white transition-colors p-1"
                aria-label={t('roomCode.copy') || 'Copy code'}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right side: Player count + Exit */}
          <div className="flex items-center gap-2">
            <div className="bg-black/40 border-2 border-neo-black px-2 py-1 rounded-md flex items-center gap-1.5">
              <Users className="w-4 h-4 text-neo-cyan" />
              <span className="text-xs font-black text-neo-cream">
                {filteredPlayersForDisplay.length}/{8}
              </span>
            </div>
            <button
              onClick={onExitRoom}
              className="w-9 h-9 flex items-center justify-center bg-neo-red border-2 border-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-none transition-all rounded"
              aria-label={t('common.exit') || 'Exit'}
            >
              <LogOut className="w-4 h-4 text-neo-black" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden bg-neo-navy/95 flex flex-col">
        {/* Desktop Layout: Two-column layout */}
        <div className="hidden lg:flex lg:flex-col flex-1 min-h-0">
          <DesktopLobbyLayout
            leftContent={
              <>
                {/* Start Button - HERO at top */}
                <StartButton
                  onStartGame={onStartGame}
                  disabled={isStartDisabled}
                  tournamentCreating={tournamentCreating}
                  playerCount={filteredPlayersForDisplay.length}
                  t={t}
                />

                {/* Player Roster */}
                {renderPlayerRoster(`${t('hostView.hostIs') || 'Host is'} ${username}`)}

                {/* Battle Mode Card */}
                {renderBattleModeCard()}
              </>
            }
            rightContent={
              <>
                {/* QR Code + Share */}
                <InviteCard
                  gameCode={gameCode}
                  t={t}
                  desktop
                />

                {/* Battle Feed / Chat */}
                <div
                  data-testid="desktop-chat-area"
                  className="flex-1 min-h-0 bg-neo-navy/30 rounded-neo-lg border-4 border-neo-black shadow-hard overflow-hidden"
                >
                  <RoomChat
                    username="Host"
                    isHost={true}
                    gameCode={gameCode}
                    className="h-full"
                    onNewMessage={() => {}}
                  />
                </div>
              </>
            }
          />
        </div>

        {/* Mobile Layout: Single-scroll Command Center */}
        <div className="lg:hidden flex flex-col flex-1 min-h-0">
          {renderLobbyContent()}
        </div>
      </main>

      {/* Preset Info Drawer */}
      <PresetInfoDrawer
        openPreset={presetInfoOpen}
        onClose={() => setPresetInfoOpen(null)}
        onSelectPreset={handleSelectAndApplyPreset}
        t={t}
      />

      {/* TV Mode Tutorial - shown when user enables TV mode for the first time */}
      <TvTutorialOverlay
        onComplete={() => setShowTvTutorial(false)}
        onSkip={() => setShowTvTutorial(false)}
        t={t}
        forceShow={showTvTutorial}
      />
    </div>
  );
}

export default HostPreGameView;
