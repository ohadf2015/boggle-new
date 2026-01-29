'use client';

import { memo, useMemo, useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { Maximize, Minimize } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import TvTutorialOverlay, { isTvTutorialComplete, TvHelpButton } from './tv-broadcast/TvTutorialOverlay';
import TvJoinBar from './tv-broadcast/TvJoinBar';
import TvGameHeader from './tv-broadcast/TvGameHeader';
import TvGrid from './tv-broadcast/TvGrid';
import TvLeaderboard from './tv-broadcast/TvLeaderboard';
import TvNotificationQueue from './tv-broadcast/TvNotificationQueue';
import { useTvPlayerCombos } from '../hooks/useTvPlayerCombos';
import { useTvNotifications } from '../hooks/useTvNotifications';
import { useTvSounds } from '../hooks/useTvSounds';
import { useTvFullscreen } from '../hooks/useTvFullscreen';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import type { Language, LetterGrid, Avatar as AvatarType } from '@/shared/types/game';
import type { EarthquakeState } from '@/shared/types/earthquake';

// ==================== Types ====================

interface PlayerData {
  username: string;
  avatar?: AvatarType | null;
  isHost?: boolean;
}

interface TvBroadcastViewProps {
  // Core props
  gameCode: string;
  username: string; // Host username
  roomLanguage: Language;
  roomName?: string;
  /** Translation function for i18n */
  t: (path: string, params?: Record<string, string | number>) => string;

  // Game state
  tableData: LetterGrid;
  remainingTime: number | null;
  timerValue: number; // in minutes

  // Players
  playersReady: (string | PlayerData)[];
  playerScores: Record<string, number>;
  playerWordCounts: Record<string, number>;

  // Socket
  socket: Socket | null;

  // Earthquake/Fire Round
  earthquakeState?: EarthquakeState;
  fireRoundActive?: boolean;
  fireRoundRemaining?: number;
}

// ==================== Component ====================

/**
 * TvBroadcastView - TV-optimized spectator view for multiplayer games
 * Shows when host is NOT playing - perfect for TV/projector display
 * Features:
 * - Kahoot-style join bar with QR code
 * - Large letter grid
 * - Live leaderboard with combo indicators
 * - Exciting real-time notifications
 */
const TvBroadcastView = memo<TvBroadcastViewProps>(({
  // Core props
  gameCode,
  username,
  roomName,
  t,

  // Game state
  tableData,
  remainingTime,
  timerValue,

  // Players
  playersReady,
  playerScores,
  playerWordCounts,

  // Socket
  socket,

  // Earthquake/Fire Round
  earthquakeState = 'idle',
  fireRoundActive = false,
  fireRoundRemaining = 0,
}) => {
  // CrazyGames platform detection - fullscreen is managed by CrazyGames, not us
  const { isOnCrazyGamesPlatform } = useCrazyGames();

  // Fullscreen mode - disabled on CrazyGames (they handle fullscreen)
  const { isFullscreen, toggleFullscreen, isSupported: isFullscreenSupported } = useTvFullscreen({
    enabled: !isOnCrazyGamesPlatform, // Disable on CrazyGames
  });

  // Show fullscreen button only when: supported AND not on CrazyGames platform
  const showFullscreenButton = isFullscreenSupported && !isOnCrazyGamesPlatform;

  // Tutorial state - only shown when help button is clicked
  // Note: Initial tutorial trigger is handled by HostPreGameView when user toggles TV mode
  const [showTutorial, setShowTutorial] = useState(false);

  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  const handleShowTutorial = () => {
    setShowTutorial(true);
  };

  // Track player combos
  const { playerCombos } = useTvPlayerCombos({
    socket,
    enabled: true,
  });

  // Sound effects
  const { playSound } = useTvSounds({
    enabled: true,
    volume: 0.7,
  });

  // Notifications with sound integration
  const { notifications, dismissNotification } = useTvNotifications({
    socket,
    enabled: true,
    onNotification: (notification) => {
      playSound(notification.tier);
    },
    t,
  });

  // Build leaderboard data
  const leaderboardData = useMemo(() => {
    return playersReady.map(player => {
      const playerUsername = typeof player === 'string' ? player : player.username;
      const avatar = typeof player === 'object' ? player.avatar : null;
      const isHost = typeof player === 'object' ? player.isHost : false;

      return {
        username: playerUsername,
        score: playerScores[playerUsername] || 0,
        wordCount: playerWordCounts[playerUsername] || 0,
        avatar: avatar || undefined,
        isHost: isHost || playerUsername === username,
      };
    })
      .filter(p => {
        // Filter out Host from TV leaderboard if they haven't found any words
        // This is crucial for "Broadcast Mode" where host is just managing
        if (p.isHost && p.wordCount === 0) {
          return false;
        }
        return true;
      });
  }, [playersReady, playerScores, playerWordCounts, username]);

  const isEarthquakeShaking = earthquakeState === 'shaking';

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy overflow-hidden relative">
      {/* Top Right Controls: Help + Fullscreen */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {/* Tutorial Help Button */}
        <TvHelpButton onClick={handleShowTutorial} t={t} />

        {/* Fullscreen Toggle Button - Hidden on CrazyGames (they manage fullscreen) */}
        {showFullscreenButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleFullscreen}
            className="bg-neo-black/80 hover:bg-neo-black text-neo-cream p-3 rounded-neo border-2 border-neo-cream/30 shadow-hard-sm transition-colors"
            title={isFullscreen ? t('tvBroadcast.exitFullscreen') : t('tvBroadcast.enterFullscreen')}
            aria-label={isFullscreen ? t('tvBroadcast.exitFullscreen') : t('tvBroadcast.enterFullscreen')}
          >
            {isFullscreen ? (
              <Minimize className="w-6 h-6" />
            ) : (
              <Maximize className="w-6 h-6" />
            )}
          </motion.button>
        )}
      </div>

      {/* Join Bar (Kahoot-style) - Always visible, even in fullscreen */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <TvJoinBar
          gameCode={gameCode}
          roomName={roomName}
          playerCount={leaderboardData.length}
          t={t}
        />
      </motion.div>

      {/* Game Header with Timer - Always visible */}
      <TvGameHeader
        remainingTime={remainingTime}
        timerValue={timerValue}
        fireRoundActive={fireRoundActive}
        fireRoundRemaining={fireRoundRemaining}
        earthquakeState={earthquakeState}
        t={t}
      />

      {/* Main Content: Grid + Leaderboard (50/50) - Using CSS Grid for reliable height distribution */}
      {/* On mobile portrait, stack vertically with more space for the grid */}
      <div className={`flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-[minmax(45%,1fr)_minmax(35%,auto)] md:grid-rows-[1fr] gap-2 md:gap-4 mx-auto w-full ${isFullscreen ? 'p-4' : 'p-2 md:p-4 max-w-[2000px]'}`}>
        {/* Left: Grid - fills grid cell and centers the square grid inside */}
        <div className="min-h-[180px] md:min-h-0 flex items-center justify-center bg-neo-cream text-neo-black rounded-neo border-3 md:border-4 border-neo-black shadow-hard-lg overflow-hidden">
          {tableData && Array.isArray(tableData) && tableData.length > 0 && tableData[0] && tableData[0].length > 0 ? (
            <TvGrid
              grid={tableData}
              fireRoundActive={fireRoundActive}
              earthquakeShaking={isEarthquakeShaking}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4" role="status" aria-live="polite">
              <p className="text-neo-black/50 font-bold text-lg md:text-xl text-center">{t('tvBroadcast.waitingForGame')}</p>
            </div>
          )}
        </div>

        {/* Right: Leaderboard - fills grid cell, needs overflow-auto for scrolling */}
        <div className="min-h-[120px] md:min-h-0 bg-neo-cream text-neo-black rounded-neo border-3 md:border-4 border-neo-black shadow-hard-lg overflow-auto">
          <TvLeaderboard
            players={leaderboardData}
            playerCombos={playerCombos}
            hostUsername={username}
            t={t}
          />
        </div>
      </div>

      {/* Notification Overlay */}
      <TvNotificationQueue
        notifications={notifications}
        onDismiss={dismissNotification}
        maxVisible={1}
      />

      {/* Tutorial Overlay - shown on first visit or when help button clicked */}
      <TvTutorialOverlay
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialComplete}
        t={t}
        forceShow={showTutorial}
      />
    </div>
  );
});

TvBroadcastView.displayName = 'TvBroadcastView';

export default TvBroadcastView;
