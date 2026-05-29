'use client';

import { memo, useMemo, useCallback, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Maximize, Minimize } from 'lucide-react';
import { Socket } from 'socket.io-client';
import TvResultsWinnersPodium from './TvResultsWinnersPodium';
import TvResultsStatsGrid from './TvResultsStatsGrid';
import TvResultsAwards from './TvResultsAwards';
import TvResultsPlayerSpotlight from './TvResultsPlayerSpotlight';
import TvResultsLeaderboard from './TvResultsLeaderboard';
import TvResultsControls from './TvResultsControls';
import TournamentStandings from '../../../components/TournamentStandings';
import PlayersReadyIndicator from '../../../components/results/PlayersReadyIndicator';
import { HostWordSelector } from '../../../components/multiplayer/HostWordSelector';
import BlastMpResults from '../../../components/blast/legacy/BlastMpResults';
import MpModeBreakdown from '../../../components/multiplayer/MpModeBreakdown';
import { useTvResultsAnimation, type SoundType } from './useTvResultsAnimation';
import { useTvFullscreen } from '../../hooks/useTvFullscreen';
import { useGameMode } from '@/hooks/gameState/store';
import { useLanguage } from '../../../contexts/LanguageContext';
import { aggregateRoundsFromResults } from '@/lib/multiplayer/mpRoundAggregation';
import { cn } from '../../../lib/utils';
import { DJMascotWithEntrance } from '../../../components/ui/DJMascot';
import { useSoundEffects } from '../../../contexts/SoundEffectsContext';
import { useMusic } from '../../../contexts/MusicContext';
import type { PlayerResult } from '@/types/components';
import type { TournamentStanding } from '@/shared/types/game';
import type { Language } from '@/shared/types';

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
  onClose: _onClose,
  t,
  socket = null,
  gameCode = '',
  language = 'en',
  isTeacher = false,
  allWords = [],
  gameMode: gameModeOverride,
}) => {
  const storeGameMode = useGameMode();
  const gameMode = gameModeOverride || storeGameMode;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { sfxMuted, sfxVolume } = useSoundEffects();
  const { isMuted: musicMuted, audioUnlocked } = useMusic();

  // Fullscreen mode support
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

  // Prepare data for sub-components
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

  const isTournament = !!tournamentData;
  const isLastRound = tournamentData?.isComplete ?? true;
  const showTournamentStandings = currentPhase === 'tournament-standings';

  return (
    <div className="fixed inset-0 bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 z-[60] overflow-hidden">
      {/* Fullscreen Toggle Button */}
      {isFullscreenSupported && (
        <m.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-[70] bg-neo-black/80 hover:bg-neo-black text-neo-cream p-3 rounded-neo border-2 border-neo-cream/30 shadow-hard-sm transition-colors"
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

      {/* Main Content */}
      <div className="relative h-full flex flex-col">
        {/* Header */}
        <AnimatePresence>
          {getPhaseVisibility('header') && (
            <m.header
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative shrink-0 py-6 px-8 text-center"
            >
              {/* DJ Mascot */}
              <div className="absolute bottom-0 left-4">
                <DJMascotWithEntrance size="lg" delay={0.5} />
              </div>

              <m.h1
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400 }}
                className={cn(
                  'font-black text-4xl md:text-5xl lg:text-6xl uppercase tracking-wide',
                  'text-transparent bg-clip-text',
                  'bg-linear-to-r from-neo-yellow via-neo-orange to-neo-pink'
                )}
              >
                {showTournamentStandings
                  ? `${t('tvResults.tournamentStandings')}`
                  : t('tvResults.title')}
              </m.h1>

              {isTournament && !showTournamentStandings && (
                <m.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.3 }}
                  className="text-neo-cream/70 font-bold mt-2"
                >
                  Round {tournamentData.currentRound} of {tournamentData.totalRounds}
                </m.p>
              )}
            </m.header>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden px-6 pb-32">
          {showTournamentStandings ? (
            // Tournament Standings View
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex items-center justify-center"
            >
              <div className="w-full max-w-3xl">
                {tournamentData?.standings && (
                  <TournamentStandings
                    standings={tournamentData.standings}
                    currentRound={tournamentData.currentRound}
                    totalRounds={tournamentData.totalRounds}
                    isComplete={tournamentData.isComplete}
                  />
                )}
              </div>
            </m.div>
          ) : gameMode === 'blast' ? (
            // Blast Results View
            <div className="h-full overflow-y-auto space-y-6 max-w-4xl mx-auto py-4">
              {/* Blast Results */}
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
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
              </m.div>

              {/* MP Mode Breakdown */}
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
              >
                <MpModeBreakdown rounds={[]} />
              </m.div>
            </div>
          ) : (
            // Regular Results View
            <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {/* Left Column: Podium & Awards */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Winners Podium */}
                <div className="shrink-0">
                  <TvResultsWinnersPodium
                    players={podiumPlayers}
                    show3rd={getPhaseVisibility('podium-3rd')}
                    show2nd={getPhaseVisibility('podium-2nd')}
                    show1st={getPhaseVisibility('podium-1st')}
                    showConfetti={getPhaseVisibility('confetti')}
                    t={t}
                  />
                </div>

                {/* Awards */}
                <div className="flex-1 overflow-hidden">
                  <TvResultsAwards
                    players={playerData}
                    visible={getPhaseVisibility('awards')}
                    gameDuration={gameDuration}
                    t={t}
                  />
                </div>

                {/* Player Spotlight */}
                <div className="shrink-0">
                  <TvResultsPlayerSpotlight
                    players={playerData}
                    visible={getPhaseVisibility('player-spotlight')}
                    gameDuration={gameDuration}
                    t={t}
                  />
                </div>
              </div>

              {/* Right Column: Stats & Leaderboard */}
              <div className="flex flex-col gap-6">
                {/* Game Stats */}
                <div className="shrink-0">
                  <TvResultsStatsGrid
                    players={playerData}
                    visible={getPhaseVisibility('stats')}
                    t={t}
                  />
                </div>

                {/* Full Leaderboard (4th place and below) */}
                {filteredScores.length > 3 && (
                  <div className="flex-1 overflow-hidden">
                    <TvResultsLeaderboard
                      players={leaderboardPlayers}
                      visible={getPhaseVisibility('leaderboard')}
                      startRank={4}
                      maxVisible={10}
                      t={t}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Players Ready Indicator - Bigger for TV display */}
        {filteredScores.length > 0 && (
          <div className="px-8 py-6">
            <div className="max-w-6xl mx-auto">
              <div className="transform scale-125 origin-center">
                <PlayersReadyIndicator
                  players={filteredScores.map(p => ({
                    username: p.username,
                    avatar: p.avatar,
                    isBot: p.isBot
                  }))}
                  readyUsernames={playersReady?.readyUsernames ?? []}
                  currentUsername=""
                  isHost={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Teacher Word Selector - Only for teachers */}
        {isTeacher && allWords.length > 0 && (
          <div className="px-8 py-4">
            <div className="max-w-6xl mx-auto">
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

        {/* Controls Bar - visible as soon as header phase starts so host can skip/play again */}
        <TvResultsControls
          visible={getPhaseVisibility('header')}
          isAnimating={isAnimating}
          isTournament={isTournament}
          isLastRound={isLastRound}
          playersReadyCount={playersReady?.readyCount ?? 0}
          totalPlayers={playersReady?.totalPlayers ?? 0}
          onSkip={skipToEnd}
          onStartNewGame={onStartNewGame}
          onNextRound={onNextRound}
          onShowQR={onShowQR}
          t={t}
        />
      </div>
    </div>
  );
});

TvResultsView.displayName = 'TvResultsView';

export default TvResultsView;
