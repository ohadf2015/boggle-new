'use client';

import { memo, useRef, useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Shuffle, AlertTriangle, Lightbulb } from 'lucide-react';
const BlastTileGuide = dynamic(() => import('./BlastTileGuide'), { ssr: false });
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Button } from '@/components/ui/button';

const BlastEffectsCanvas = dynamic(
  () => import('./BlastEffectsCanvas'),
  { ssr: false },
);
import WordFormingArea, { type WordFeedback } from '@/components/game/WordFormingArea';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { shouldMountBlastFxCanvas } from './utils/shouldMountBlastFxCanvas';
import { useBlastTileFirstUse } from './hooks/useBlastTileFirstUse';
import { BlastTileFirstUseCallout } from './BlastTileFirstUseCallout';
import { BlastHUD } from './BlastHUD';
import { BlastMPLeaderboard } from './BlastMPLeaderboard';
import { ClosestRivalsPanel } from '@/components/game/in-game/ClosestRivalsPanel';
import { selectClosestRivals } from '@/lib/leaderboard/selectClosestRivals';
import { selectMyBlastScore } from '@/lib/blast/selectMyBlastScore';
import { blastEntriesToRivals } from '@/lib/leaderboard/rivalNormalizers';
import { BlastBoard } from './BlastBoard';
import BlastChainText from './BlastChainText';
import BlastWaveClearText from './BlastWaveClearText';
import BlastWordPraise from './BlastWordPraise';
import { BlastWordRewardPreview } from './BlastWordRewardPreview';
import { BlastEffectsLayer } from './BlastEffectsLayer';
import { BlastScoreMilestone } from './BlastScoreMilestone';
import { ComboMilestoneAnnouncement } from '@/components/game/ComboMilestoneAnnouncement';
import { BlastMicroToast } from './BlastMicroToast';
import { useBlastMicroAchievements } from './hooks/useBlastMicroAchievements';
import type { BlastMicroState } from './utils/blastMicroAchievements';
import type { ScoreFlyEvent } from './BlastScoreFly';
import { BlastBackground } from './BlastBackground';
import { cn } from '@/lib/utils';
import type { LetterGrid, Language, Avatar } from '@/shared/types/game';
import { BlastObjectiveBanner } from './BlastObjectiveBanner';
import { BlastModifierBadge } from './BlastModifierBadge';
import type { BlastWaveModifier } from './utils/blastModifiers';
import type { BlastTileState, BlastGameState, BlastObjectiveProgress } from './types';
import type { SequencerState } from './hooks/useBlastSequencer';
import type { ClearedTileEvent } from './BlastEffectsCanvas';
import type { ComboStreakState } from './hooks/useBlastComboStreak';

