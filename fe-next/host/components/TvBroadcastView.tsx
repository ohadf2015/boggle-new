'use client';

import { memo, useMemo, useState, useRef, useEffect } from 'react';
import { fireConfetti } from '@/utils/confettiUtils';
import type { Socket } from 'socket.io-client';
import { Maximize, Minimize } from 'lucide-react';
import { m } from 'framer-motion';
import TvTutorialOverlay, { TvHelpButton } from './tv-broadcast/TvTutorialOverlay';
import TvJoinBar from './tv-broadcast/TvJoinBar';
import TvGameHeader from './tv-broadcast/TvGameHeader';
import TvBattleBar from './tv-broadcast/TvBattleBar';
import type { ClassroomLiveContext } from '@/shared/utils/classroomLiveContext';
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
import { VocabQuizHostView } from '@/components/education/vocabQuiz/VocabQuizHostView';
import { useIsVocabQuizRoom } from '@/components/education/vocabQuiz/useIsVocabQuizRoom';
import { TEACHER_CONTROLS_INSET } from '@/components/education/controls/teacherBarInset';
import { ClassroomLivePanel } from '@/components/education/projector/ClassroomLivePanel';
import TvRoundFxLayers from './tv-broadcast/TvRoundFxLayers';
import TvWordcraftBroadcast from './tv-broadcast/TvWordcraftBroadcast';
import TvBodyScroller from './tv-broadcast/TvBodyScroller';
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

