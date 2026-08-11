'use client';

import React, { useMemo, useEffect, useState, useCallback, useDeferredValue, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { m, AnimatePresence } from 'framer-motion';
import { FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import ExitRoomButton from '@/components/ExitRoomButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { clearSessionPreservingUsername } from '@/utils/session';
import { getGuestStatsSummary } from '@/utils/guestManager';
import { useFirstWinCelebration } from '@/hooks/useFirstWinCelebration';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import logger from '@/utils/logger';
import type { ResultsPageProps } from '@/types/components';
import { useResultsSocketEvents } from '@/components/results/useResultsSocketEvents';
import { useResultsData } from '@/hooks/useResultsData';
import { PreResultFanfare } from '@/components/results/PreResultFanfare';
import { shouldPlayPreResultFanfare } from '@/lib/native/webViewLayerFlash';
import { pickCelebrationKind } from '@/components/mascot/celebrationKind';
import type { MascotCelebrationKind } from '@/components/mascot/MascotCelebrationVideo';
import { useResultsSideEffects } from '@/hooks/useResultsSideEffects';
import { useShareOpenGuard } from '@/hooks/useShareOpenGuard';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useMultiplayerSignupNudge } from '@/hooks/useMultiplayerSignupNudge';
import { useIsGuest } from '@/hooks/useIsGuest';
import { ResultsParallaxBackdrop, ResultsSectionReveal, ResultsScrollProgressRail, ResultsHeroTilt } from '@/components/results/ResultsScrollEffects';
import { FloatingReaction } from '@/components/game/QuickReactions';
import { useQuickReactions } from '@/hooks/useQuickReactions';
import { useObservedHeight } from '@/hooks/useObservedHeight';

const PostGameEngagement = dynamic(() => import('@/components/growth/PostGameEngagement'), { ssr: false });
const DailyChallengeInvite = dynamic(() => import('@/components/growth/DailyChallengeInvite').then(m => m.DailyChallengeInvite), { ssr: false });
const GlobalRankBadge = dynamic(() => import('@/components/multiplayer/GlobalRankBadge').then(m => m.GlobalRankBadge), { ssr: false });
const MultiplayerSignupSheet = dynamic(() => import('@/components/auth/MultiplayerSignupSheet'), { ssr: false });
const SignupToast = dynamic(() => import('@/components/auth/SignupToast'), { ssr: false });
// MobileTabBar replaced by inline floating pill for results page

// Shared result components
import { ResultsModals } from '@/components/results/ResultsModals';
import { ResultsMainContent, type ResultsMainContentProps } from '@/components/results/ResultsMainContent';
import { shouldShowDailyInvite } from '@/lib/results/shouldShowDailyInvite';
import { ResultsDetailsContent, type ResultsDetailsContentProps } from '@/components/results/ResultsDetailsContent';
import { PostRoundSummary } from '@/components/results/PostRoundSummary';
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';
import type { WordHuntResultsSummaryProps } from '@/components/results/WordHuntResultsSummary';
const StickyReadyBar = dynamic(() => import('@/components/results/StickyReadyBar'), { ssr: false });
import { ResultsFriendStatusProvider } from '@/components/results/ResultsFriendStatus';
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import { DIFFICULTIES } from '@/utils/consts';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { useGameKeyboardShortcuts } from '@/hooks/useGameKeyboardShortcuts';
import type { GameModeOption } from '@/components/GameModeSelector';
import { useGameMode, useHostSelectedGameMode, useWordHuntPlayerLives, useWordHuntEliminatedPlayers, useBlastPlayerStats, useWheelRushPlayerStats, useGameActions, useBlastBoardClearedByLocal } from '@/hooks/gameState/store';
import type { BlastPlayerStats, WheelRushPlayerStats } from '@/shared/types/game';
import { resolveWheelRushStats } from '@/lib/results/wheelRushStatsFallback';
import BlastMpResults, { buildBlastMpResults } from '@/components/blast/legacy/BlastMpResults';
const WordHuntResultsSummary = dynamic(() => import('@/components/results/WordHuntResultsSummary'), { ssr: false });
const BlastResultsScene = dynamic(() => import('@/components/results/BlastResultsScene'), { ssr: false });
const WheelRushResultsScene = dynamic(() => import('@/components/results/WheelRushResultsScene'), { ssr: false });
const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });
const PostGameWordReview = dynamic(() => import('@/components/education/PostGameWordReview'), { ssr: false });

import { SERIES_TOTAL_GAMES } from '@/hooks/useSeriesTracker';

// ==============================================
// DESKTOP RESULTS LAYOUT
// ==============================================
// Full-width hero area (podium + consolation) on top,
// then two-column grid for words/stats and other players below.

interface DesktopResultsLayoutProps {
  handleExitRoom: () => void;
  exitLabel?: string;
  mainContentProps: ResultsMainContentProps;
  detailsContentProps: ResultsDetailsContentProps;
  resolvedGameMode: string | undefined;
  wordHuntResultsData: WordHuntResultsSummaryProps | undefined;
  blastPlayerStats: Record<string, BlastPlayerStats>;
  blastResultScores: Record<string, number>;
  blastMpResults: any[];
  wheelRushPlayerStats: Record<string, WheelRushPlayerStats>;
  currentUsername?: string;
  gameCode?: string;
  isBotsOnlyGame: boolean;
  postGameWordReview?: React.ReactNode;
  isCurrentUserWinner: boolean;
  userId: string | null;
  matchScore: number;
  currentPlayerRank: number;
  sortedScores: any[];
  marginToNext: number | null;
  /** Computed once by the page so mobile and desktop can't disagree. */
  showDailyInvite: boolean;
  /** Scroll effects only run for the active breakpoint (both trees mount). */
  scrollFxEnabled: boolean;
}