interface BlastStageProps {
  // From engine
  grid: LetterGrid;
  tileStates: BlastTileState[][];
  gridSize: number;
  language: Language;
  gameState: BlastGameState;
  // Wave
  waveNumber: number;
  // Combo
  comboLevel: number;
  // Word forming
  formedWord: string;
  currentFeedback: WordFeedback | null;
  // Grid interaction
  interactive: boolean;
  onWordSubmit: (word: string) => void;
  onPathSubmit: (cells: Array<{ row: number; col: number }>) => void;
  onWordChange: (word: string, count: number) => void;
  // Controls
  onShuffle: () => void;
  onQuit: () => void;
  onShowHelp?: () => void;
  // Animation sequencer
  sequencerState?: SequencerState;
  // Dead end
  noWordsRemaining: boolean;
  // Effects
  scoreFlyEvents?: ScoreFlyEvent[];
  onScoreFlyComplete?: (id: string) => void;
  comboFlash?: { id: string; tier: 1 | 2 | 3 } | null;
  onComboFlashComplete?: () => void;
  comboTypeName?: string;
  // Near-miss shimmer
  nearMissCells?: Array<{ row: number; col: number }>;
  // Cascade highlight — cells to glow before cascade clears
  cascadeHighlightCells?: Array<{ row: number; col: number }>;
  cascadeHighlightWord?: string | null;
  // PixiJS effects layer events
  clearedTilesForEffects?: ClearedTileEvent[];
  waveCleared?: boolean;
  // Multiplayer leaderboard
  leaderboard?: Array<{ username: string; score: number; wordCount?: number; avatar?: Avatar }>;
  username?: string;
  // Combo streak
  comboStreak?: ComboStreakState;
  comboStreakArcRef?: React.RefObject<SVGCircleElement | null>;
  // Explosion screen shake intensity (0=none, 1=light, 2=medium, 3=heavy)
  explosionShake?: number;
  // Word praise feedback
  lastWordLength?: number;
  wordSubmitCount?: number;
  // Pre-game buff visibility (HUD chip)
  activeBuff?: 'shield' | 'bomb' | 'combo2x' | null;
  buffConsumed?: boolean;
  // Persistent goal banner — non-dismissable secondary objectives
  objectiveProgress?: BlastObjectiveProgress[];
  // Visible "Lucky Boost" indicator — DDA assist surfacing
  ddaBoostActive?: boolean;
  // SP-only active wave modifier — surfaced as a persistent chip under the objectives banner
  activeModifier?: BlastWaveModifier | null;
  // Optional hint button (wave 6+) rendered in HUD controls
  hintSlot?: React.ReactNode;
  // Optional hint toast overlaid above the grid for HINT_HIGHLIGHT_MS
  hintToast?: React.ReactNode;
  // Timer (multiplayer mode)
  remainingTime?: number | null;
  totalTime?: number;
  /** True when this stage is the center slot of the MP desktop shell. Collapses
   *  the internal lg: 3-column desktop layout (the shell provides the side rails:
   *  rivals/roster + found-words), so the board fills the slot and the
   *  closest-rivals panel isn't duplicated. */
  isDesktopCanvas?: boolean;
  // Translation
  t: (key: string) => string | undefined;
}

/**
 * BlastStage — layout shell composing HUD + word forming + board + dead-end notification.
 * Purely presentational; all state lives in BlastGame.
 */
