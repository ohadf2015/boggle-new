'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Crown, Bot, Monitor, LogOut, ChevronDown, BookOpen } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import Avatar from '../../components/Avatar';
import RoomChat from '../../components/RoomChat';
import PresenceIndicator from '../../components/PresenceIndicator';
import BotControls from '../../components/BotControls';
import { useCrazyGamesInvite } from '../../hooks/useCrazyGamesInvite';
import { cn } from '../../lib/utils';
import { useSocket } from '../../utils/SocketContext';

import { PresetSelector, GAME_PRESETS, type PresetKey } from './pre-game/PresetSelector';
import { StartButton } from './pre-game/StartButton';
import { MobileBottomNav, type MobileTab } from './pre-game/MobileBottomNav';
import { MobileShareSection } from './pre-game/MobileShareSection';
import { PresetInfoDrawer } from './pre-game/PresetInfoDrawer';
import {
  DesktopLobbyLayout,
  SettingsPanel,
  InviteCard,
  EnhancedPlayerList,
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
  const [mobileTab, setMobileTab] = useState<MobileTab>('lobby');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
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

  // Show TV tutorial when TV mode is enabled (hostPlaying changes from true to false)
  useEffect(() => {
    const wasHostPlaying = prevHostPlayingRef.current;
    const isNowTvMode = !hostPlaying;

    // If user just enabled TV mode and hasn't seen the tutorial yet, show it
    if (wasHostPlaying && isNowTvMode && !isTvTutorialComplete()) {
      setShowTvTutorial(true);
    }

    prevHostPlayingRef.current = hostPlaying;
  }, [hostPlaying]);

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

  // Handle mobile tab change with chat count reset
  const handleMobileTabChange = useCallback((tab: MobileTab) => {
    setMobileTab(tab);
    if (tab === 'chat') {
      setUnreadChatCount(0);
    }
  }, []);

  // Handle new chat message
  const handleNewChatMessage = useCallback(() => {
    if (mobileTab !== 'chat') {
      setUnreadChatCount((prev) => prev + 1);
    }
  }, [mobileTab]);

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

  // Render Lobby Tab Content
  const renderLobbyContent = (): React.ReactElement => (
    <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto overscroll-contain scrollable-area min-h-0">
      {/* Share Section - Top priority for inviting friends */}
      <MobileShareSection gameCode={gameCode} t={t} />

      <PresetSelector
        selectedPreset={selectedPreset}
        onPresetClick={setPresetInfoOpen}
        t={t}
      />

      {/* TV Mode Toggle */}
      <div className="flex items-center gap-2 p-2 bg-neo-navy/40 rounded-neo border border-neo-black/50">
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

      {/* Players Section */}
      <div className="flex-1 min-h-0 bg-neo-navy/30 rounded-neo border border-neo-black/50 overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-neo-black/30 flex-shrink-0">
          <Users className="w-4 h-4 text-neo-pink" />
          <span className="text-xs font-bold uppercase text-neo-cream">
            {t('hostView.playersJoined')} ({filteredPlayersForDisplay.length})
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollable-area p-2 space-y-1">
          <AnimatePresence>
            {filteredPlayersForDisplay.map((player, index) => {
              const name = typeof player === 'string' ? player : player.username;
              const avatar = typeof player === 'object' ? player.avatar : null;
              const isHostPlayer = typeof player === 'object' ? player.isHost : false;
              const presence =
                typeof player === 'object' ? player.presenceStatus : ('active' as PresenceStatus);
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
                    <Avatar
                      profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
                      avatarImage={avatar?.avatarImage}
                      size="sm"
                    />
                    <span className="font-medium text-neo-cream text-sm truncate max-w-[120px]">
                      {name}
                    </span>
                    {isHostPlayer && <Crown className="w-3 h-3 text-neo-yellow" />}
                    {isBot && <Bot className="w-3 h-3 text-neo-cyan" />}
                    {isMe && (
                      <span className="text-[9px] text-neo-cream/50">({t('playerView.me')})</span>
                    )}
                  </div>
                  {!isMe && !isBot && <PresenceIndicator status={presence} size="sm" />}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filteredPlayersForDisplay.length === 0 && (
            <p className="text-xs text-center text-neo-cream/50 py-3">
              {t('hostView.waitingForPlayers')}
            </p>
          )}
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-neo-cream transition-colors py-1"
      >
        <span>{t('common.advancedSettings') || 'More Options'}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', showAdvanced && 'rotate-180')} />
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

  // Render Chat Tab Content
  const renderChatContent = (): React.ReactElement => (
    <div className="h-full p-3">
      <RoomChat
        username="Host"
        isHost={true}
        gameCode={gameCode}
        className="h-full"
        onNewMessage={handleNewChatMessage}
      />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy lg:max-w-5xl lg:mx-auto">
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

      {/* Header - Compact: Timer + Exit only (room code in InviteCard) */}
      <header className="flex-shrink-0 px-3 py-2 bg-neo-navy/95 border-b-3 border-neo-black">
        <div className="flex items-center justify-between gap-2">
          {/* Timer Display */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neo-navy/50 rounded-neo border border-neo-black/50">
            <Clock className="w-4 h-4 text-neo-cyan" />
            <span className="text-sm font-bold text-neo-cream">{timerValue} {t('common.minutes') || 'min'}</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Exit Button */}
          <Button
            onClick={onExitRoom}
            variant="ghost"
            size="sm"
            className="text-neo-red hover:bg-neo-red/20 border border-neo-red/30 p-2"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden bg-neo-navy/95">
        {/* Desktop Layout: Three-column premium layout */}
        <div className="hidden lg:block h-full">
          <DesktopLobbyLayout
            leftContent={
              <>
                <SettingsPanel
                  selectedPreset={selectedPreset}
                  onPresetClick={handleSelectAndApplyPreset}
                  tvMode={!hostPlaying}
                  onTvModeToggle={() => setHostPlaying(!hostPlaying)}
                  t={t}
                />
                <BotControls
                  socket={socket}
                  gameCode={gameCode}
                  players={playersReady.filter((p): p is PlayerData => typeof p !== 'string')}
                  disabled={false}
                />
              </>
            }
            centerContent={
              <>
                {/* Start Button - Most prominent, at top */}
                <StartButton
                  onStartGame={onStartGame}
                  disabled={isStartDisabled}
                  tournamentCreating={tournamentCreating}
                  playerCount={filteredPlayersForDisplay.length}
                  t={t}
                  className="max-w-md"
                />
                {/* Invite Card - Sharing is secondary action */}
                <InviteCard
                  gameCode={gameCode}
                  t={t}
                  compact
                />
              </>
            }
            rightContent={
              <>
                <EnhancedPlayerList
                  players={playersReady}
                  currentUsername={username}
                  t={t}
                  className="flex-1"
                  tvMode={!hostPlaying}
                />
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

        {/* Mobile Layout: Tab-based navigation */}
        <div className="lg:hidden h-full">
          <AnimatePresence mode="wait">
            {mobileTab === 'lobby' && (
              <motion.div
                key="lobby"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                {renderLobbyContent()}
              </motion.div>
            )}
            {mobileTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                {renderChatContent()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Start Button */}
      <div className="flex-shrink-0 px-3 py-2 bg-neo-navy/98 border-t-3 border-neo-black lg:hidden">
        <StartButton
          onStartGame={onStartGame}
          disabled={isStartDisabled}
          tournamentCreating={tournamentCreating}
          playerCount={filteredPlayersForDisplay.length}
          t={t}
        />
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={mobileTab}
        onTabChange={handleMobileTabChange}
        playerCount={filteredPlayersForDisplay.length}
        unreadChatCount={unreadChatCount}
        t={t}
      />

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