function DesktopResultsLayout({
  handleExitRoom,
  exitLabel,
  mainContentProps,
  detailsContentProps,
  resolvedGameMode,
  wordHuntResultsData,
  blastPlayerStats,
  blastResultScores,
  blastMpResults,
  wheelRushPlayerStats,
  currentUsername,
  gameCode,
  isBotsOnlyGame,
  postGameWordReview,
  isCurrentUserWinner,
  userId,
  matchScore,
  currentPlayerRank,
  sortedScores,
  marginToNext,
  showDailyInvite,
  scrollFxEnabled,
}: DesktopResultsLayoutProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  // Resolution-aware guest check — see hooks/useIsGuest (rules/60 Class 1).
  const isGuest = useIsGuest(mainContentProps.isAuthenticated);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      const hasMoreContent = el.scrollHeight > el.clientHeight + 40;
      const isNearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
      setShowScrollIndicator(hasMoreContent && !isNearBottom);
    };

    checkScroll();
    // Recheck after animations settle
    const timer = setTimeout(checkScroll, 800);
    el.addEventListener('scroll', checkScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', checkScroll);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0 relative">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollable-area p-4 medium-short:p-2 desktop-medium-short:p-3 xl:p-6 relative"
        style={{
          WebkitOverflowScrolling: 'touch',
          // Same CSS var as mobile — set by the ResultsPage outer wrapper.
          paddingBottom: 'calc(var(--mp-results-cta-h, 8rem) + 1rem)',
        }}
      >
        <ResultsParallaxBackdrop scrollRef={scrollRef} intensity={140} enabled={scrollFxEnabled} />
        <ResultsScrollProgressRail scrollRef={scrollRef} enabled={scrollFxEnabled} />
        {/* Top Bar with Exit Button — kept on the start (left in LTR) edge to
            match the in-game header, so the exit doesn't jump sides on the
            game→results transition. */}
        <div className="w-full max-w-5xl mx-auto flex items-center justify-start mb-4 relative z-10">
          <ExitRoomButton onClick={handleExitRoom} label={exitLabel || ''} />
        </div>

        {/* Wheel-rush hero scene takes the top slot for that mode; the
            standard cinematic block follows beneath for podium + ranks. */}
        {resolvedGameMode === 'wheel-rush' && Object.keys(wheelRushPlayerStats).length > 0 && (
          <ResultsSectionReveal index={0} flat className="w-full max-w-3xl mx-auto mb-6 relative z-10">
            <WheelRushResultsScene
              playerStats={wheelRushPlayerStats}
              currentUsername={currentUsername}
            />
          </ResultsSectionReveal>
        )}

        {/* Full-width cinematic area: Hero + Podium + Consolation.
            Wrapped in ResultsHeroTilt so the podium gains a gentle 3D recede
            as the player scrolls further into the page. */}
        <ResultsHeroTilt scrollRef={scrollRef} enabled={scrollFxEnabled} className="w-full max-w-5xl mx-auto relative z-10">
          <ResultsSectionReveal index={1} flat>
            <ResultsMainContent
              {...mainContentProps}
              hideInlineCta={!!gameCode && !isBotsOnlyGame}
            />
            {/* Global percentile context — sits below podium so it lands as the player reads
                their own row. Hides for guests (no userId). */}
            {userId ? (
              <div className="mt-2 flex justify-center">
                <GlobalRankBadge userId={userId} matchScore={matchScore} />
              </div>
            ) : null}
          </ResultsSectionReveal>
        </ResultsHeroTilt>

        {/* Blast MP Results — renders ranked player list above standard content */}
        {resolvedGameMode === 'blast' && Array.isArray(blastMpResults) && blastMpResults.length > 0 && (
          <ResultsSectionReveal index={1.5} flat className="w-full max-w-5xl mx-auto mb-6 relative z-10">
            <BlastMpResults results={blastMpResults} gameMode="blast" />
          </ResultsSectionReveal>
        )}

        {/* Two-column area below the cinematic hero */}
        <div className="w-full max-w-5xl mx-auto mt-6 medium-short:mt-3 desktop-medium-short:mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 medium-short:gap-3 desktop-medium-short:gap-4 relative z-10">
          {/* LEFT: Game mode summary + social + engagement */}
          <div className="space-y-4">
            {resolvedGameMode === 'word-hunt' && wordHuntResultsData && (
              <ResultsSectionReveal index={2}>
                <WordHuntResultsSummary {...wordHuntResultsData} />
              </ResultsSectionReveal>
            )}
            {resolvedGameMode === 'blast' && Object.keys(blastPlayerStats).length > 0 && (
              <ResultsSectionReveal index={2}>
                <BlastResultsScene
                  playerStats={blastPlayerStats}
                  scores={blastResultScores}
                  currentUsername={currentUsername}
                />
              </ResultsSectionReveal>
            )}
            {/* Wheel-rush summary already rendered as the hero scene above
                this layout's two-column grid. No secondary card needed. */}
            {/* Add-friend affordance now lives inline on each player tile (Podium + ConsolationRows). */}
            {/* D1 retention CTA — outcome-aware Daily Challenge invite. Renders on CG too
                (PostGameEngagement self-hides on CG; this one stays).
                Guests skip it: their one CTA is the signup card in the recap,
                and a second "play this instead" competes with it. */}
            {showDailyInvite && (
              <ResultsSectionReveal index={4}>
                <DailyChallengeInvite
                  isWinner={isCurrentUserWinner}
                  placement={currentPlayerRank}
                  totalPlayers={sortedScores.length}
                  marginToNext={marginToNext}
                />
              </ResultsSectionReveal>
            )}
            <ResultsSectionReveal index={6}>
              <PostGameEngagement />
            </ResultsSectionReveal>
            {postGameWordReview && !isGuest && (
              <ResultsSectionReveal index={8}>
                {postGameWordReview}
              </ResultsSectionReveal>
            )}
          </div>

          {/* RIGHT: Other players expanded + achievements (registered players only —
              a guest's screen stops at their own result + standings).
              DELIBERATELY NOT moved into ResultsMainContent's `detailsSlot` the
              way mobile does. Mobile collapses it because there it is stacked
              vertically and pushes the rematch bar off a long scroll; here it is
              a parallel column beside the recap and costs zero extra scroll, so
              expanded is strictly better. The two paths differ on purpose. */}
          {!isGuest && (
            <ResultsSectionReveal index={3} className="space-y-4">
              <ResultsDetailsContent {...detailsContentProps} />
            </ResultsSectionReveal>
          )}
        </div>

        {/* Post-game banner ad — CrazyGamesBanner covers the web iframe surface;
            ResultsBannerSlot serves AdMob inside the native app (where
            /multiplayer is in GAME_ROUTES so AnchoredNativeBanner stays hidden). */}
        <ResultsSectionReveal index={9} flat className="w-full max-w-5xl mx-auto mt-6 relative z-10">
          <CrazyGamesBanner size="728x90" />
        </ResultsSectionReveal>
        <ResultsBannerSlot placement="multiplayer-round-complete" className="w-full max-w-5xl mx-auto mt-4 relative z-10" />
      </div>

      {/* Scroll indicator — subtle bouncing chevron at bottom */}
      <AnimatePresence>
        {showScrollIndicator && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          >
            <m.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              className="flex flex-col items-center gap-0.5"
            >
              <div className="w-6 h-6 rounded-full bg-neo-white/10 backdrop-blur-xs flex items-center justify-center border border-neo-white/20">
                <svg className="w-3 h-3 text-neo-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ResultsPage: React.FC<ResultsPageProps> = ({ finalScores, gameCode, onReturnToRoom, onExitToLobby, username, socket, achievements, duplicateRuleDisabled, isHost = false, roomLanguage = 'en', gridSize = 4, gameDuration = 180, seriesStandings, seriesRoundNumber, seriesTotalGames, seriesLeader, onResetSeries, wordHuntSummary }) => {
  const { t, language } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  // Resolution-aware guest check — see hooks/useIsGuest (rules/60 Class 1).
  const isGuest = useIsGuest(isAuthenticated);
  const setIsInGame = useHideNavigation();

  // Hide global bottom nav on mobile while viewing results
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  const router = useRouter();

  // Render exactly one StickyReadyBar — mobile fixed bar OR desktop fixed bar.
  // Previously both were always mounted (hidden via Tailwind), so two countdown
  // intervals ran in parallel and could each fire onStartGame/onMarkReady.
  const isDesktopViewport = useIsDesktop();

  // Mobile inner scroll container — drives the parallax backdrop & section
  // reveals (window scroll is locked here; everything pages inside this div).
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  // Observe sticky-CTA height so the scroll containers can reserve real
  // clearance — `pb-36` was static and got eaten when the bar grew (host
  // mode selector + countdown + ready avatars).
  const [setStickyBarRef, stickyBarHeight] = useObservedHeight<HTMLDivElement>();

  // Classroom lesson data from sessionStorage (set by ClassroomGameLobby)
  const lessonGameData = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('lessonGameData');
      if (!raw) return null;
      return JSON.parse(raw) as {
        lessonId: string;
        vocabularyWords: string[];
      };
    } catch {
      return null;
    }
  }, []);

  // Hold the interstitial trigger until the host initiates a rematch (see
  // handleStartGame) instead of firing on mount. AdMob's prepare → show
  // pipeline takes a few seconds, so the prior mount-fire would paint a
  // fullscreen overlay over the results page once the user had already
  // started reading — and a partially-rendered creative left the user
  // stranded on a blank white screen.
  const { showInterstitial } = useInterstitialAd();
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  // True from the moment exit is confirmed until the hard nav fires. We render
  // a clean black wash so the user never sees a half-torn ResultsPage during
  // the 200ms socket-disconnect delay or the browser nav-paint gap (which
  // previously surfaced as "black screen with scrolling").
  const [isExiting, setIsExiting] = useState<boolean>(false);
  // True from the moment host taps rematch until either the next-round game
  // mount unmounts us, or the safety reset fires. Covers two visual gaps that
  // previously surfaced as "blank white screen": (1) the AdMob interstitial
  // Activity transition gap on Android (WebView paint stalls briefly while
  // the fullscreen Ad Activity tears down), (2) the post-Dismissed window
  // before the new round's game-state arrives over the socket. A brand
  // overlay covers both so the user never sees a white frame.
  const [isStartingNextRound, setIsStartingNextRound] = useState<boolean>(false);
  // Score reveal animation state (Netflix Boggle Party-inspired "trading places" reveal)
  const [scoreRevealComplete, setScoreRevealComplete] = useState<boolean>(true);

  // Share modal state - auto-opens on win once per session
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // Desktop keyboard shortcuts: R=rematch, Escape=exit (enabled after score reveal)
  useGameKeyboardShortcuts({
    onRematch: onReturnToRoom || undefined,
    onEscape: () => setShowExitConfirm(true),
    enabled: scoreRevealComplete,
  });
  // Game mode override for host (results page lets host change mode before next game)
  const resolvedGameMode = useGameMode();
  // Host's intended mode (preserved across rounds — "random" stays "random" so each round re-rolls)
  const hostSelectedGameMode = useHostSelectedGameMode();
  const { setHostSelectedGameMode } = useGameActions();
  // Default to host's persistent intent; fall back to just-played mode for non-hosts.
  const [selectedGameMode, setSelectedGameModeLocal] = useState<GameModeOption>(
    hostSelectedGameMode || resolvedGameMode || 'random'
  );
  // Sync host's selection to the store so it survives round transitions.
  const setSelectedGameMode = useCallback((mode: GameModeOption) => {
    setSelectedGameModeLocal(mode);
    setHostSelectedGameMode(mode);
  }, [setHostSelectedGameMode]);
  const wordHuntPlayerLives = useWordHuntPlayerLives();
  const wordHuntEliminatedPlayers = useWordHuntEliminatedPlayers();
  const blastPlayerStats = useBlastPlayerStats();
  const wheelRushPlayerStats = useWheelRushPlayerStats();
  const blastBoardClearedByLocal = useBlastBoardClearedByLocal();

  // Socket events for word feedback, XP, engagement features, and player ready state
  const {
    showWordFeedback,
    wordToVote,
    wordQueue,
    xpGainedData,
    levelUpData,
    showLevelUpCelebration,
    setShowLevelUpCelebration,
    setLevelUpData,
    nearMisses,
    referralMilestone,
    showReferralMilestone,
    readyUsernames,
    isCurrentPlayerReady,
    handleVote,
    handleFeedbackSkip,
    handleReferralMilestoneClose,
    handleMarkReady,
  } = useResultsSocketEvents({ socket, username });

  // Quick emoji reactions for multiplayer results
  const { floatingReactions, sendReaction, dismissReaction } = useQuickReactions({
    socket: socket ?? null,
    username: username || '',
  });

  // Emoji picker no longer needed — reactions are always visible in the bottom bar

  // Extract all data processing logic into a custom hook
  const {
    sortedScores,
    winner,
    isCurrentUserWinner,
    currentPlayerRank,
    currentPlayerData,
    currentPlayerValidWords,
    otherPlayers,
    playerArchetypes,
    currentPlayerArchetype,
    missedWords,
    shareCardStats,
    isBotsOnlyGame,
    normalizeUsername,
  } = useResultsData({
    finalScores,
    username,
    gameDuration,
    gameMode: resolvedGameMode,
    wordHuntTargetFoundBy: wordHuntSummary?.targetFoundBy,
  });

  // Pre-result fanfare: decide ONCE the first render real placement data lands,
  // then freeze it (ResultsPage re-renders on every socket tick — recomputing
  // would let the kind flip or re-fire). Renders a full-screen celebration
  // before the result page; null = nothing celebratory (mid-pack) → straight to
  // results. Reduced-motion auto-skips inside the component.
  const fanfareDecidedRef = useRef<MascotCelebrationKind | null | undefined>(undefined);
  if (fanfareDecidedRef.current === undefined && sortedScores.length > 0 && currentPlayerRank >= 1) {
    fanfareDecidedRef.current = pickCelebrationKind({
      rank: currentPlayerRank,
      totalPlayers: sortedScores.length,
    });
  }
  const celebrationKind = fanfareDecidedRef.current ?? null;
  const [fanfareDone, setFanfareDone] = useState(false);

  const marginToNext =
    currentPlayerRank > 1 && currentPlayerData
      ? sortedScores[currentPlayerRank - 2].score - currentPlayerData.score
      : null;

  // Build blast result scores map from sortedScores
  const blastResultScores = useMemo(() => {
    const scoreMap: Record<string, number> = {};
    sortedScores.forEach(player => {
      scoreMap[player.username] = player.score || 0;
    });
    return scoreMap;
  }, [sortedScores]);

  // Wheel-rush hero is the page's centerpiece for that mode. The dedicated
  // server payload (wheelRushSummary.playerStats) can be missing when scoring
  // hits the fallback path, when stats sync races a late-arriving validatedScores
  // event, or when a player joined late. Backfilling from the standard scores
  // payload guarantees the hero always has something to render.
  const effectiveWheelRushStats = useMemo(
    () => resolveWheelRushStats(wheelRushPlayerStats, sortedScores),
    [wheelRushPlayerStats, sortedScores],
  );
  const isWheelRush = resolvedGameMode === 'wheel-rush';
  const hasWheelRushStats = Object.keys(effectiveWheelRushStats).length > 0;

  // Victory / defeat sounds on results mount
  const { playVictorySound, playDefeatSound, playEpicVictorySound } = useSoundEffects();
  const hasFiredResultSoundRef = useRef(false);
  useEffect(() => {
    if (hasFiredResultSoundRef.current) return;
    if (sortedScores.length === 0) return;
    hasFiredResultSoundRef.current = true;
    if (isCurrentUserWinner) {
      // Epic victory for decisive wins (2x+ the runner-up score)
      const runnerUpScore = sortedScores[1]?.score ?? 0;
      const winnerScore = sortedScores[0]?.score ?? 0;
      if (runnerUpScore > 0 && winnerScore >= runnerUpScore * 2) {
        playEpicVictorySound();
      } else {
        playVictorySound();
      }
    } else {
      playDefeatSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using .length to avoid re-firing on array reference changes; ref guard prevents double-play
  }, [sortedScores.length, isCurrentUserWinner, playVictorySound, playDefeatSound, playEpicVictorySound]);

  // Word review card for classroom games (shared between mobile + desktop)
  const postGameWordReviewNode = lessonGameData ? (
    <PostGameWordReview
      vocabularyWords={lessonGameData.vocabularyWords}
      wordsFound={currentPlayerValidWords.map((w: { word: string }) => w.word)}
      lessonId={lessonGameData.lessonId}
      onPractice={() => router.push(`/${language}/student/lessons/${lessonGameData.lessonId}?mode=flashcard`)}
    />
  ) : null;

  // Extract all side effects into a custom hook
  const {
    winStreakData,
    showAuthModal,
    setShowAuthModal,
    showFirstWinModal,
    setShowFirstWinModal,
    coinReward,
  } = useResultsSideEffects({
    currentPlayerData,
    currentPlayerValidWords,
    isCurrentUserWinner,
    currentPlayerRank,
    totalPlayers: sortedScores.length,
    sortedScores,
    username,
    gameCode,
    gameDuration,
    gridSize,
    achievements,
    showWordFeedback,
    normalizeUsername,
    gameMode: resolvedGameMode,
  });

  // Share modal auto-open: fire exactly once per game session on win
  const { shouldFireShareOpen } = useShareOpenGuard();
  useEffect(() => {
    if (!isCurrentUserWinner) return;
    if (!gameCode) return;
    if (shouldFireShareOpen(gameCode)) {
      setShowShareModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire exactly once per gameCode
  }, [gameCode, isCurrentUserWinner]);

  // CrazyGames lifecycle - stop gameplay when results page loads
  // Call happytime if winner (throttled to once per 30s)
  useCrazyGamesLifecycle({
    isGameActive: false, // Results = not playing
    isGameOver: true,
    isWinner: isCurrentUserWinner,
  });

  // Submit score to CrazyGames leaderboard after multiplayer game
  const { submitLeaderboardScore } = useCrazyGames();
  useEffect(() => {
    if (currentPlayerData?.score != null && currentPlayerData.score > 0) {
      submitLeaderboardScore(currentPlayerData.score);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once on mount
  }, []);

  // MP signup nudge — non-intrusive bottom sheet + toast for guests
  const {
    activeNudge,
    stats: mpNudgeStats,
    dismissNudge,
    recordMpGame,
    // shouldPulseCoins — wire into CoinRewardDisplay as follow-up
  } = useMultiplayerSignupNudge({
    isAuthenticated,
    isResultsVisible: true,
  });

  // Record MP game completion when both gameCode AND resolvedGameMode are
  // available. Empty-deps mount-only fired before resolvedGameMode hydrated
  // from the store, so PostHog received 111/170 (~65%) MP `game_completed`
  // events with mode='multiplayer' fallback instead of the actual submode
  // ('word-hunt' / 'classic' / 'wheel-rush'). Ref guard keeps it once-only.
  const mpGameRecordedRef = useRef(false);
  useEffect(() => {
    if (mpGameRecordedRef.current) return;
    if (!gameCode) return;
    if (!resolvedGameMode) return;
    mpGameRecordedRef.current = true;
    recordMpGame(resolvedGameMode);
  }, [gameCode, resolvedGameMode, recordMpGame]);

  // Get games played for first win detection
  const guestStats = useMemo(() => getGuestStatsSummary(), []);

  // First win celebration (epic confetti on first multiplayer win)
  useFirstWinCelebration({
    isWinner: isCurrentUserWinner,
    gamesPlayed: guestStats.gamesPlayed,
    isMultiplayer: true,
  });

  const handleExitRoom = () => {
    setShowExitConfirm(true);
  };

  const confirmExitRoom = () => {
    // Switch to the exit wash NOW so the half-torn ResultsPage never paints
    // during the transition.
    setIsExiting(true);
    setShowExitConfirm(false);
    // Release the body scroll lock immediately.
    setIsInGame(false);

    // Emit leaveRoom so backend properly removes the player from the room. We
    // keep the socket CONNECTED (no disconnect) — the SPA stays alive and the
    // lobby reuses it; the prior disconnect only existed because a hard reload
    // was about to tear everything down anyway.
    try {
      if (socket && gameCode && username) {
        socket.emit('leaveRoom', { gameCode, username });
      }
    } catch (error) {
      logger.error('[RESULTS] Error emitting leaveRoom:', error);
    }

    clearSessionPreservingUsername(username);

    // Classroom flow: lessonGameData (sessionStorage) signals this was a teacher-launched
    // classroom game — route back to /education so we don't bounce back into the
    // classroom lobby (which would happen on a same-URL reset that keeps ?classroom=true).
    const isClassroomFlow = !!lessonGameData;
    try {
      sessionStorage.removeItem('lessonGameData');
    } catch {}

    if (isClassroomFlow) {
      // Different route → client-side nav. router.replace resolves the route
      // in-memory via the SPA router, so it works in the Capacitor static-export
      // WebView where a `window.location.href` hard nav to a route blanks out
      // (no server to resolve the path).
      router.replace(`/${language}/education`);
      return;
    }

    if (onExitToLobby) {
      // Same /multiplayer route → reset MP state IN PLACE (no navigation, no
      // reload). PageClient flips showResults/isActive off and renders the
      // lobby. This is the proven host-left-grace-modal exit pattern and is the
      // native-safe replacement for the old hard reload.
      onExitToLobby();
      return;
    }

    // Fallback (e.g. single-player surfaces with no MP reset wiring): a plain
    // client-side nav, still never a hard reload.
    router.replace(`/${language}/multiplayer`);
  };

  // Defer expensive word mapping calculation
  const deferredFinalScoresForWords = useDeferredValue(finalScores);

  // Create a map of all player words for duplicate detection
  // Using 'any' here as the exact WordObject type varies between components
  const allPlayerWords = useMemo(() => {
    const wordMap: Record<string, Array<{
      word: string;
      score: number;
      validated: boolean;
      isDuplicate: boolean;
      comboBonus?: number;
      fireRoundBonus?: number;
      isAiVerified?: boolean;
      isPendingValidation?: boolean;
      potentialScore?: number;
      invalidReason?: string;
      aiReason?: string;
    }>> = {};
    if (deferredFinalScoresForWords) {
      deferredFinalScoresForWords.forEach(player => {
        // Map allWords with required fields, defaulting isDuplicate to false
        wordMap[player.username] = (player.allWords || []).map(w => ({
          word: w.word,
          score: w.score ?? 0,
          validated: w.validated ?? false,
          isDuplicate: (w as { isDuplicate?: boolean }).isDuplicate ?? false,
          comboBonus: (w as { comboBonus?: number }).comboBonus,
          fireRoundBonus: (w as { fireRoundBonus?: number }).fireRoundBonus,
          isAiVerified: (w as { isAiVerified?: boolean }).isAiVerified,
          isPendingValidation: (w as { isPendingValidation?: boolean }).isPendingValidation,
          potentialScore: (w as { potentialScore?: number }).potentialScore,
          invalidReason: (w as { invalidReason?: string }).invalidReason,
          aiReason: (w as { aiReason?: string }).aiReason,
          // Include timing data for pace analysis in PlayerInsights
          timestamp: (w as { timestamp?: number }).timestamp,
          timeSinceStart: (w as { timeSinceStart?: number }).timeSinceStart,
        }));
      });
    }
    return wordMap;
  }, [deferredFinalScoresForWords]);

  // Pre-generate next grid AFTER first paint (Brawl Stars-style: zero delay on
  // rematch). Running this in a useMemo during render blocked the first frame —
  // 6 candidate boards × richness solver on the main thread. Defer to idle so
  // results paint instantly; if host hits rematch before idle fires,
  // handleStartGame falls back to a single sync generation.
  type Grid = string[][];
  const [preGeneratedGrid, setPreGeneratedGrid] = useState<Grid | null>(null);
  useEffect(() => {
    const difficultyConfig = DIFFICULTIES.MEDIUM;
    const generate = () => pickRichestBoardClient(
      () => generateRandomTable(difficultyConfig.rows, difficultyConfig.cols, roomLanguage, []),
      roomLanguage,
    );
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    if (typeof ric === 'function') {
      const id = ric(() => setPreGeneratedGrid(generate()), { timeout: 1500 });
      return () => {
        const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
        if (typeof cic === 'function') cic(id);
      };
    }
    const t = setTimeout(() => setPreGeneratedGrid(generate()), 0);
    return () => clearTimeout(t);
  }, [roomLanguage]);

  const startGameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (startGameTimeoutRef.current) clearTimeout(startGameTimeoutRef.current);
    if (overlayReleaseTimerRef.current) clearTimeout(overlayReleaseTimerRef.current);
  }, []);

  // Handle host starting a new game directly from results page
  // Must reset game state first (like handleStartNewGame in useHostGameActions)
  const handleStartGame = useCallback(async () => {
    if (!socket || !isHost) return;
    logger.log('[RESULTS] Host starting new game from results page');

    // Brand overlay covers the interstitial-Activity teardown frame and the
    // post-Dismissed → game-mount socket gap so the user never sees a white
    // WebView paint. Released after 15s as a safety hatch in case the round
    // never starts (server unreachable, etc.). Ref-based so unmount cleanup
    // clears the timer instead of firing setState on a dead component.
    setIsStartingNextRound(true);
    if (overlayReleaseTimerRef.current) clearTimeout(overlayReleaseTimerRef.current);
    overlayReleaseTimerRef.current = setTimeout(() => setIsStartingNextRound(false), 15000);

    // Awaiting the interstitial gates `startGame` so the other players stay
    // on results while the host watches their ad — without this gate they
    // would drop into round 2 alone while the host's fullscreen overlay
    // still covered round 1's results. The promise resolves immediately when
    // no ad is served (cadence skip, no fill, non-native), so the no-ad
    // path stays as snappy as before.
    try {
      await showInterstitial('multiplayer-round-complete');
    } catch (err) {
      // Interstitial errors must never block the rematch flow.
      logger.debug('[RESULTS] showInterstitial threw — continuing', err);
    }

    // If idle pre-generation hasn't completed yet, fall back to synchronous
    // generation here (rare — only if host clicks rematch within ~1 frame
    // of mount).
    const gridForGame = preGeneratedGrid ?? pickRichestBoardClient(
      () => generateRandomTable(DIFFICULTIES.MEDIUM.rows, DIFFICULTIES.MEDIUM.cols, roomLanguage, []),
      roomLanguage,
    );

    // Timeout guard: if resetGame callback never fires (socket issue), recover
    let callbackFired = false;
    startGameTimeoutRef.current = setTimeout(() => {
      if (!callbackFired) {
        logger.debug('[RESULTS] resetGame callback timed out — attempting startGame anyway');
        socket.emit('startGame', {
          letterGrid: gridForGame,
          language: roomLanguage,
          hostPlaying: true,
          boardTheme: null,
          gameMode: selectedGameMode,
        });
      }
    }, 3000);

    // Reset game state first, then start new game in callback
    // Pass gameCode as fallback for mobile reconnects where socket mapping may be stale
    socket.emit('resetGame', { gameCode }, (response: { success: boolean; error?: string; gameState?: string }) => {
      callbackFired = true;
      if (startGameTimeoutRef.current) clearTimeout(startGameTimeoutRef.current);
      if (response?.success) {
        logger.log('[RESULTS] Game reset confirmed, starting new game');

        socket.emit('startGame', {
          letterGrid: gridForGame,
          language: roomLanguage,
          hostPlaying: true,
          boardTheme: null,
          gameMode: selectedGameMode,
        });
      } else {
        logger.debug('[RESULTS] Game reset failed:', response?.error);
      }
    });
  }, [socket, isHost, roomLanguage, selectedGameMode, preGeneratedGrid, gameCode, showInterstitial]);

  // Series (best-of-3) completion detection
  const isSeriesComplete = (seriesRoundNumber ?? 0) >= SERIES_TOTAL_GAMES;
  // One answer for both the mobile and desktop mount sites — two hand-written
  // conditions on two paths is exactly how they drift (rules/60 Class 3).
  const showDailyInvite = shouldShowDailyInvite({
    isGuest,
    gameCode,
    isBotsOnlyGame,
    isSeriesComplete,
  });
  const seriesWinnerUsername = isSeriesComplete && seriesStandings?.[0]?.username
    ? seriesStandings[0].username : undefined;

  // Start a new series: reset tracker then start a fresh game
  const handleNewSeries = useCallback(() => {
    onResetSeries?.();
    handleStartGame();
  }, [onResetSeries, handleStartGame]);

  // Memoize player list for StickyReadyBar to avoid new array every render
  const stickyBarPlayers = useMemo(() =>
    sortedScores.map(p => ({ username: p.username, avatar: p.avatar, isBot: p.isBot, isHost: p.isHost })),
    [sortedScores],
  );

  // Memoize emoji reactions to avoid new array reference every render
  const memoizedEmojiReactions = useMemo(() =>
    floatingReactions.map(r => ({
      id: r.id,
      emoji: r.emoji,
      username: r.username,
      timestamp: 0,
    })),
    [floatingReactions],
  );

  // Overlay modals that should render regardless of orientation
  // These are rendered BEFORE the conditional returns to ensure they appear in both landscape and portrait modes
  // This fixes the bug where modals would only appear after switching from landscape to portrait
  const overlayModals = (
    <ResultsModals
      wordFeedback={{
        showWordFeedback,
        wordToVote,
        wordQueue,
        onVote: handleVote,
        onSkip: handleFeedbackSkip,
      }}
      referralMilestone={{
        milestone: referralMilestone,
        showReferralMilestone,
        onClose: handleReferralMilestoneClose,
      }}
      levelUp={{
        levelUpData,
        showLevelUpCelebration,
        setShowLevelUpCelebration,
        setLevelUpData,
      }}
      authModal={{
        showAuthModal,
        setShowAuthModal,
      }}
      firstWinModal={{
        showFirstWinModal,
        setShowFirstWinModal,
      }}
      shareModal={{
        showShareModal,
        setShowShareModal,
        gameCode,
        // no roomName here: this surface has no such variable, and ShareModalState marks it
        // optional — passing an undeclared identifier threw on every render and the error
        // boundary swallowed the whole results page.
      }}
      t={t}
      language={language}
    />
  );

  // Shared props for main content component (built before landscape check so landscape can use them)
  const mainContentProps = {
    sortedScores,
    nearMisses,
    isHost,
    onStartGame: handleStartGame,
    onMarkReady: handleMarkReady,
    onExit: handleExitRoom,
    winStreakData: winStreakData ?? null,
    xpGainedData,
    levelUpData,
    isAuthenticated,
    currentPlayerData: currentPlayerData ?? null,
    isCurrentUserWinner,
    currentPlayerValidWords,
    currentPlayerRank,
    scoreRevealComplete,
    setScoreRevealComplete,
    normalizeUsername,
    username,
    gameCode,
    onReturnToRoom,
    isBotsOnlyGame,
    isCurrentPlayerReady,
    readyUsernames,
    duplicateRuleDisabled: duplicateRuleDisabled ?? false,
    t,
    selectedGameMode,
    onSelectGameMode: setSelectedGameMode,
    seriesStandings,
    seriesRoundNumber,
    seriesTotalGames,
    seriesLeader,
    gameMode: resolvedGameMode,
    missedWords,
    emojiReactions: memoizedEmojiReactions,
    allPlayerWords,
    gameDuration,
    wordHuntSummary,
    onPodiumReaction: sendReaction,
    coinReward,
    shareCardStats,
    // Wheel-rush and blast both own their standings (WheelRushResultsScene /
    // BlastMpResults); skip the duplicate generic podium + consolation below them.
    hideStandings:
      (isWheelRush && hasWheelRushStats) ||
      (resolvedGameMode === 'blast' && sortedScores.length > 1),
    // BlastResultsScene below prints the current player's best word in its own
    // stat card; only it knows whether that row will actually render, so decide
    // here rather than duplicating the chip in the highlights strip above.
    hideBestWord:
      resolvedGameMode === 'blast' && !!blastPlayerStats[username]?.bestWord,
  };

  // Word Hunt results data (shared between tabs) — memoized to avoid O(n²) per render
  const wordHuntResultsData = useMemo(() => resolvedGameMode !== 'word-hunt' ? undefined : {
    targetWord: wordHuntSummary?.targetWord || '',
    foundTarget: !!wordHuntSummary?.targetFoundBy,
    isFirstFinder: wordHuntSummary?.targetFoundBy === username,
    survivalTime: wordHuntSummary?.survivalTime ?? 0,
    discoveryWords: wordHuntSummary?.discoveryWords ?? 0,
    playerResults: (sortedScores || []).map((p) => {
      const words = p.allWords || [];
      const validWords = words.filter(w => w && !w.isDuplicate && w.validated);
      const invalidWords = words.filter(w => w && !w.isDuplicate && !w.validated);
      const avgLen = validWords.length > 0
        ? Math.round((validWords.reduce((s, w) => s + w.word.length, 0) / validWords.length) * 10) / 10
        : 0;
      const longestLen = validWords.reduce((max, w) => Math.max(max, w.word.length), 0);
      return {
        username: p.username,
        score: p.score || 0,
        survived: !(wordHuntSummary?.eliminatedPlayers ?? wordHuntEliminatedPlayers ?? []).includes(p.username),
        lifeRemaining: (wordHuntSummary?.playerLives ?? wordHuntPlayerLives ?? {})[p.username] ?? 0,
        validWordCount: validWords.length,
        invalidWordCount: invalidWords.length,
        avgWordLength: avgLen,
        longestWordLength: longestLen,
        attemptsToFind: wordHuntSummary?.playerAttempts?.[p.username],
        avatar: p.avatar,
      };
    }),
    currentUsername: username,
  }, [resolvedGameMode, wordHuntSummary, sortedScores, wordHuntEliminatedPlayers, wordHuntPlayerLives, username]);

  // Map sorted scores to BlastMpPlayerResult for MP Blast view
  const blastMpResults = useMemo(() => {
    if (resolvedGameMode !== 'blast') return [];
    return buildBlastMpResults(sortedScores, {
      boardClearedByLocal: blastBoardClearedByLocal,
      localUsername: username,
      playerStats: blastPlayerStats,
    });
  }, [sortedScores, resolvedGameMode, blastBoardClearedByLocal, username, blastPlayerStats]);

  // Render Results Tab Content using shared component.
  // Wheel-rush gets a radial wheel-themed hero scene rendered ABOVE the
  // standard cinematic content — it owns the visual identity for that mode
  // instead of sitting below the generic podium.
  const renderResultsTab = () => (
    <>
      {isWheelRush && hasWheelRushStats && (
        <div className="mb-4">
          <WheelRushResultsScene
            playerStats={effectiveWheelRushStats}
            scores={sortedScores}
            currentUsername={username}
          />
        </div>
      )}
      {resolvedGameMode === 'blast' && blastMpResults.length > 0 && (
        <div className="mb-4">
          <BlastMpResults results={blastMpResults} gameMode="blast" />
        </div>
      )}
      {/* Mobile owns ONE word-list disclosure. Everyone else's unique words, the
          missed words and the post-game review used to render fully expanded
          below the recap — the tallest content on the screen, and none of it
          answers "did I win". They now ride inside the same "show details"
          collapse that already held the player's own words, so the recap ends at
          the rematch bar instead of a long scroll of other people's vocabulary. */}
      <ResultsMainContent
        {...mainContentProps}
        hideInlineCta={!isBotsOnlyGame}
        detailsSlot={
          <>
            {renderDetailsTab()}
            {postGameWordReviewNode}
          </>
        }
      />
      {/* Game mode summary after hero banner — hero stays on top */}
      {resolvedGameMode === 'word-hunt' && wordHuntResultsData && (
        <div className="mb-3">
          <WordHuntResultsSummary {...wordHuntResultsData} />
        </div>
      )}
      {resolvedGameMode === 'blast' && Object.keys(blastPlayerStats).length > 0 && (
        <div className="mb-3">
          <BlastResultsScene
            playerStats={blastPlayerStats}
            scores={blastResultScores}
            currentUsername={username}
          />
        </div>
      )}
      {/* Wheel-rush summary already rendered as the hero scene above; no
          secondary domination card needed below the podium. */}
      {/* Add-friend affordance now lives inline on each player tile (Podium + ConsolationRows). */}
    </>
  );

  // Shared props for details content component
  const detailsContentProps = {
    allPlayerWords,
    username,
    gameCode,
    otherPlayers,
    missedWords,
    isHost,
    t,
  };

  // Render Details Tab Content using shared component
  const renderDetailsTab = () => (
    <ResultsDetailsContent {...detailsContentProps} />
  );

  // Defensive empty state: if the round ended but no scores arrived (e.g. the
  // 20s `requestResults` fallback fired with `{ scores: [] }`, or `finalScores`
  // is null because of a socket reorder), every downstream layout collapses to
  // nothing and the user sees a blank navy viewport. Render a visible
  // "calculating results" card so the page is never truly empty.
  if (sortedScores.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center min-h-0 bg-neo-navy text-neo-white relative"
        style={{ background: 'radial-gradient(circle at center, var(--neo-navy-radial) 0%, var(--neo-navy) 70%)' }}
        data-testid="results-empty-state"
      >
        <div className="flex flex-col items-center gap-4 px-6 text-center max-w-md">
          <div className="w-12 h-12 rounded-full border-2 border-neo-cyan/40 border-t-neo-cyan animate-spin" aria-hidden="true" />
          <h2 className="font-neo-display font-black text-2xl uppercase tracking-wide">
            {t('results.calculating', 'Calculating results')}
          </h2>
          <p className="text-sm opacity-70">
            {t('results.calculatingHint', 'Tallying scores and validating words — this only takes a moment.')}
          </p>
          {onReturnToRoom && (
            <button
              type="button"
              onClick={onReturnToRoom}
              className="mt-2 px-4 py-2 rounded-md border-2 border-neo-cyan/40 text-sm font-neo-display font-bold uppercase tracking-wide hover:bg-neo-cyan/10 transition-colors"
            >
              {t('results.backToLobby', 'Back to lobby')}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isExiting) {
    return (
      <div
        data-testid="results-exit-wash"
        className="fixed inset-0 z-[9999] bg-neo-navy"
      />
    );
  }

  if (isStartingNextRound) {
    return (
      <div
        data-testid="results-next-round-wash"
        className="fixed inset-0 z-[9998] bg-neo-navy flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-4 font-neo-display text-neo-white">
          <div
            aria-hidden
            className="w-12 h-12 rounded-full border-4 border-neo-pink border-t-transparent animate-spin"
          />
          <div className="text-lg tracking-wide uppercase">
            {t('common.preparingGame')}
          </div>
        </div>
      </div>
    );
  }

  // Pre-result fanfare — full-screen, skippable celebration shown BEFORE the
  // result numbers (not embedded, not a popup). Fires once per result.
  // Skipped on native: the Android WebView still flashes white on its mount/
  // unmount layer promotion (see shouldPlayPreResultFanfare).
  if (celebrationKind && !fanfareDone && shouldPlayPreResultFanfare()) {
    return (
      <PreResultFanfare
        kind={celebrationKind}
        t={t}
        onComplete={() => setFanfareDone(true)}
      />
    );
  }

  return (
    <>
      {overlayModals}

      {/* MP signup nudges — non-intrusive, hidden on CrazyGames */}
      <MultiplayerSignupSheet
        isOpen={activeNudge === 'sheet'}
        onClose={dismissNudge}
        stats={mpNudgeStats}
        bottomOffset={stickyBarHeight}
      />
      <SignupToast
        isVisible={activeNudge === 'toast'}
        onDismiss={dismissNudge}
        mpGamesThisSession={mpNudgeStats.mpGamesThisSession}
      />

      {/* What you missed during your round — drains MidRoundEventQueue */}
      <PostRoundSummary />

      <div
        className="flex-1 flex flex-col min-h-0 bg-neo-navy transition-colors duration-300 relative"
        style={{
          background: 'radial-gradient(circle at center, var(--neo-navy-radial) 0%, var(--neo-navy) 70%)',
          // Published to descendants so both mobile and desktop scroll
          // containers can reserve dynamic bottom clearance. Only set once
          // measured — otherwise the calc() fallback (9rem/8rem) covers
          // first paint before ResizeObserver runs.
          ...(stickyBarHeight > 0 && {
            ['--mp-results-cta-h' as string]: `${stickyBarHeight}px`,
          }),
        } as React.CSSProperties}
      >
        {/* Subtle dot pattern */}
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle, var(--neo-black) 1px, transparent 1px)`,
            backgroundSize: '10px 10px',
          }}
        />

      {/* Subtle top gradient overlay */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-linear-to-b from-neo-cyan/5 to-transparent pointer-events-none" />

      {/* Floating emoji reactions overlay */}
      <div className="absolute inset-0 pointer-events-none z-40">
        <AnimatePresence>
          {floatingReactions.map((r) => (
            <FloatingReaction key={r.id} id={r.id} emoji={r.emoji} username={r.username} x={r.x} y={r.y} onComplete={dismissReaction} />
          ))}
        </AnimatePresence>
      </div>

      {/* MOBILE VIEW — single scroll, no tabs */}
      <div className="md:hidden flex flex-col flex-1 min-h-0 relative">
        {/* Exit-only header — podium already renders the 'matchResults' label.
            Start (left in LTR) edge matches the in-game header so the exit
            doesn't jump sides on the game→results transition. */}
        <div className="shrink-0 w-full flex items-center justify-start px-2 py-2 relative z-10">
          <ExitRoomButton onClick={handleExitRoom} label="" className="w-11 h-11 min-w-[44px] min-h-[44px] p-0" />
        </div>

        {/* Scrollable content — everything in one flow */}
        <div
          ref={mobileScrollRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollable-area px-2 bg-neo-navy relative"
          style={{
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            // Reserve clearance for the fixed StickyReadyBar (height
            // measured at runtime); fallback covers the pre-mount paint.
            paddingBottom: 'calc(var(--mp-results-cta-h, 9rem) + 1rem)',
          }}
        >
          <ResultsParallaxBackdrop scrollRef={mobileScrollRef} intensity={120} enabled={!isDesktopViewport} />
          <div className="max-w-lg mx-auto space-y-6 medium-short:space-y-3 relative z-10">
            <ResultsHeroTilt scrollRef={mobileScrollRef} enabled={!isDesktopViewport}>
              <ResultsSectionReveal index={0} flat>
                {renderResultsTab()}
              </ResultsSectionReveal>
            </ResultsHeroTilt>
            {/* Global rank badge — mobile, sub-podium */}
            {user?.id ? (
              <ResultsSectionReveal index={1}>
                <div className="flex justify-center">
                  <GlobalRankBadge userId={user.id} matchScore={currentPlayerData?.score ?? 0} />
                </div>
              </ResultsSectionReveal>
            ) : null}
            {/* D1 retention CTA — Daily Challenge invite, but only once the
                rematch loop is over (see shouldShowDailyInvite). Between rounds
                it offered a DIFFERENT mode directly above the sticky play-again
                bar, competing for the same tap. */}
            {showDailyInvite && (
              <ResultsSectionReveal index={2}>
                <DailyChallengeInvite
                  isWinner={isCurrentUserWinner}
                  placement={currentPlayerRank}
                  totalPlayers={sortedScores.length}
                  marginToNext={marginToNext}
                />
              </ResultsSectionReveal>
            )}
            {/* Post-game banner ad — CrazyGamesBanner covers the web iframe surface;
                ResultsBannerSlot serves AdMob inside the native app (where
                /multiplayer is in GAME_ROUTES so AnchoredNativeBanner stays hidden). */}
            <ResultsSectionReveal index={3} flat>
              <CrazyGamesBanner size="320x50" />
            </ResultsSectionReveal>
            <ResultsBannerSlot placement="multiplayer-round-complete" />
            {/* Other players' details + post-game word review moved INTO the
                recap's own "show details" disclosure (see renderResultsTab) —
                same content, one tap away, instead of two more expanded cards
                between the verdict and the rematch bar. */}
          </div>
        </div>

        {/* Floating bottom bar — portaled to <body> so no ancestor with
            transform/filter/perspective can hijack `position: fixed` and turn
            it into `absolute` (which caused the bar to scroll mid-page on
            Android and let the DailyChallengeInvite render below it). */}
        {gameCode && onReturnToRoom && !isDesktopViewport && typeof document !== 'undefined' && createPortal(
          <div ref={setStickyBarRef} className="fixed bottom-0 inset-x-0 z-[100] text-neo-white pointer-events-none">
            <m.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.3 }}
              className="bg-neo-navy/95 border-t border-neo-white/8 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] pointer-events-auto animate-in fade-in-0 duration-300"
            >
              {/* Inline style for padding-bottom: Tailwind arbitrary values
                  don't survive multi-arg max() with var() reliably. Capacitor
                  fix — Android WebView reports env(safe-area-inset-bottom) as
                  0, so the real gesture-nav inset only arrives via
                  --cap-safe-area-bottom (set by useSafeArea hook). */}
              <div
                className="px-3 pt-2.5"
                style={{
                  paddingBottom:
                    'max(0.625rem, env(safe-area-inset-bottom, 0px), var(--cap-safe-area-bottom, 0px))',
                }}
              >
                <StickyReadyBar
                  isHost={isHost}
                  isCurrentPlayerReady={isCurrentPlayerReady}
                  currentPlayerRank={currentPlayerRank}
                  winnerUsername={sortedScores[0]?.username}
                  readyCount={readyUsernames.length}
                  totalPlayers={sortedScores.length}
                  readyUsernames={readyUsernames}
                  players={sortedScores}
                  onStartGame={handleStartGame}
                  onMarkReady={handleMarkReady}
                  selectedGameMode={selectedGameMode}
                  onSelectGameMode={isHost ? setSelectedGameMode : undefined}
                  isSeriesComplete={isSeriesComplete}
                  seriesWinnerUsername={seriesWinnerUsername}
                  onNewSeries={handleNewSeries}
                  isClassroom={!!lessonGameData}
                />
              </div>
            </m.div>
          </div>,
          document.body
        )}
      </div>

      {/* DESKTOP/TABLET VIEW - Full-width hero then two-column details */}
      <DesktopResultsLayout
        handleExitRoom={handleExitRoom}
        exitLabel={t('results.exitRoom')}
        mainContentProps={mainContentProps}
        detailsContentProps={detailsContentProps}
        resolvedGameMode={resolvedGameMode}
        wordHuntResultsData={wordHuntResultsData}
        blastPlayerStats={blastPlayerStats}
        blastResultScores={blastResultScores}
        blastMpResults={blastMpResults}
        wheelRushPlayerStats={effectiveWheelRushStats}
        currentUsername={username}
        gameCode={gameCode}
        isBotsOnlyGame={isBotsOnlyGame}
        postGameWordReview={postGameWordReviewNode}
        isCurrentUserWinner={isCurrentUserWinner}
        userId={user?.id ?? null}
        matchScore={currentPlayerData?.score ?? 0}
        currentPlayerRank={currentPlayerRank}
        sortedScores={sortedScores}
        marginToNext={marginToNext}
        showDailyInvite={showDailyInvite}
        scrollFxEnabled={isDesktopViewport}
      />

      {/* DESKTOP Sticky Ready Bar — pinned to bottom on md+ screens.
          Portaled for the same ancestor-transform reason as mobile. */}
      {gameCode && onReturnToRoom && isDesktopViewport && typeof document !== 'undefined' && createPortal(
        <div ref={setStickyBarRef} className="fixed bottom-0 inset-x-0 z-[100] bg-neo-navy text-neo-white border-t-4 border-neo-black safe-area-pb">
          <div className="max-w-5xl mx-auto px-4 py-2.5">
            <StickyReadyBar
              isHost={isHost}
              isCurrentPlayerReady={isCurrentPlayerReady}
              currentPlayerRank={currentPlayerRank}
              winnerUsername={sortedScores[0]?.username}
              readyCount={readyUsernames.length}
              totalPlayers={sortedScores.length}
              readyUsernames={readyUsernames}
              players={stickyBarPlayers}
              onStartGame={handleStartGame}
              onMarkReady={handleMarkReady}
              selectedGameMode={selectedGameMode}
              onSelectGameMode={isHost ? setSelectedGameMode : undefined}
              isSeriesComplete={isSeriesComplete}
              seriesWinnerUsername={seriesWinnerUsername}
              onNewSeries={handleNewSeries}
              desktopProminent
            />
          </div>
        </div>,
        document.body
      )}

      {/* Exit Confirmation Dialog */}
      <ConfirmationDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        title={t('playerView.exitConfirmation')}
        description={t('results.exitWarning')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={confirmExitRoom}
        variant="default"
        analyticsId="exit_room_confirm"
      />

      </div>
    </>
  );
};

function ResultsPageWithErrorBoundary(props: ResultsPageProps) {
  return (
    <FeatureErrorBoundary featureName="Results" showHomeButton={true}>
      <ResultsFriendStatusProvider>
        <ResultsPage {...props} />
      </ResultsFriendStatusProvider>
    </FeatureErrorBoundary>
  );
}

export default ResultsPageWithErrorBoundary;