export const BlastStage = memo(function BlastStage({
  grid,
  tileStates,
  gridSize,
  language,
  gameState,
  waveNumber,
  comboLevel,
  formedWord,
  currentFeedback,
  interactive,
  onWordSubmit,
  onPathSubmit,
  onWordChange,
  onShuffle,
  onQuit,
  onShowHelp,
  sequencerState,
  noWordsRemaining,
  scoreFlyEvents = [],
  onScoreFlyComplete,
  comboFlash = null,
  onComboFlashComplete,
  comboTypeName,
  nearMissCells = [],
  cascadeHighlightCells = [],
  cascadeHighlightWord,
  clearedTilesForEffects = [],
  waveCleared = false,
  leaderboard,
  username,
  comboStreak,
  comboStreakArcRef,
  explosionShake,
  lastWordLength = 0,
  wordSubmitCount = 0,
  activeBuff = null,
  buffConsumed = false,
  objectiveProgress = [],
  ddaBoostActive = false,
  hintSlot,
  hintToast,
  remainingTime,
  totalTime,
  isDesktopCanvas = false,
  t,
  activeModifier,
}: BlastStageProps) {
  const { score, wordsFound, movesRemaining, totalMoves, tilesCleared, totalTiles, isComplete, isDeadEnd } = gameState;
  // MP Blast has timer props; SP Blast doesn't. Timer-era games hide the wave chip.
  const isMultiplayer = remainingTime !== null && remainingTime !== undefined;

  // In MP the local engine never scores (server-authoritative cascades), so the
  // engine's `score` stays 0 the whole game. Read the player's live score from
  // the broadcast leaderboard instead. SP keeps the local engine score.
  const displayScore = isMultiplayer ? selectMyBlastScore(leaderboard, username) : score;

  // Live "closest rivals" slice for the desktop side rail. Identity is keyed by
  // username (blast's identity scheme). Returns null in solo blast (no leaderboard).
  const rivalsView = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) return null;
    return selectClosestRivals(blastEntriesToRivals(leaderboard, username), 3);
  }, [leaderboard, username]);

  const [showTileGuide, setShowTileGuide] = useState(false);

  // Measure board container for PixiJS effects canvas
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  // Skip the always-on Pixi FX overlay on low-end / reduced-motion devices.
  // The DOM tile animations (clear/fall/appear) carry all gameplay feedback;
  // the overlay is extra juice the weakest devices can't afford and that
  // BlastFxBridge already suppresses there anyway.
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();
  const mountBlastFx = shouldMountBlastFxCanvas({ enableComplexAnimations, prefersReducedMotion });
  // Teach each curated special tile the first time it appears (once, persisted).
  const { teaching: firstUseTeaching, dismiss: dismissFirstUse } = useBlastTileFirstUse(
    tileStates,
    interactive && !isComplete,
  );
  useEffect(() => {
    const el = boardContainerRef.current;
    if (!el) return;
    // Immediate measurement so effects canvas mounts on first render
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setBoardSize({ width: rect.width, height: rect.height });
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setBoardSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const comboFlashTier = comboFlash?.tier ?? 0;

  // Mid-run achievement snapshot — running maxima tracked in a ref so the
  // hook sees monotonic stats even though props only carry latest values.
  // gemsCollected / specialTilesCleared / biggestSingleClear stay 0 until
  // engine plumbing exists; their predicates simply never fire (graceful).
  const microStateRef = useRef<BlastMicroState>({
    maxCombo: 0,
    wordsSubmitted: 0,
    longestWordLen: 0,
    biggestSingleClear: 0,
    gemsCollected: 0,
    specialTilesCleared: 0,
    wavesCompleted: 0,
  });
  microStateRef.current = {
    ...microStateRef.current,
    maxCombo: Math.max(microStateRef.current.maxCombo, comboLevel),
    wordsSubmitted: Math.max(microStateRef.current.wordsSubmitted, wordSubmitCount),
    longestWordLen: Math.max(microStateRef.current.longestWordLen, lastWordLength),
    wavesCompleted: Math.max(microStateRef.current.wavesCompleted, Math.max(0, waveNumber - 1)),
  };
  // Sprint 1 clarity guard: in-wave micro-achievement toasts disabled — they
  // pile up over goal banner + combos and read as noise per LLM critique
  // consensus. Achievements still surface in the end-of-wave summary via
  // useBlastBadgeUnlocks (a separate path).
  const { currentId: microId } = useBlastMicroAchievements(microStateRef.current, { enabled: false });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative pb-safe" data-testid="blast-stage">
      {/* Urgency vignette at low moves */}
      {movesRemaining <= 3 && !isComplete && (
        <div
          className="absolute inset-0 z-30 pointer-events-none transition-opacity duration-500"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(255,30,30,0.25) 100%)',
            opacity: movesRemaining <= 1 ? 0.9 : movesRemaining <= 2 ? 0.6 : 0.35,
          }}
        />
      )}
      {/* Chain vignette — purple/gold escalation during cascades */}
      {sequencerState?.chainLevel != null && sequencerState.chainLevel >= 1 && (
        <div
          className="absolute inset-0 z-30 pointer-events-none transition-opacity duration-300"
          style={{
            background: sequencerState.chainLevel >= 4
              ? 'radial-gradient(ellipse at center, transparent 40%, rgba(255,200,0,0.3) 100%)'
              : sequencerState.chainLevel >= 2
              ? 'radial-gradient(ellipse at center, transparent 45%, rgba(139,92,246,0.25) 100%)'
              : 'radial-gradient(ellipse at center, transparent 55%, rgba(139,92,246,0.12) 100%)',
            opacity: Math.min(sequencerState.chainLevel * 0.25, 1),
          }}
        />
      )}
      {/* Reactive background */}
      <BlastBackground intensity={sequencerState?.chainLevel ?? 0} />

      {/* 1. HUD — z-40, shown on all sizes. Capped + centred so on desktop/TV
          the score · moves · progress cluster reads as one console aligned over
          the board, instead of stretching edge-to-edge across a wide viewport.
          On phones the cap exceeds the screen, so it stays full-width. */}
      <div className="relative z-40 w-full max-w-[640px] lg:max-w-[840px] xl:max-w-[920px] mx-auto">
      <BlastHUD
        score={displayScore}
        wordsFoundCount={wordsFound.length}
        movesRemaining={movesRemaining}
        totalMoves={totalMoves}
        waveNumber={waveNumber}
        tilesCleared={tilesCleared}
        totalTiles={totalTiles}
        onQuit={onQuit}
        onShowHelp={onShowHelp ?? (() => setShowTileGuide(true))}
        comboStreak={comboStreak}
        comboStreakArcRef={comboStreakArcRef}
        activeBuff={activeBuff}
        buffConsumed={buffConsumed}
        ddaBoostActive={ddaBoostActive}
        hintSlot={hintSlot}
        isMultiplayer={isMultiplayer}
        remainingTime={remainingTime}
        totalTime={totalTime}
        t={t}
      />
      <BlastObjectiveBanner objectives={objectiveProgress} t={t} />
      {activeModifier && (
        <div className="flex justify-center pt-1.5">
          <BlastModifierBadge modifier={activeModifier} variant="chip" t={t} />
        </div>
      )}
      {hintToast}
      {/* MP countdown now lives inline in the HUD top row (see BlastHUD); it no
          longer floats here above the board, which kept crowding the grid. */}
      </div>

      {/* 1b. Live leaderboard strip (MP only) — mobile only; desktop uses the
          closest-rivals rail (see right panel). */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="relative z-40 lg:hidden">
          <BlastMPLeaderboard leaderboard={leaderboard} username={username} t={t} />
        </div>
      )}

      {/* Desktop: horizontal layout (board center + side panels). Mobile: vertical stack.
          Inside the MP desktop shell (isDesktopCanvas) we stay stacked and let the
          board fill the slot — the shell already supplies the side rails. */}
      <div className={cn(
        'flex-1 flex flex-col min-h-0 relative z-30',
        !isDesktopCanvas && 'lg:flex-row lg:items-stretch lg:justify-center lg:gap-4 lg:px-4 xl:px-8 lg:max-w-[1400px] lg:mx-auto lg:w-full',
      )}>

      {/* Left panel — word area on desktop (suppressed in shell; the stacked mobile
          word area below takes over so the board isn't squeezed by a side column). */}
      <div className={cn('hidden lg:flex lg:flex-col lg:w-56 xl:w-64 lg:justify-center shrink-0', isDesktopCanvas && '!hidden')}>
        <div
          className={cn(
            'flex items-center justify-center gap-2 px-3 py-2 w-full transition-opacity',
            formedWord ? 'opacity-100' : 'opacity-30',
          )}
        >
          <WordFormingArea word={formedWord} letterCount={formedWord.length} feedback={currentFeedback} compact />
          <BlastWordRewardPreview wordLength={formedWord.length} />
        </div>
      </div>

      {/* 3. Board — center column, expands on desktop */}
      <div
        className={cn(
          'flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-2 min-h-0',
          explosionShake && explosionShake >= 2 ? 'animate-neo-shake' :
          explosionShake === 1 ? 'animate-neo-wobble' :
          sequencerState?.chainLevel && sequencerState.chainLevel >= 3 ? 'animate-neo-shake' :
          sequencerState?.chainLevel && sequencerState.chainLevel >= 2 ? 'animate-neo-wobble' :
          sequencerState?.phase === 'clearing' ? 'animate-neo-wobble' : '',
        )}
        style={{
          transform: explosionShake && explosionShake >= 3
            ? `scale(${1.012 + Math.min(sequencerState?.chainLevel ?? 0, 5) * 0.008})`
            : sequencerState?.chainLevel
              ? `scale(${1 + Math.min(sequencerState.chainLevel, 5) * 0.008})`
              : undefined,
          transition: 'transform 200ms ease-out',
        }}
      >
        {/* Board frame — neo-brutalist with hard shadow + reactive glow */}
        <div
          className={cn(
            'relative w-full max-w-[min(94vw,80dvh)] sm:max-w-[min(440px,75dvh)] md:max-w-[min(480px,72dvh)] lg:max-w-[min(560px,72dvh)] xl:max-w-[min(640px,76dvh)] 2xl:max-w-[min(760px,82dvh)] p-1.5 rounded-neo border-3 shadow-hard-lg transition-all duration-300',
            // In the shell the board owns the full center column — override the
            // phone-tuned caps so it fills instead of floating tiny.
            isDesktopCanvas && '!max-w-[min(680px,82dvh)]',
            (sequencerState?.chainLevel ?? 0) >= 4
              ? 'border-yellow-400'
              : (sequencerState?.chainLevel ?? 0) >= 2
              ? 'border-neo-purple'
              : comboFlashTier >= 2
              ? 'border-neo-pink'
              : 'border-neo-black',
          )}
          style={{
            '--frame-glow-color': (sequencerState?.chainLevel ?? 0) >= 4
              ? 'rgba(255,200,0,0.5)'
              : (sequencerState?.chainLevel ?? 0) >= 2
              ? 'rgba(139,92,246,0.4)'
              : comboFlashTier >= 2
              ? 'rgba(255,20,147,0.4)'
              : 'transparent',
            // Infinite box-shadow keyframe = per-frame paint. Skip it on
            // low-end / reduced-motion so combos don't add paint cost there.
            ...(mountBlastFx && ((sequencerState?.chainLevel ?? 0) >= 2 || comboFlashTier >= 2)
              ? { animation: 'blast-frame-glow 1.2s ease-in-out infinite' }
              : {}),
          } as React.CSSProperties}
        >
          {/* Inner board surface */}
          <div
            ref={boardContainerRef}
            className="relative w-full overflow-hidden rounded-[6px]"
          >
            {/* DOM board — renders underneath so effects overlay tile art */}
            <div className="relative z-10">
              <BlastBoard
                grid={grid}
                tileStates={tileStates}
                gridSize={gridSize}
                language={language}
                interactive={interactive && !isComplete}
                onWordSubmit={onWordSubmit}
                onPathSubmit={onPathSubmit}
                onWordChange={onWordChange}
                sequencerState={sequencerState}
                nearMissCells={nearMissCells}
                cascadeHighlightCells={cascadeHighlightCells}
                diamondRevealTurns={gameState.diamondRevealTurns}
              />
            </div>
            {/* PixiJS effects layer — overlays DOM board so particles/shockwaves/shatters are visible above tile art. pointer-events-none so taps still reach BlastBoard. */}
            {boardSize.width > 0 && mountBlastFx && (
              <div className="absolute inset-0 z-20 pointer-events-none rounded-[6px]">
                <BlastEffectsCanvas
                  width={boardSize.width}
                  height={boardSize.height || boardSize.width}
                  gridSize={gridSize}
                  clearedTiles={clearedTilesForEffects}
                  chainLevel={sequencerState?.chainLevel ?? 0}
                  comboTier={comboFlashTier}
                  comboStreakLevel={comboStreak?.level ?? 0}
                  waveCleared={waveCleared}
                />
              </div>
            )}
            {/* First-use teaching: names a special tile + what it does the
                first time the player meets it (once per tile, persisted). */}
            {firstUseTeaching && (
              <BlastTileFirstUseCallout
                type={firstUseTeaching}
                onDismiss={dismissFirstUse}
                isMultiplayer={isMultiplayer}
              />
            )}
          </div>
        </div>
        {/* Cascade word discovery banner */}
        <AdaptiveAnimatePresence>
          {cascadeHighlightWord && (
            <AdaptiveMotion.div
              initial={{ scale: 0.5, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
            >
              <div className="px-5 py-2 rounded-neo bg-neo-navy border-3 border-neo-black shadow-hard">
                <span className="text-neo-lime font-neo-display text-xl font-black tracking-wide">
                  {cascadeHighlightWord}
                </span>
              </div>
            </AdaptiveMotion.div>
          )}
        </AdaptiveAnimatePresence>
        {/* Chain escalation text — scoped within board area */}
        <BlastChainText chainLevel={sequencerState?.chainLevel ?? 0} wordLength={lastWordLength} t={t} />
        <BlastWordPraise wordLength={lastWordLength} submitCount={wordSubmitCount} t={t} />
        <BlastWaveClearText waveCleared={waveCleared} movesRemaining={movesRemaining} t={t} />
      </div>

      {/* Right panel — closest-rivals rail + notices on desktop. Suppressed in the
          shell: the shell's left rail already shows the rivals/roster, and the
          stacked mobile out-of-moves / stuck notices below cover those states. */}
      <div className={cn('hidden lg:flex lg:flex-col lg:w-56 xl:w-64 lg:justify-start lg:pt-2 lg:gap-3 shrink-0', isDesktopCanvas && '!hidden')}>
        {rivalsView && <ClosestRivalsPanel view={rivalsView} className="w-full" />}
        {/* Out of moves (desktop) */}
        <AdaptiveAnimatePresence>
          {movesRemaining <= 0 && isDeadEnd && !isComplete && !noWordsRemaining && (
            <AdaptiveMotion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
              data-testid="blast-out-of-moves-notice-desktop"
            >
              <div
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-2.5',
                  'rounded-neo border-3 border-neo-black shadow-hard',
                  'bg-linear-to-r from-neo-red via-orange-400 to-neo-red',
                  'font-neo-display font-black uppercase tracking-wider text-base text-neo-black',
                )}
                style={{ boxShadow: '0 0 24px rgba(255,51,102,0.55), 3px 3px 0 #000' }}
              >
                <AlertTriangle className="w-5 h-5 shrink-0" strokeWidth={2.75} />
                <span>{t('blast.outOfMoves')}</span>
              </div>
            </AdaptiveMotion.div>
          )}
        </AdaptiveAnimatePresence>

        {/* Dead-end + shuffle (desktop) */}
        <AdaptiveAnimatePresence>
          {noWordsRemaining && !isComplete && (
            <AdaptiveMotion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
              data-testid="blast-stuck-notice-desktop"
            >
              <div
                className={cn(
                  'flex flex-col items-center gap-2 px-4 py-3',
                  'rounded-neo border-3 border-neo-black shadow-hard',
                  'bg-linear-to-r from-neo-purple via-neo-pink to-neo-purple',
                  'font-neo-display font-black uppercase tracking-wider text-sm text-neo-white',
                )}
                style={{ textShadow: '0 0 12px rgba(255,20,147,0.65)', boxShadow: '0 0 24px rgba(139,92,246,0.55), 3px 3px 0 #000' }}
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 shrink-0" strokeWidth={2.75} />
                  <span>{t('blast.stuck')}</span>
                </div>
                <Button
                  size="sm"
                  onClick={onShuffle}
                  className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed bg-neo-lime text-neo-black font-neo-display font-black uppercase text-xs w-full"
                >
                  <Shuffle className="h-3.5 w-3.5 me-1" strokeWidth={2.75} />
                  {t('blast.shuffle')}
                </Button>
              </div>
            </AdaptiveMotion.div>
          )}
        </AdaptiveAnimatePresence>
      </div>

      {/* end desktop flex-row wrapper */}
      </div>

      {/* Effects overlay */}
      <BlastEffectsLayer
        scoreFlyEvents={scoreFlyEvents}
        onScoreFlyComplete={onScoreFlyComplete ?? (() => {})}
        comboFlash={comboFlash}
        onComboFlashComplete={onComboFlashComplete ?? (() => {})}
        comboTypeName={comboTypeName}
        intensity={sequencerState?.chainLevel ?? 0}
      />

      {/* Score milestone announcements */}
      <BlastScoreMilestone score={score} t={t} />
      <ComboMilestoneAnnouncement comboLevel={comboLevel} />
      <BlastMicroToast id={microId} t={t} />

      {/* 4. Word forming area — mobile + shell (the shell hides the desktop left
          word-area, so this stacked one carries the live word there too). */}
      <div className={cn(
        'flex items-center justify-center shrink-0 relative z-40 px-4 py-2',
        !isDesktopCanvas && 'lg:hidden',
        'max-w-[360px] md:max-w-[480px] mx-auto w-full overflow-visible',
        'min-h-[44px]',
      )}>
        <div
          className={cn(
            'flex items-center justify-center gap-2 px-5 py-2 w-full',
            formedWord ? 'opacity-100' : 'opacity-40',
          )}
          style={{
            borderRadius: '8px',
            border: formedWord ? '2px solid rgba(0,0,0,0.4)' : '2px solid transparent',
            background: formedWord ? 'rgba(255,255,255,0.05)' : 'transparent',
          }}
        >
          <WordFormingArea word={formedWord} letterCount={formedWord.length} feedback={currentFeedback} compact />
          <BlastWordRewardPreview wordLength={formedWord.length} />
          {formedWord && (
            <span className="text-[10px] font-bold text-white tabular-nums">
              {formedWord.length}
            </span>
          )}
        </div>
      </div>

      {/* 5a. Out of moves — mobile only */}
      <AdaptiveAnimatePresence>
        {movesRemaining <= 0 && isDeadEnd && !isComplete && !noWordsRemaining && (
          <AdaptiveMotion.div
            initial={{ scale: 0.6, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className={cn('px-4 max-w-[360px] md:max-w-[480px] mx-auto w-full shrink-0 pb-safe', !isDesktopCanvas && 'lg:hidden')}
            data-testid="blast-out-of-moves-notice"
          >
            <div
              className={cn(
                'flex items-center justify-center gap-2 px-4 py-2.5',
                'rounded-neo border-3 border-neo-black shadow-hard',
                'bg-linear-to-r from-neo-red via-orange-400 to-neo-red',
                'font-neo-display font-black uppercase tracking-wider text-base text-neo-black',
              )}
              style={{ boxShadow: '0 0 24px rgba(255,51,102,0.55), 3px 3px 0 #000' }}
            >
              <AlertTriangle className="w-5 h-5 shrink-0" strokeWidth={2.75} />
              <span>{t('blast.outOfMoves')}</span>
            </div>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>

      {/* 5b. Dead-end — mobile only */}
      <AdaptiveAnimatePresence>
        {noWordsRemaining && !isComplete && (
          <AdaptiveMotion.div
            initial={{ scale: 0.6, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className={cn('px-4 max-w-[360px] md:max-w-[480px] mx-auto w-full shrink-0 pb-safe', !isDesktopCanvas && 'lg:hidden')}
            data-testid="blast-stuck-notice"
          >
            <div
              className={cn(
                'flex items-center justify-between gap-3 px-4 py-2.5',
                'rounded-neo border-3 border-neo-black shadow-hard',
                'bg-linear-to-r from-neo-purple via-neo-pink to-neo-purple',
                'font-neo-display font-black uppercase tracking-wider text-sm text-neo-white',
              )}
              style={{ textShadow: '0 0 12px rgba(255,20,147,0.65)', boxShadow: '0 0 24px rgba(139,92,246,0.55), 3px 3px 0 #000' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Lightbulb className="w-5 h-5 shrink-0" strokeWidth={2.75} />
                <span className="truncate">{t('blast.stuck')}</span>
              </div>
              <Button
                size="sm"
                onClick={onShuffle}
                className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed bg-neo-lime text-neo-black font-neo-display font-black uppercase text-xs shrink-0"
              >
                <Shuffle className="h-3.5 w-3.5 me-1" strokeWidth={2.75} />
                {t('blast.shuffle')}
              </Button>
            </div>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>

      {/* Tile Guide modal */}
      <BlastTileGuide isOpen={showTileGuide} onClose={() => setShowTileGuide(false)} t={t} />
    </div>
  );
});
BlastStage.displayName = 'BlastStage';
