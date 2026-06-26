'use client';

import { memo, useState, useEffect, useCallback, useRef, useMemo, type ReactNode, type RefObject } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { MobileRankIndicator } from './MobileRankIndicator';
import { cn } from '@/lib/utils';
import { vibrateWordSubmit } from '@/components/grid/hapticFeedback';
import { Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import GridComponent, { type HighlightedCell } from '@/components/GridComponent';
import CircularTimer from '@/components/CircularTimer';
import { useTimerSize } from '../timerSize';
import RoomChat from '@/components/RoomChat';
import { type WordFeedback } from '../../WordFormingArea';
import { WordFormingAreaConnected } from './WordFormingAreaConnected';
import { ComboDisplayConnected } from '../../ComboDisplayConnected';
import { shouldShowKeyboardTrails } from '../../keyboardTrailsUtils';
import { KeyboardInlineHint } from '@/components/keyboard';
import { WordsRemaining } from '@/player/components/in-game/WordsRemaining';
import { GameOverlays } from './GameOverlays';
import { GameHeader } from './GameHeader';
import { GameLeaderboard } from './GameLeaderboard';
import { isBoardInteractive } from '../boardInteractive';
import { GameWordList } from './GameWordList';
import { MobileChatFab } from './MobileChatFab';
import { ScoreDisplay } from './ScoreDisplay';
import FloatingScoreAnimation from '../../FloatingScoreAnimation';
import type { LetterGrid, Language, GameModeSelection, BlastTileOverlay, LetterFeedback } from '@/shared/types/game';
import type { ExtendedLeaderboardPlayer as LeaderboardPlayer, FoundWord } from '@/shared/types/view';
import type { HintsState, EarthquakeState, TranslationFn, TappedCellPosition } from '../types';
import { LeadChangeBanner } from '../../LeadChangeBanner';
import type { LeadChangeEvent } from '@/hooks/useLeadChangeDetection';
import type { RoundEventState } from './RoundEventOverlay';
import type { SpecialWordEvent } from './SpecialWordToast';
import { BlastMultiplayerOverlay } from '../../BlastMultiplayerOverlay';
import { WordHuntTargetArea } from '../../WordHuntTargetArea';
import { WordHuntLifeBar } from '../../WordHuntLifeBar';
import { WordHuntPlayerLives } from '../../WordHuntPlayerLives';
import { ComboMilestoneAnnouncement } from '../../ComboMilestoneAnnouncement';
import { ScreenFlashOverlay } from '../../ScreenFlashOverlay';
import { useHapticsEnabled, useShouldReduceMotion } from '@/contexts/AccessibilityContext';

/** Stable empty array to avoid breaking GridComponent memo on every render */
const EMPTY_HIGHLIGHTED_PATH: HighlightedCell[] = [];

interface TournamentData {
  name?: string;
  currentRound?: number;
  totalRounds?: number;
}

interface PortraitLayoutProps {
  // Core props
  username: string;
  gameCode: string;
  isHost: boolean;
  isPlaying: boolean;
  t: TranslationFn;
  dir: 'rtl' | 'ltr';

  // Game state
  letterGrid: LetterGrid;
  remainingTime: number | null;
  timerValue: number;
  gameActive: boolean;
  showStartAnimation: boolean;
  gameLanguage: Language;
  comboLevel: number;
  /**
   * Timestamp of the last accepted word — drives the combo-window countdown
   * inside `ComboDisplayConnected`. The ~10 Hz RAF state used to live in
   * `PlayerView` and cascade through 4 memo boundaries down to ComboDisplay;
   * pushing the subscription down keeps drag-time re-renders cheap.
   */
  lastWordTime: number | null;
  fireRoundActive: boolean;
  minWordLength: number;

  // Visual state
  hasAnimated: boolean;
  earthquakeState: EarthquakeState;
  gameplayFocusMode: boolean;

  // Player data
  playerScore: number;
  playerRank: number | null;
  /**
   * Deferred leaderboard — consumed by all in-game derivations. Raw
   * `leaderboard` is intentionally not threaded here so socket-burst updates
   * don't propagate through this subtree mid-drag. Lead-change detection
   * already runs in InGameScreen against the same deferred value.
   */
  deferredLeaderboard: LeaderboardPlayer[];
  foundWords: FoundWord[];

  // Word forming — formedWord/letterCount read from useSelectionStore inside
  // WordFormingAreaConnected, not propagated as props (avoids re-rendering this
  // entire layout on every cell entered during a drag).
  currentFeedback: WordFeedback | null;

  // Keyboard input
  isTypingMode: boolean;
  typedWord: string;
  highlightedCells: Array<{ row: number; col: number }>;
  lastWordFoundTime: number;
  totalGamesPlayed?: number;

  // Callbacks
  onExitRoom?: () => void;
  onShowTutorial?: () => void;
  onWordSubmit: (word: string) => void;
  onPathSubmit?: (cells: Array<{ row: number; col: number; letter: string }>) => void;
  onWordChange: (word: string, count: number) => void;
  onSingleTapDetected: (cell: TappedCellPosition) => void;

  // Hints
  hints?: HintsState;

  // Fire round
  fireRoundRemaining: number;

  // Keyboard help
  isDesktop: boolean;
  isHelpOpen: boolean;
  onCloseHelp: () => void;

  // Tournament
  tournamentData: TournamentData | null;

  // Single player
  totalBoardWords: number | null;

  // Lead change notification
  leadChangeEvent?: LeadChangeEvent | null;

  // Refs
  gameStatsRef: RefObject<HTMLDivElement | null>;

  // Game mode overlays
  gameMode?: GameModeSelection;
  blastTileOverlay?: BlastTileOverlay[];
  wordHuntTargetLength?: number;
  wordHuntAttempts?: Array<{ guess: string; feedback: LetterFeedback[] }>;
  wordHuntFound?: boolean;
  wordHuntLife?: number;
  wordHuntPlayerLives?: Record<string, number>;
  wordHuntEliminatedPlayers?: string[];
  onWordHuntGuess?: (guess: string) => void;

  // Achievement dock
  children?: ReactNode;

  // Golden letters (multiplayer engagement)
  goldenLetters?: Array<{ row: number; col: number }>;

  // Round events
  roundEvent?: RoundEventState | null;
  eventTiles?: { frozen: Set<string>; charged: Set<string>; meteor: Set<string> };

  // Rush tiles — recurring transient bonus tiles ("row-col" keys)
  rushTiles?: Set<string>;

  // Special word toast
  specialWordEvent?: SpecialWordEvent | null;

  // Timer urgency state (for screen border glow)
  timerUrgencyState?: 'normal' | 'low' | 'veryLow' | 'critical';
  onTimerState?: (state: 'normal' | 'low' | 'veryLow' | 'critical') => void;

  // Desktop shell integration: when true, desktop shell owns the timer UI (suppress 4× CircularTimer mounts)
  inDesktopShell?: boolean;
}

/**
 * PortraitLayout - Portrait/Desktop mode layout for the game
 */
export const PortraitLayout = memo<PortraitLayoutProps>(function PortraitLayout({
  username,
  gameCode,
  isHost,
  isPlaying,
  t,
  dir,
  letterGrid,
  remainingTime,
  timerValue,
  gameActive,
  showStartAnimation,
  gameLanguage,
  comboLevel,
  lastWordTime,
  fireRoundActive,
  minWordLength,
  hasAnimated,
  earthquakeState,
  gameplayFocusMode,
  playerScore,
  playerRank,
  deferredLeaderboard,
  foundWords,
  currentFeedback,
  isTypingMode,
  typedWord,
  highlightedCells,
  lastWordFoundTime,
  totalGamesPlayed,
  onExitRoom,
  onShowTutorial,
  onWordSubmit,
  onPathSubmit,
  onWordChange,
  onSingleTapDetected,
  hints,
  fireRoundRemaining,
  isDesktop,
  isHelpOpen,
  onCloseHelp,
  tournamentData,
  totalBoardWords,
  leadChangeEvent,
  gameStatsRef,
  gameMode,
  blastTileOverlay,
  wordHuntTargetLength,
  wordHuntAttempts,
  wordHuntFound,
  wordHuntLife,
  wordHuntPlayerLives,
  wordHuntEliminatedPlayers,
  onWordHuntGuess,
  children,
  goldenLetters = [],
  roundEvent,
  eventTiles,
  rushTiles,
  specialWordEvent,
  timerUrgencyState = 'normal',
  onTimerState,
  inDesktopShell = false,
}) {
  // Derive avatar map from leaderboard for WordHunt player lives.
  // Use deferred so socket-burst leaderboard updates don't recompute mid-drag.
  const playerAvatars = useMemo(() => {
    const map: Record<string, typeof deferredLeaderboard[0]['avatar']> = {};
    for (const p of deferredLeaderboard) {
      map[p.username] = p.avatar;
    }
    return map;
  }, [deferredLeaderboard]);
  const hapticsEnabled = useHapticsEnabled();
  const reduceMotion = useShouldReduceMotion();
  // Single responsive timer size — replaces the prior 4 CSS-hidden CircularTimer
  // mounts that all re-rendered every 1s tick. Resolves the exact size each
  // viewport showed before (see timerSize.ts).
  const timerSize = useTimerSize();

  // Memoize derived counts to avoid recomputation on every render tick
  const longValidWordCount = useMemo(
    () => foundWords.filter((fw) => fw.isValid !== false && fw.word.length >= 5).length,
    [foundWords],
  );
  // Track floating score animation
  const [floatingScore, setFloatingScore] = useState<number | null>(null);
  const [isFireRoundScore, setIsFireRoundScore] = useState(false);

  // Trigger floating score animation when word is accepted
  useEffect(() => {
    if (currentFeedback?.type === 'accepted' && currentFeedback.score) {
      setFloatingScore(currentFeedback.score);
      setIsFireRoundScore(currentFeedback.fireRoundActive ?? false);
    }
  }, [currentFeedback]);

  // Clear floating score after animation completes
  // useCallback ensures stable reference to prevent infinite animation loop
  const handleScoreAnimationComplete = useCallback(() => {
    setFloatingScore(null);
    setIsFireRoundScore(false);
  }, []);

  // Blizzard frozen tiles cellFilter — prevents selecting frozen cells
  const frozenCellFilter = useCallback((row: number, col: number) => {
    if (!eventTiles?.frozen.size) return true;
    return !eventTiles.frozen.has(`${row}-${col}`);
  }, [eventTiles]);

  // Stable highlighted path for GridComponent — avoids new [] ref every render
  const showTrails = shouldShowKeyboardTrails(isTypingMode, lastWordFoundTime, totalGamesPlayed);
  const gridHighlightedPath = useMemo(
    () => showTrails ? highlightedCells : EMPTY_HIGHLIGHTED_PATH,
    [showTrails, highlightedCells]
  );

  // Combo glow class based on combo level
  const comboGlow = comboLevel >= 7
    ? 'shadow-[0_0_20px_rgba(255,0,255,0.4)]'
    : comboLevel >= 5
    ? 'shadow-[0_0_15px_rgba(255,225,53,0.4)]'
    : comboLevel >= 3
    ? 'shadow-[0_0_10px_rgba(0,255,255,0.3)]'
    : '';

  // Haptic feedback on word accept
  const prevFeedbackRef = useRef(currentFeedback);
  useEffect(() => {
    if (
      hapticsEnabled &&
      currentFeedback?.type === 'accepted' &&
      currentFeedback !== prevFeedbackRef.current
    ) {
      const wordLen = currentFeedback.word?.length ?? 0;
      vibrateWordSubmit(wordLen, comboLevel, fireRoundActive);
    }
    prevFeedbackRef.current = currentFeedback;
  }, [currentFeedback, comboLevel, fireRoundActive, hapticsEnabled]);

  return (
    <>
      {/* Note: SP's DynamicEnergyBackground intentionally not rendered here.
          MP gameplay needs every GPU/CPU cycle for grid drag selection; the
          200%×200% rotating vortex + aurora + scanline + 4 particle layers
          continuously composited during a drag was the dominant stutter
          source on mid/low-end Android. */}

      {/* Countdown tension: screen border glow at ≤20s.
          WCAG 2.3.3 — pulsing is suppressed under prefers-reduced-motion; color still conveys urgency. */}
      {timerUrgencyState !== 'normal' && (
        <div
          aria-hidden="true"
          className={cn(
            'fixed inset-0 pointer-events-none z-30 transition-all duration-500',
            timerUrgencyState === 'critical'
              ? cn('shadow-[inset_0_0_60px_rgba(255,50,50,0.6)]', !reduceMotion && 'animate-timer-vignette-ambient')
              : timerUrgencyState === 'veryLow'
              ? cn('shadow-[inset_0_0_40px_rgba(255,80,0,0.45)]', !reduceMotion && 'animate-timer-vignette-ambient')
              : 'shadow-[inset_0_0_30px_rgba(255,120,0,0.25)]',
          )}
        />
      )}

      {/* Combo milestone announcement + screen flash.
          ScreenFlashOverlay is a full-viewport luminance flash — suppress entirely under reduced motion. */}
      {isPlaying && (
        <>
          <ComboMilestoneAnnouncement comboLevel={comboLevel} />
          {!reduceMotion && <ScreenFlashOverlay trigger={foundWords.length} />}
        </>
      )}

      {/* Floating Score Animation - renders above everything */}
      {isPlaying && (
        <FloatingScoreAnimation
          score={floatingScore}
          isFireRound={isFireRoundScore}
          onAnimationComplete={handleScoreAnimationComplete}
        />
      )}

      <GameOverlays
        earthquakeState={earthquakeState}
        fireRoundActive={fireRoundActive}
        fireRoundRemaining={fireRoundRemaining}
        isPlaying={isPlaying}
        isDesktop={isDesktop}
        isTypingMode={isTypingMode}
        isHelpOpen={isHelpOpen}
        onCloseHelp={onCloseHelp}
        roundEvent={roundEvent}
        specialWordEvent={specialWordEvent}
        t={t}
      />

      <div className={cn(
        'flex flex-col gap-0 md:gap-2 lg:gap-2 desktop-tall:lg:gap-3 desktop-short:lg:gap-0 desktop-medium-short:lg:gap-1 flex-1 w-full max-w-[1920px] mx-auto overflow-x-clip overflow-hidden transition-all duration-500 ease-in-out pb-16 medium-short:pb-12 lg:pb-1 desktop-tall:lg:pb-2 desktop-short:lg:pb-0 desktop-medium-short:lg:pb-1 px-2 lg:px-2 desktop-tall:lg:px-3 xl:px-4 min-h-0',
        // In the MP shell the canvas is just the board column — don't run the
        // internal lg: 3-column split (the shell supplies the side rails).
        !inDesktopShell && 'lg:flex-row lg:items-stretch lg:justify-center',
      )}>
        {/* Mobile Header */}
        <GameHeader
          onExitRoom={onExitRoom}
          onShowTutorial={onShowTutorial}
          hints={hints}
          gameActive={gameActive}
          t={t}
          variant="mobile"
        />

        {/* Left Column: Found Words (Desktop only).
            Render the container whenever the right panel renders so the
            center column stays optically centered (countdown overlay is
            fixed inset-0 → viewport center must equal game-area center). */}
        {!gameplayFocusMode && (
          <div className="hidden lg:flex lg:flex-col lg:w-56 xl:w-64 2xl:w-72 gap-2 min-h-0 shrink-0 overflow-y-auto">
            {isPlaying && (
              <GameWordList foundWords={foundWords} minWordLength={minWordLength} t={t} />
            )}
          </div>
        )}

        {/* Center Column: Timer, Score, Grid — container-queryable so board auto-fits */}
        <div className="@container/center [container-type:size] flex-1 flex flex-col min-w-0 min-h-0 overflow-x-clip overflow-y-hidden lg:overflow-y-hidden lg:overflow-x-visible">
          {/* Stats section with vertical stacking on mobile - reduced gap for tighter layout */}
          {remainingTime !== null && (
            <div
              ref={gameStatsRef}
              className="flex flex-col gap-0 w-full px-1 md:px-2 sticky top-0 z-40 shrink-0"
              role="status"
              aria-label="Game status"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
            >
              {/* Combo row - mobile only, centered. Container always present to prevent layout shift */}
              {isPlaying && (
                <div
                  className="flex lg:hidden justify-center items-center h-[32px]"
                  data-testid="combo-row-mobile"
                >
                  <ComboDisplayConnected
                    comboLevel={comboLevel}
                    lastWordTime={lastWordTime}
                    compact
                  />
                </div>
              )}

              {/* Stats row - Timer centered on mobile, Timer + controls on desktop.
                  lg uses grid [1fr_auto_1fr] so timer (middle, auto-sized) sits at viewport
                  center regardless of asymmetric flank widths (GameHeader vs Combo+Score). */}
              <div
                className="flex w-full items-center justify-center lg:grid lg:grid-cols-[1fr_auto_1fr] relative min-h-[88px] md:min-h-[108px] medium-short:min-h-[88px] medium-short:md:min-h-[108px] lg:min-h-[clamp(72px,10dvh,128px)] desktop-short:lg:min-h-[88px] desktop-medium-short:lg:min-h-[100px] short:min-h-[84px] short:md:min-h-[88px] gap-2"
                data-testid="stats-row"
              >
                {/* Desktop header */}
                <GameHeader
                  onExitRoom={onExitRoom}
                  onShowTutorial={onShowTutorial}
                  hints={hints}
                  gameActive={gameActive}
                  t={t}
                  variant="desktop"
                />

                {/* Timer (center) */}
                {!inDesktopShell && (
                  <AdaptiveMotion.div
                    data-tutorial="timer"
                    data-testid="timer-container"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative z-20 shrink-0"
                  >
                    {/* Single responsive timer (was 4 CSS-hidden mounts all ticking
                        every second). `onTimerState` is now always wired — previously
                        2 of the 4 instances omitted it, so the urgency vignette silently
                        failed on the breakpoints those served. */}
                    <CircularTimer
                      remainingTime={remainingTime}
                      totalTime={timerValue * 60}
                      size={timerSize}
                      onTimerState={onTimerState}
                    />
                  </AdaptiveMotion.div>
                )}

                {/* Right Side: Score (mobile) - positioned absolutely to not affect timer centering */}
                {isPlaying && (
                  <div
                    className="absolute inset-e-1 md:inset-e-2 short:inset-e-0 short:scale-90 medium-short:inset-e-0 medium-short:scale-90 top-1/2 -translate-y-1/2 lg:hidden"
                    data-testid="score-mobile"
                  >
                    <ScoreDisplay
                      score={playerScore}
                      rank={playerRank}
                      leaderboardSize={deferredLeaderboard.length}
                      minWordLength={minWordLength}
                      t={t}
                      variant="mobile"
                    />
                  </div>
                )}

                {/* Desktop: Combo + Score — positioned at end of flex row, not absolute */}
                {isPlaying && (
                  <div
                    className="hidden lg:flex lg:flex-col lg:items-end lg:gap-1 lg:ms-auto shrink-0 z-30"
                    data-testid="combo-desktop"
                  >
                    <div className="h-[32px] flex items-center justify-end">
                      {comboLevel > 0 ? (
                        <ComboDisplayConnected
                          comboLevel={comboLevel}
                          lastWordTime={lastWordTime}
                          compact
                        />
                      ) : (
                        <AdaptiveMotion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.5 }}
                          className="text-[10px] text-neo-white text-end leading-tight max-w-[70px]"
                        >
                          <span className="text-neo-cyan/60">⚡</span>{' '}
                          {t('game.comboHint')}
                        </AdaptiveMotion.div>
                      )}
                    </div>
                    <ScoreDisplay
                      score={playerScore}
                      rank={playerRank}
                      leaderboardSize={deferredLeaderboard.length}
                      minWordLength={minWordLength}
                      t={t}
                      variant="desktop"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Word Forming Area - inside header area for tighter integration */}
          {isPlaying && gameMode !== 'word-hunt' && (
            <div className="relative flex items-center justify-center shrink-0 -mt-1 mb-0.5 desktop-short:lg:-mt-2 desktop-short:lg:mb-0 desktop-medium-short:lg:-mt-2 desktop-medium-short:lg:mb-0">
              <LeadChangeBanner event={leadChangeEvent ?? null} />
              <WordFormingAreaConnected
                isTypingMode={isTypingMode}
                typedWord={typedWord}
                feedback={currentFeedback}
              />
            </div>
          )}

          {/* Tournament Progress Banner */}
          {tournamentData && (
            <AdaptiveMotion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="max-w-7xl mx-auto mb-1"
            >
              <Card className="bg-neo-pink border-3 border-neo-black shadow-hard">
                <CardContent className="py-1 px-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-neo-lime" />
                      <div>
                        <div className="text-white font-bold text-xs md:text-sm">
                          {tournamentData.name || t('hostView.tournament')}
                        </div>
                        <div className="text-purple-100 text-[10px] md:text-xs">
                          {t('hostView.tournamentRound')} {tournamentData.currentRound || 1} /{' '}
                          {tournamentData.totalRounds || 3}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-neo-black border-white/30 text-[10px] md:text-xs">
                      {t('hostView.tournamentProgress')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </AdaptiveMotion.div>
          )}

          {/* Word Hunt UI — above grid */}
          {gameMode === 'word-hunt' && wordHuntTargetLength && onWordHuntGuess && (
            <div className="w-full max-w-md mx-auto px-2 flex flex-col gap-2 relative z-20">
              <WordHuntLifeBar life={wordHuntLife ?? 100} maxLife={100} />
              {wordHuntPlayerLives && Object.keys(wordHuntPlayerLives).length > 0 && (
                <WordHuntPlayerLives
                  playerLives={wordHuntPlayerLives}
                  eliminatedPlayers={wordHuntEliminatedPlayers ?? []}
                  currentPlayer={username}
                  playerAvatars={playerAvatars}
                />
              )}
              <WordHuntTargetArea
                targetLength={wordHuntTargetLength}
                attempts={wordHuntAttempts ?? []}
                onSubmit={onWordHuntGuess}
                found={wordHuntFound ?? false}
                wordFeedback={currentFeedback}
              />
            </div>
          )}

          {/* Grid - flexible on mobile to prevent clipping, centers on desktop */}
          <div
            data-testid="grid-container"
            className={cn(
              'flex-1 flex flex-col items-center justify-center min-h-0 overflow-visible pt-1 md:pt-0 gap-2 desktop-short:lg:gap-0 desktop-short:lg:pt-0 short:gap-0 short:pt-0',
              'transition-shadow duration-500',
              comboGlow
            )}
          >
            <div
              data-testid="grid-frame"
              className="relative aspect-square mx-auto w-[min(720px,94cqi,calc(100cqb-200px))] medium-short:w-[min(560px,92cqi,calc(100cqb-150px))] short:w-[min(560px,94cqi,calc(100cqb-150px))] lg:w-[min(680px,100cqi,calc(100cqb-120px))] desktop-short:lg:w-[min(560px,100cqi,calc(100cqb-90px))] desktop-medium-short:lg:w-[min(620px,100cqi,calc(100cqb-100px))] max-h-full"
            >
              <GridComponent
                key={isPlaying ? 'playing-grid' : 'spectating-grid'}
                grid={letterGrid}
                interactive={isBoardInteractive({ isPlaying, showStartAnimation })}
                animateOnMount={!hasAnimated}
                onWordSubmit={onWordSubmit}
                onPathSubmit={onPathSubmit}
                onWordChange={onWordChange}
                comboLevel={comboLevel}
                hideComboIndicator={true}
                hideWordPreview={true}
                fireRoundActive={fireRoundActive}
                earthquakeShaking={earthquakeState === 'shaking'}
                highlightedPath={gridHighlightedPath}
                onSingleTapDetected={onSingleTapDetected}
                language={gameLanguage}
                isTypingMode={isTypingMode}
                goldenLetters={goldenLetters}
                cellFilter={eventTiles?.frozen.size ? frozenCellFilter : undefined}
                frozenTiles={eventTiles?.frozen}
                chargedTiles={eventTiles?.charged}
                meteorTiles={eventTiles?.meteor}
                rushTiles={rushTiles}
                effectsProfile={gameMode === 'classic' ? 'lean' : 'full'}
              />
              {/* Blast tile type badges */}
              {gameMode === 'blast' && blastTileOverlay && blastTileOverlay.length > 0 && (
                <BlastMultiplayerOverlay
                  overlay={blastTileOverlay}
                  gridSize={{ rows: letterGrid.length, cols: letterGrid[0]?.length ?? 4 }}
                />
              )}
            </div>

            {/* Desktop keyboard input hint - appears below grid */}
            {isPlaying && isDesktop && (
              <KeyboardInlineHint
                t={t}
                isActive={gameActive && !showStartAnimation}
              />
            )}
          </div>

          {/* Words Remaining (single-player) */}
          {hints?.isSinglePlayer &&
            isPlaying &&
            totalBoardWords !== null &&
            totalBoardWords !== undefined &&
            totalBoardWords > 0 && (
              <div className="flex justify-center shrink-0">
                <WordsRemaining
                  totalWords={totalBoardWords}
                  foundWordsCount={longValidWordCount}
                  t={t}
                  minLength={5}
                />
              </div>
            )}

          {/* Mobile rank rail — always visible in MP (even in gameplayFocusMode,
              which hides the full mobile leaderboard below). Gives phone players a
              clear "You're #N" plus a transient "{name} passed you!" cue. */}
          {isPlaying && deferredLeaderboard && deferredLeaderboard.length > 1 && (
            <div className="mt-0.5 flex justify-center">
              <MobileRankIndicator
                leaderboard={deferredLeaderboard}
                currentUsername={username}
                t={t}
                dir={dir}
              />
            </div>
          )}

          {/* Mobile: Split-view with the single live leaderboard + words.
              Leaderboard only when there are other players; word list always shows while playing
              so single-player users can see their progress. */}
          {isPlaying && !gameplayFocusMode && (
            <div className="block lg:hidden mt-0.5 md:mt-1 space-y-0.5 max-w-md mx-auto md:space-y-1 shrink overflow-y-auto min-h-0 max-h-[120px] sm:max-h-[140px] medium-short:max-h-[88px] short:max-h-[80px] scrollbar-thin">
              {deferredLeaderboard && deferredLeaderboard.length > 1 && (
                <GameLeaderboard
                  leaderboard={deferredLeaderboard}
                  username={username}
                  isHost={isHost}
                  t={t}
                  dir={dir}
                  compact
                />
              )}
              <GameWordList foundWords={foundWords} minWordLength={minWordLength} t={t} compact />
            </div>
          )}

          {/* Achievement dock */}
          {children}
        </div>

        {/* Right Column: Leaderboard + Chat (Desktop).
            The live leaderboard is shown for every desktop multiplayer player —
            including classic mode, which runs in gameplayFocusMode. Focus mode
            now only suppresses chat here (it keeps the grid screen calm), NOT the
            standings: desktop players were previously blind to who was winning. */}
        {!inDesktopShell && ((deferredLeaderboard && deferredLeaderboard.length > 1) || !gameplayFocusMode) && (
          <div className="hidden lg:flex lg:flex-col lg:w-56 xl:w-64 2xl:w-72 gap-2 shrink-0 min-h-0 overflow-y-auto">
            {/* Single live leaderboard — ranked standings with a "your standing"
                cue (leading by N / N points to catch). Replaces the previous
                duplicate race-track + standings stack. */}
            {deferredLeaderboard && deferredLeaderboard.length > 0 && (
              <GameLeaderboard
                leaderboard={deferredLeaderboard}
                username={username}
                isHost={isHost}
                t={t}
                dir={dir}
              />
            )}

            {/* Chat Component — hidden during gameplay focus mode */}
            {!gameplayFocusMode && (
              <AdaptiveMotion.div
                className="hidden lg:block"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <RoomChat
                  username={isHost ? 'Host' : username}
                  isHost={isHost}
                  gameCode={gameCode}
                  className="max-h-[200px] min-h-[80px] desktop-tall:min-h-[120px] desktop-short:max-h-[100px] desktop-short:min-h-[56px] desktop-medium-short:max-h-[140px] desktop-medium-short:min-h-[72px]"
                />
              </AdaptiveMotion.div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Chat FAB — non-intrusive, auto-shrinks after 4s */}
      {isPlaying && !gameplayFocusMode && (
        <MobileChatFab
          username={username}
          isHost={isHost}
          gameCode={gameCode}
        />
      )}
    </>
  );
});
