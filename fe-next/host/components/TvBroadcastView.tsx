'use client';

import { memo, useMemo, useState, useRef, useEffect } from 'react';
import { fireConfetti } from '@/utils/confettiUtils';
import type { Socket } from 'socket.io-client';
import { Maximize, Minimize } from 'lucide-react';
import { AnimatePresence, m } from 'framer-motion';
import TvTutorialOverlay, { TvHelpButton } from './tv-broadcast/TvTutorialOverlay';
import TvJoinBar from './tv-broadcast/TvJoinBar';
import TvGameHeader from './tv-broadcast/TvGameHeader';
import TvLeaderboard from './tv-broadcast/TvLeaderboard';
import TvActivityPanel from './tv-broadcast/TvActivityPanel';
import TvMomentumTicker from './tv-broadcast/TvMomentumTicker';
import TvNotificationQueue from './tv-broadcast/TvNotificationQueue';
import TvTimesUpOverlay from './tv-broadcast/TvTimesUpOverlay';
import { useTvPlayerCombos } from '../hooks/useTvPlayerCombos';
import { useTvNotifications } from '../hooks/useTvNotifications';
import { useTvSounds } from '../hooks/useTvSounds';
import { useTvFullscreen } from '../hooks/useTvFullscreen';
import { useTvFinalMinute } from '../hooks/useTvFinalMinute';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import {
  useGameMode,
  useWordHuntPlayerLives,
  useWordHuntEliminatedPlayers,
  useWordHuntTargetLength,
} from '@/hooks/gameState/store';
import Image from 'next/image';
import type { Language, LetterGrid, Avatar as AvatarType } from '@/shared/types/game';
import type { EarthquakeState } from '@/shared/types/earthquake';

// ==================== Background Assets ====================
const MODE_BACKGROUNDS: Record<string, string> = {
  classic: '/images/tv-broadcast/bg-classic-arena.png',
  blast: '/images/tv-broadcast/bg-blast-volcano.png',
  'word-hunt': '/images/tv-broadcast/bg-wordhunt-jungle.png',
};

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
  tableData?: LetterGrid;
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
 * - Live leaderboard with combo indicators
 * - Final minute urgency effects
 * - Exciting real-time notifications
 */