const EMPTY_WORDS: string[] = [];

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

  /**
   * What the class is playing this round — lesson, round number, format, team
   * rosters. Null outside classroom games, which is every public room.
   */
  classroomLive?: ClassroomLiveContext | null;
  /** Quiz finale "Play Again" — the host's rematch; without it the teacher is stranded. */
  onQuizPlayAgain?: () => void;
  /** Classroom only: the lesson's words, for the live "lesson words found" meter. */
  lessonWords?: string[];
  /** Classroom only: the host's confirmed exit, offered on the quiz finale. */
  onExitRoom?: () => void;
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
  classroomLive = null,
  onQuizPlayAgain,
  lessonWords = EMPTY_WORDS,
  onExitRoom,
}) => {
  // Mode-overlay state read directly from store — keeps HostView from
  // re-rendering on word-hunt updates when the host isn't using TV broadcast.
  const wordHuntPlayerLives = useWordHuntPlayerLives();
  const wordHuntEliminatedPlayers = useWordHuntEliminatedPlayers();
  const wordHuntTargetLength = useWordHuntTargetLength();

  // Is this room running a live Vocab Quiz? Detected from the server's quiz
  // traffic — the quiz is not a `GameMode`, so the room's mode cannot say.
  const isVocabQuizRoom = useIsVocabQuizRoom(socket);

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

  // Live Vocab Quiz — the classroom projector. A classroom teacher runs the room
  // as a NON-PLAYING host, the only way to reach this component (the quiz was
  // first wired only into `HostInGameView`, which a teacher never renders).
  // The quiz has no letter grid and is deliberately not a `GameMode` (see
  // shared/types/vocabQuiz), so the room's mode stays whatever the lobby last
  // held — the server's quiz traffic is the signal, exactly as on the playing
  // host's path.
  // The teacher's live control strip is docked to the bottom of the viewport and
  // publishes its own height on <html>; reserving that space here is what keeps
  // it off the board and the leaderboard instead of floating over them.

  if (isVocabQuizRoom) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-neo-navy" style={TEACHER_CONTROLS_INSET}>
        <VocabQuizHostView
          socket={socket}
          joinCode={gameCode}
          playerCount={leaderboardData.length}
          onPlayAgain={onQuizPlayAgain}
          onBackToClass={onExitRoom}
          t={t}
        />
      </div>
    );
  }

  const isClassroom = !!classroomLive;
  const roomWordTotal = leaderboardData.reduce((sum, p) => sum + p.wordCount, 0);
  const fullscreenButton = showFullscreenButton ? (
    <m.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleFullscreen}
      data-testid="tv-fullscreen-toggle"
      className="bg-neo-black/80 hover:bg-neo-black text-neo-cream p-3 rounded-neo border-2 border-neo-cream/30 shadow-hard-sm transition-colors"
      title={isFullscreen ? t('tvBroadcast.exitFullscreen') : t('tvBroadcast.enterFullscreen')}
      aria-label={isFullscreen ? t('tvBroadcast.exitFullscreen') : t('tvBroadcast.enterFullscreen')}
    >
      {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
    </m.button>
  ) : null;
  // Classroom: the fullscreen toggle rides inside the join bar so nothing floats over the code or QR.
  const joinBar = (
    <TvJoinBar
      gameCode={gameCode}
      roomName={roomName}
      playerCount={leaderboardData.length}
      language={roomLanguage}
      t={t}
      dense={isClassroom}
      trailing={isClassroom ? fullscreenButton : undefined}
    />
  );

  if (gameMode === 'wordcraft') {
    return <TvWordcraftBroadcast joinBar={joinBar} socket={socket} leaderboard={leaderboardData} remainingTime={remainingTime} t={t} />;
  }

  return (
    <div
      className="flex-1 flex flex-col min-h-0 bg-neo-navy overflow-hidden relative isolate"
      style={TEACHER_CONTROLS_INSET}
    >
      {/* Mode art at -z-10 inside an isolated root: under the board, never a 60% navy veil over it. */}
      {gameMode && MODE_BACKGROUNDS[gameMode] && (
        <div data-testid="tv-mode-backdrop" className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
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

      <TvRoundFxLayers
        earthquakeShaking={earthquakeState === 'shaking'}
        bgTintClass={bgTintClass}
        showFinalMinuteBanner={showFinalMinuteBanner}
        fireRoundActive={fireRoundActive}
        t={t}
      />

      {/* Top Right Controls: Help + Fullscreen (arcade; a classroom carries fullscreen in the join bar) */}
      {!isClassroom && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <TvHelpButton onClick={handleShowTutorial} t={t} />
          {fullscreenButton}
        </div>
      )}

      {/* Join Bar (Kahoot-style) - Always visible, even in fullscreen */}
      <m.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      >
        {joinBar}
      </m.div>

      <TvBodyScroller>
      {/* Game Header with Timer - Always visible */}
      <TvGameHeader
        compact={isClassroom}
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

      {/* Classroom state sentence: which lesson, which round, which format —
          and, in a team battle, the live tug-of-war. Renders nothing in a
          public room. */}
      <TvBattleBar classroom={classroomLive} players={leaderboardData} t={t} />

      {/* Momentum Ticker — auto-generated commentary */}
      <div data-testid="tv-momentum-slot" className={isClassroom ? 'hidden md:block' : undefined}>
        <TvMomentumTicker
          playerScores={playerScores}
          playerWordCounts={playerWordCounts}
          t={t}
        />
      </div>

      <div className={`${isClassroom ? 'shrink-0 md:shrink md:flex-1 md:min-h-0 grid-rows-[auto_auto]' : 'flex-1 min-h-0 grid-rows-[1fr_1fr]'} grid grid-cols-1 md:grid-cols-2 md:grid-rows-[1fr] gap-2 md:gap-4 mx-auto w-full ${isFullscreen ? 'p-4' : 'p-2 md:p-4 max-w-[2000px]'}`}>
        <div className={isClassroom ? 'md:min-h-0 md:overflow-hidden' : 'min-h-[180px] md:min-h-0 overflow-hidden'}>
          {isClassroom && gameMode !== 'word-hunt' ? (
            <ClassroomLivePanel
              socket={socket}
              totalWords={roomWordTotal}
              lessonWords={lessonWords}
              hostUsername={username}
              t={t}
            />
          ) : (
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
          )}
        </div>
        <div
          data-testid="tv-leaderboard-card"
          className={`min-h-[120px] md:min-h-0 bg-neo-cream text-neo-black rounded-neo border-3 md:border-4 border-neo-black shadow-hard-lg ${isClassroom ? 'md:overflow-auto' : 'overflow-auto'}`}
        >
          <TvLeaderboard
            players={leaderboardData}
            teams={classroomLive?.teams}
            classroom={!!classroomLive}
            playerCombos={playerCombos}
            hostUsername={username}
            gameMode={gameMode}
            wordHuntPlayerLives={wordHuntPlayerLives}
            wordHuntEliminatedPlayers={wordHuntEliminatedPlayers}
            t={t}
          />
        </div>
      </div>
      </TvBodyScroller>

      {/* Countdown + TIME'S UP overlay */}
      <TvTimesUpOverlay
        remainingTime={remainingTime}
        t={t}
        onTimesUp={() => {
          playTimesUpSound();
          // A round nobody scored in ends on the buzzer, not a party.
          if (leaderboardData.some((p) => p.score > 0)) fireConfetti();
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
