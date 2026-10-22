'use client';

import { memo, useMemo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { Socket } from 'socket.io-client';
import TvResultsArcadeStage from './TvResultsArcadeStage';
import TvResultsTopBar from './TvResultsTopBar';
import TvResultsControls from './TvResultsControls';
import TournamentStandings from '../../../components/TournamentStandings';
import { HostWordSelector } from '../../../components/multiplayer/HostWordSelector';
import BlastMpResults from '../../../components/blast/legacy/BlastMpResults';
import MpModeBreakdown from '../../../components/multiplayer/MpModeBreakdown';
import { useTvResultsAnimation, type SoundType } from './useTvResultsAnimation';
import { useTvFullscreen } from '../../hooks/useTvFullscreen';
import { useGameMode } from '@/hooks/gameState/store';
import { cn } from '../../../lib/utils';
import { useSoundEffects } from '../../../contexts/SoundEffectsContext';
import { useMusic } from '../../../contexts/MusicContext';
import type { PlayerResult } from '@/types/components';
import type { TournamentStanding } from '@/shared/types/game';
import type { Language } from '@/shared/types';
import type { ClassroomSummary } from '@/shared/types/classroom';
import ClassroomTvResultsScreen from './ClassroomTvResultsScreen';

// Sound paths for results
const RESULTS_SOUNDS: Record<SoundType, string> = {
  whoosh: '/sounds/message.mp3',
  pop: '/sounds/word-accepted.wav',
  fanfare: '/sounds/achievement.mp3',
  victory: '/sounds/fire-round-start.wav',
  ding: '/sounds/achievement.mp3',
  ready: '/sounds/word-accepted.wav',
};

interface TournamentData {
  currentRound: number;
  totalRounds: number;
  isComplete: boolean;
  standings?: TournamentStanding[];
}

interface PlayersReadyData {
  readyCount: number;
  totalPlayers: number;
  readyUsernames?: string[];
}

interface TvResultsViewProps {
  finalScores: PlayerResult[];
  tournamentData: TournamentData | null;
  username: string; // Host username - to filter out
  playersReady?: PlayersReadyData | null;
  gameDuration?: number; // in seconds
  onStartNewGame: () => void;
  onNextRound: () => void;
  onShowQR: () => void;
  /** Optional close handler - reserved for future use */
  onClose?: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  /** Socket.IO client instance for vocabulary selection */
  socket?: Socket | null;
  /** Game code for vocabulary selection */
  gameCode?: string;
  /** Game language */
  language?: Language;
  /** Whether current user is a teacher */
  isTeacher?: boolean;
  /** All words found during the game */
  allWords?: Array<{ word: string; score: number; foundBy?: string[] }>;
  /** Current game mode (from store) */
  gameMode?: string;
  /**
   * Server-built lesson recap. Present ONLY for a classroom game — a classroom
   * host is forced into broadcast mode and so never reaches ResultsPage, which
   * means this view is the teacher's whole end-of-game moment.
   */
  classroomSummary?: ClassroomSummary;
  /** Classroom only: the host's confirmed exit, offered as "Back to class". */
  onExitRoom?: () => void;
}

/**
 * TvResultsView - Main TV broadcast results orchestrator
 * Full-screen Kahoot-style celebration view for host broadcast mode
 * Auto-advances through phases with sound effects
 */
const TvResultsView = memo<TvResultsViewProps>(({
  finalScores,
  tournamentData,
  username,
  playersReady,
  gameDuration = 180,
  onStartNewGame,
  onNextRound,
  onShowQR,
  // Was unused (`_onClose`) while the arcade layout had no dismiss. The
  // classroom branch below needs it: its layer is opaque and covers the
  // projector lobby, so without a way out the teacher must reload to change
  // the next round's game.
  onClose,
  t,
  socket = null,
  gameCode = '',
  language = 'en',
  isTeacher = false,
  allWords = [],
  gameMode: gameModeOverride,
  classroomSummary,
  onExitRoom,
}) => {
  const storeGameMode = useGameMode();
  const gameMode = gameModeOverride || storeGameMode;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { sfxMuted, sfxVolume } = useSoundEffects();
  const { isMuted: musicMuted, audioUnlocked } = useMusic();

  const { isFullscreen, toggleFullscreen, isSupported: isFullscreenSupported } = useTvFullscreen({
    enabled: true,
  });

  // Filter out host from results (they're not playing in broadcast mode)
  const filteredScores = useMemo(() => {
    if (!finalScores) return [];

    return finalScores
      .filter(p => {
        // Always exclude host from broadcast results - host is not a player
        const isHostUser = p.username === username || p.isHost;
        return !isHostUser;
      })
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        ...player,
        rank: index + 1,
      }));
  }, [finalScores, username]);

  // Play sound effect - respects global mute settings
  const playSound = useCallback((sound: SoundType) => {
    if (typeof window === 'undefined') return;

    // Respect mute settings - don't play if either music or SFX is muted
    if (!audioUnlocked || sfxMuted || musicMuted) return;

    try {
      const path = RESULTS_SOUNDS[sound];
      if (!path) return;

      if (audioRef.current) {
        audioRef.current.pause();
      }

      audioRef.current = new Audio(path);
      // Use SFX volume setting instead of hardcoded value
      audioRef.current.volume = sfxVolume * 0.7;
      audioRef.current.play().catch(() => {
        // Silently fail if autoplay is blocked
      });
    } catch (error) {
      // Silently fail
    }
  }, [audioUnlocked, sfxMuted, musicMuted, sfxVolume]);

  // Notify players when TV reveal animation is done
  const revealSentRef = useRef(false);
  const handlePhaseChange = useCallback((phase: string) => {
    if (phase === 'controls' && !revealSentRef.current && socket?.connected) {
      revealSentRef.current = true;
      socket.emit('resultsRevealed');
    }
  }, [socket]);

  // Animation orchestration
  const {
    currentPhase,
    isAnimating,
    skipToEnd,
    getPhaseVisibility,
  } = useTvResultsAnimation({
    enabled: true,
    autoAdvance: true,
    isTournament: !!tournamentData,
    playerCount: filteredScores.length,
    onSound: playSound,
    onPhaseChange: handlePhaseChange,
  });

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const podiumPlayers = useMemo(() => {
    return filteredScores.slice(0, 3).map(p => ({
      username: p.username,
      score: p.score,
      avatar: p.avatar,
      wordCount: p.wordsFoundCount ?? p.allWords?.length ?? 0,
    }));
  }, [filteredScores]);

  const playerData = useMemo(() => {
    return filteredScores.map(p => ({
      username: p.username,
      score: p.score,
      avatar: p.avatar,
      allWords: p.allWords,
    }));
  }, [filteredScores]);

  const leaderboardPlayers = useMemo(() => {
    return filteredScores.map(p => ({
      username: p.username,
      score: p.score,
      avatar: p.avatar,
      wordCount: p.wordsFoundCount ?? p.allWords?.length ?? 0,
      rank: p.rank || 0,
    }));
  }, [filteredScores]);

  const readySet = useMemo(() => new Set(playersReady?.readyUsernames ?? []), [playersReady?.readyUsernames]);

  const isTournament = !!tournamentData;
  const isLastRound = tournamentData?.isComplete ?? true;
  const showTournamentStandings = currentPhase === 'tournament-standings';

  // A classroom round leaves HERE, before the arcade chrome. Two reasons, both
  // learned the hard way: this root sits at z-[60] and the projector LOBBY
  // (also `fixed inset-0`, also opaque) sits at z-[65], so for the whole time
  // the celebration was up the room was looking at the lobby painted over it;
  // and the wrapper stacks a gradient ground, a DJ mascot, an install QR, a
  // ready strip, a word selector and a controls bar around the recap, which is
  // eight things too many on a wall thirty children are reading at once.
  // The general game's results are untouched below.
  if (classroomSummary) {
    return (
      <ClassroomTvResultsScreen summary={classroomSummary} players={finalScores} onRematch={onStartNewGame} onClose={onClose} onExitRoom={onExitRoom} gameCode={gameCode} socket={socket} t={t} />
    );
  }

  const readyPlayers = filteredScores.map(p => ({
    username: p.username,
    avatar: p.avatar,
    isBot: p.isBot,
    ready: readySet.has(p.username),
  }));

  const stageFallback = (children: ReactNode, className: string) => (
    <main data-testid="tv-results-stage" className={cn('min-h-0 flex-1 px-6 pb-4', className)}>{children}</main>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div data-testid="tv-results-root" className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-neo-navy">
        <TvResultsTopBar
          title={showTournamentStandings ? t('tvResults.tournamentStandings') : t('tvResults.title')}
          subtitle={isTournament && !showTournamentStandings && tournamentData
            ? t('tvResults.roundOf', { current: tournamentData.currentRound, total: tournamentData.totalRounds })
            : undefined}
          showTitle={getPhaseVisibility('header')}
          language={language}
          fullscreen={{ supported: isFullscreenSupported, active: isFullscreen, toggle: toggleFullscreen }}
          t={t}
        />

        {showTournamentStandings ? stageFallback(
          <div className="mx-auto flex h-full w-full max-w-3xl items-center">
            {tournamentData?.standings && (
              <TournamentStandings
                standings={tournamentData.standings}
                currentRound={tournamentData.currentRound}
                totalRounds={tournamentData.totalRounds}
                isComplete={tournamentData.isComplete}
              />
            )}
          </div>,
          'flex items-center justify-center'
        ) : gameMode === 'blast' ? stageFallback(
          <div className="mx-auto max-w-4xl space-y-6 py-4">
            <BlastMpResults
              results={filteredScores.map(p => ({
                username: p.username,
                score: p.score,
                wordsFoundCount: p.wordsFoundCount ?? 0,
                tilesCleared: 0,
                bestCombo: 0,
                boardCleared: (p as { boardCleared?: boolean }).boardCleared,
              }))}
              gameMode="blast"
            />
            <MpModeBreakdown rounds={[]} />
          </div>,
          'overflow-y-auto'
        ) : (
          <TvResultsArcadeStage
            podiumPlayers={podiumPlayers}
            players={playerData}
            rankedPlayers={leaderboardPlayers}
            gameDuration={gameDuration}
            isVisible={getPhaseVisibility}
            t={t}
          />
        )}

        {isTeacher && allWords.length > 0 && (
          <div className="shrink-0 px-8 py-2">
            <div className="mx-auto max-w-6xl">
              <HostWordSelector
                socket={socket}
                gameCode={gameCode}
                language={language}
                isHost={true}
                gameState="finished"
                allWords={allWords}
                t={t}
              />
            </div>
          </div>
        )}

        <TvResultsControls
          visible={getPhaseVisibility('header')}
          isAnimating={isAnimating}
          isTournament={isTournament}
          isLastRound={isLastRound}
          playersReadyCount={playersReady?.readyCount ?? 0}
          totalPlayers={playersReady?.totalPlayers ?? 0}
          readyPlayers={readyPlayers}
          onSkip={skipToEnd}
          onStartNewGame={onStartNewGame}
          onNextRound={onNextRound}
          onShowQR={onShowQR}
          t={t}
        />
      </div>
    </MotionConfig>
  );
});

TvResultsView.displayName = 'TvResultsView';

export default TvResultsView;