const TvBroadcastView = memo<TvBroadcastViewProps>(({
  // Core props
  gameCode,
  username,
  roomLanguage,
  roomName,
  t,

  // Game state
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
  // Mode-overlay state read directly from store — keeps HostView from
  // re-rendering on word-hunt updates when the host isn't using TV broadcast.
  const wordHuntPlayerLives = useWordHuntPlayerLives();
  const wordHuntEliminatedPlayers = useWordHuntEliminatedPlayers();
  const wordHuntTargetLength = useWordHuntTargetLength();

  // CrazyGames platform detection - fullscreen is managed by CrazyGames, not us
  const { isOnCrazyGamesPlatform } = useCrazyGames();

  // Fullscreen mode - disabled on CrazyGames (they handle fullscreen)
  const { isFullscreen, toggleFullscreen, isSupported: isFullscreenSupported } = useTvFullscreen({
    enabled: !isOnCrazyGamesPlatform, // Disable on CrazyGames
  });

  // Show fullscreen button only when: supported AND not on CrazyGames platform
  const showFullscreenButton = isFullscreenSupported && !isOnCrazyGamesPlatform;

  // Tutorial state - only shown when help button is clicked
  const [showTutorial, setShowTutorial] = useState(false);
  // Final minute banner state
  const [showFinalMinuteBanner, setShowFinalMinuteBanner] = useState(false);
  const finalMinuteBannerShownRef = useRef(false);

  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  const handleShowTutorial = () => {
    setShowTutorial(true);
  };

  // Game mode from store
  const gameMode = useGameMode();

  // Final minute hook
  const { isFinalMinute, urgencyLevel, bgTintClass } = useTvFinalMinute(remainingTime);

  // Show "FINAL MINUTE" banner once when isFinalMinute turns true
  useEffect(() => {
    if (isFinalMinute && !finalMinuteBannerShownRef.current) {
      finalMinuteBannerShownRef.current = true;
      setShowFinalMinuteBanner(true);
      const timer = setTimeout(() => setShowFinalMinuteBanner(false), 2500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isFinalMinute]);

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

  // Times-up sound from global SFX context
  const { playTimesUpSound } = useSoundEffects();

  // Notifications with sound integration
  const { notifications, dismissNotification } = useTvNotifications({
    socket,
    enabled: true,
    onNotification: (notification) => {
      playSound(notification.tier);
      if (notification.tier === 'mega') {
        fireConfetti();
      }
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
        if (p.isHost && p.wordCount === 0) {
          return false;
        }
        return true;
      });
  }, [playersReady, playerScores, playerWordCounts, username]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy overflow-hidden relative">
      {/* Dynamic mode background */}
      {gameMode && MODE_BACKGROUNDS[gameMode] && (
        <div className="absolute inset-0 z-0" aria-hidden="true">
          <Image
            src={MODE_BACKGROUNDS[gameMode]}
            alt=""
            fill
            className="object-cover opacity-20"
            priority
            sizes="100vw"
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-neo-navy/60" />
        </div>
      )}

      {/* Earthquake cracks overlay */}
      <AnimatePresence>
        {earthquakeState === 'shaking' && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-15 pointer-events-none mix-blend-screen"
            aria-hidden="true"
          >
            <Image
              src="/images/tv-broadcast/fx-earthquake-cracks.png"
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
          </m.div>
        )}
      </AnimatePresence>

      {/* Background tint overlay for final minute urgency */}
      {bgTintClass && (
        <div
          className={`absolute inset-0 ${bgTintClass} pointer-events-none z-10 transition-colors duration-1000`}
          data-testid="urgency-tint"
        />
      )}

      {/* Final Minute Banner */}
      <AnimatePresence>
        {showFinalMinuteBanner && (
          <m.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-neo-red text-neo-cream px-8 py-4 rounded-neo border-3 border-neo-black shadow-hard-lg"
            data-testid="final-minute-banner"
          >
            <p className="font-black text-2xl uppercase tracking-wider text-center">
              {t('tvBroadcast.notifications.finalMinute')}
            </p>
            <p className="text-sm font-bold text-center opacity-80">
              {t('tvBroadcast.notifications.everySecondCounts')}
            </p>
          </m.div>
        )}
      </AnimatePresence>

      {/* Top Right Controls: Help + Fullscreen */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {/* Tutorial Help Button */}
        <TvHelpButton onClick={handleShowTutorial} t={t} />

        {/* Fullscreen Toggle Button - Hidden on CrazyGames (they manage fullscreen) */}
        {showFullscreenButton && (
          <m.button
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
          </m.button>
        )}
      </div>

      {/* Join Bar (Kahoot-style) - Always visible, even in fullscreen */}
      <m.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      >
        <TvJoinBar
          gameCode={gameCode}
          roomName={roomName}
          playerCount={leaderboardData.length}
          language={roomLanguage}
          t={t}
        />
      </m.div>

      {/* Game Header with Timer - Always visible */}
      <TvGameHeader
        remainingTime={remainingTime}
        timerValue={timerValue}
        fireRoundActive={fireRoundActive}
        fireRoundRemaining={fireRoundRemaining}
        earthquakeState={earthquakeState}
        urgencyLevel={urgencyLevel}
        gameMode={gameMode}
        wordHuntTargetLength={wordHuntTargetLength}
        wordHuntAliveCount={Object.keys(wordHuntPlayerLives).length - wordHuntEliminatedPlayers.length}
        t={t}
      />

      {/* Momentum Ticker — auto-generated commentary */}
      <TvMomentumTicker
        playerScores={playerScores}
        playerWordCounts={playerWordCounts}
        t={t}
      />

      {/* Fire Round Overlay — dramatic flame image + edge gradients */}
      <AnimatePresence>
        {fireRoundActive && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 pointer-events-none z-20"
            data-testid="fire-round-overlay"
            aria-hidden="true"
          >
            {/* Fire frame overlay — illustrated flames on all edges */}
            <m.div
              className="absolute inset-0"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src="/images/tv-broadcast/fx-fire-frame.png"
                alt=""
                fill
                className="object-cover mix-blend-screen"
                sizes="100vw"
              />
            </m.div>
            {/* Bottom fire flames */}
            <m.div
              className="absolute bottom-0 left-0 right-0 h-48"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src="/images/tv-broadcast/tv-fire-overlay.png"
                alt=""
                fill
                className="object-cover object-top mix-blend-screen"
                sizes="100vw"
              />
            </m.div>
            {/* Heat vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(255,80,0,0.2)_100%)]" />
          </m.div>
        )}
      </AnimatePresence>

      {/* Main Content: Activity Panel + Leaderboard */}
      <div className={`flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-[1fr_1fr] md:grid-rows-[1fr] gap-2 md:gap-4 mx-auto w-full ${isFullscreen ? 'p-4' : 'p-2 md:p-4 max-w-[2000px]'}`}>
        {/* Left: Mode-specific Activity Panel (anti-spoiler: grid removed) */}
        <div className="min-h-[180px] md:min-h-0 overflow-hidden">
          <TvActivityPanel
            playerScores={playerScores}
            playerWordCounts={playerWordCounts}
            socket={socket}
            t={t}
            fireRoundActive={fireRoundActive}
            earthquakeShaking={earthquakeState === 'shaking'}
            wordHuntTargetLength={wordHuntTargetLength}
            wordHuntAliveCount={Object.keys(wordHuntPlayerLives).length - wordHuntEliminatedPlayers.length}
            wordHuntTotalPlayers={Object.keys(wordHuntPlayerLives).length}
          />
        </div>

        {/* Right: Leaderboard - fills grid cell, needs overflow-auto for scrolling */}
        <div className="min-h-[120px] md:min-h-0 bg-neo-cream text-neo-black rounded-neo border-3 md:border-4 border-neo-black shadow-hard-lg overflow-auto">
          <TvLeaderboard
            players={leaderboardData}
            playerCombos={playerCombos}
            hostUsername={username}
            gameMode={gameMode}
            wordHuntPlayerLives={wordHuntPlayerLives}
            wordHuntEliminatedPlayers={wordHuntEliminatedPlayers}
            t={t}
          />
        </div>
      </div>

      {/* Countdown + TIME'S UP overlay */}
      <TvTimesUpOverlay
        remainingTime={remainingTime}
        t={t}
        onTimesUp={() => {
          playTimesUpSound();
          fireConfetti();
        }}
      />

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
