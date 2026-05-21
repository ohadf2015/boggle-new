'use client';

import { memo } from 'react';
import { SurvivalClueBoxes } from '@/components/daily/survival/SurvivalClueBoxes';
import { SurvivalLifeBar } from '@/components/daily/survival/SurvivalLifeBar';
import { SurvivalGridSection } from '@/components/daily/survival/SurvivalGridSection';
import { WordHuntMPHeader } from './WordHuntMPHeader';
import { WordHuntMPLeaderboard, type LeaderboardPlayer } from './WordHuntMPLeaderboard';
import { WordHuntGameOverOverlay } from './WordHuntGameOverOverlay';
import type { DeathRecapStats } from './WordHuntDeathRecap';
import type { LetterGrid } from '@/types';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { AccumulatedClue, TargetAttempt } from '@/components/daily/survival/types';
import type { HintLevel } from '@/utils/aiHintGenerator';
import type { HighlightedCell } from '@/components/GridComponent';
import { MPDragCoachmark } from '@/components/multiplayer/MPDragCoachmark';

export interface WordHuntGameLayoutProps {
  // Header
  score: number;
  onQuit: () => void;
  onShowHelp?: () => void;

  // Clue boxes
  targetLength: number;
  currentHint: HintLevel | null;
  attempts: TargetAttempt[];
  accumulatedClues: Map<number, AccumulatedClue>;
  knownLetters: Set<string>;
  latestAttemptFeedback: LetterFeedback[] | null;
  showFeedbackOverlay: boolean;

  // Life bar
  lifePoints: number;
  isGameOver: boolean;
  targetFound: boolean;
  /** Username of who found the target (null = not found yet). Used to show correct overlay. */
  targetFoundBy?: string | null;
  isLifeGaining: boolean;
  lifeGainAmount: number | null;

  // Clue animation
  isClueGaining: boolean;

  // Grid
  grid: LetterGrid;
  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;
  highlightedPath?: HighlightedCell[];

  // Word forming (kept for caller compat, not rendered — feedback shown in clue boxes)
  formedWord?: string;
  letterCount?: number;
  wordFeedback?: unknown;
  /** Currently formed word length equals targetLength — surface warning in clue boxes. */
  matchesTargetLength?: boolean;

  // Leaderboard
  playerLives: Record<string, number>;
  eliminatedPlayers: string[];
  leaderboard: LeaderboardPlayer[];
  currentUsername: string;
  wrongGuessShake?: boolean;

  // Death recap
  deathRecapStats?: DeathRecapStats | null;

  /** Suppress the MP game-over overlay entirely (e.g. in adventure mode). */
  hideGameOverOverlay?: boolean;

  /** MP drag-FTUE coachmark control. Owner-component decides visibility +
   *  dismissal; layout just mounts it inside the grid wrapper so the cursor
   *  animation can read `[data-letter]` tile rects. */
  dragFTUE?: { visible: boolean; onDismiss: () => void };

  // Common
  t: (key: string, params?: Record<string, string | number>) => string;
  gameDir: 'ltr' | 'rtl';
}

export const WordHuntGameLayout = memo<WordHuntGameLayoutProps>(({
  // Header
  score,
  onQuit,
  onShowHelp,

  // Clue boxes
  targetLength,
  currentHint,
  attempts,
  accumulatedClues,
  knownLetters,
  latestAttemptFeedback,
  showFeedbackOverlay,

  // Life bar
  lifePoints,
  isGameOver,
  targetFound,
  targetFoundBy,
  isLifeGaining,
  lifeGainAmount,

  // Clue animation
  isClueGaining,

  // Match warning
  matchesTargetLength,

  // Grid
  grid,
  onWordSubmit,
  onWordChange,
  highlightedPath,

  // Leaderboard
  playerLives,
  eliminatedPlayers,
  leaderboard,
  currentUsername,
  wrongGuessShake,

  // Death recap
  deathRecapStats,

  hideGameOverOverlay,

  dragFTUE,

  // Common
  t,
  gameDir,
}) => {
  return (
    <div className="flex-1 flex flex-col min-[720px]:flex-row min-h-0 overflow-x-hidden overflow-y-auto">
      {/* Main game area — capped width on wider screens, with vertical rhythm between sections */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden w-full max-w-3xl mx-auto gap-1.5 md:gap-2 [@media(max-height:560px)]:gap-0.5">
        {/* Score + Quit — compact */}
        <WordHuntMPHeader
          score={score}
          onQuit={onQuit}
          onShowHelp={onShowHelp}
          t={t}
        />

        {/* Clue Boxes — tight vertical padding; on short landscape collapse outer padding too.
            Skeleton placeholder while server target metadata is in flight (recovery race). */}
        <div className={`px-2 [@media(max-height:560px)]:px-1 flex-shrink-0${wrongGuessShake ? ' animate-neo-shake' : ''}`}>
          {targetLength > 0 ? (
            <SurvivalClueBoxes
              currentHint={currentHint}
              targetWord={'?'.repeat(targetLength)}
              attempts={attempts}
              accumulatedClues={accumulatedClues}
              revealedLetters={new Set<number>()}
              knownLetters={knownLetters}
              latestAttemptFeedback={latestAttemptFeedback}
              showFeedbackOverlay={showFeedbackOverlay}
              isClueGaining={isClueGaining}
              skipAnimations={false}
              gameDir={gameDir}
              t={t}
              matchesTargetLength={matchesTargetLength}
            />
          ) : (
            <ClueTilesSkeleton t={t} />
          )}
        </div>

        {/* Life Bar — compact wrapper */}
        <div className="px-2 shrink-0">
          <SurvivalLifeBar
            lifePoints={lifePoints}
            isGameOver={isGameOver}
            isLifeGaining={isLifeGaining}
            lifeGainAmount={lifeGainAmount}
            skipAnimations={false}
            onLifeGainComplete={() => {}}
          />
        </div>

        {/* Grid — caps to a square that fits BOTH width and remaining height,
             so the bottom row never overflows when clue boxes + life bar + leaderboard
             share the column. No dvh floor — that pushed the last row off-screen. */}
        <div
          className="flex-1 min-h-0 px-1 relative overflow-hidden flex items-center justify-center"
          style={{ containerType: 'size' }}
        >
          {/* Grid frame: square that fits the container. Cap raises on desktop so the
              board fills more of the central column (was 440 → looked small at ≥1024px).
              `flex` (NOT items-center) is load-bearing: it lets the flex-1 SurvivalGridSection
              fill this square on BOTH axes (width via flex-1, height via default stretch).
              Without it the height chain collapses to auto, the inner .game-board-frame's
              `max-height: min(--board-size, 100%)` clamp goes inert, and the viewport-based
              --board-size overflows the slot → top/bottom rows clip under the chrome. */}
          <div
            className="relative mx-auto flex [--wh-grid-size:min(100cqw,100cqh,440px)] min-[1024px]:[--wh-grid-size:min(100cqw,100cqh,560px)] xl:[--wh-grid-size:min(100cqw,100cqh,620px)]"
            style={{
              width: 'var(--wh-grid-size)',
              height: 'var(--wh-grid-size)',
              aspectRatio: '1 / 1',
            }}
          >
            <SurvivalGridSection
              grid={grid}
              isGameOver={isGameOver}
              eliminatedLetters={new Set<string>()}
              onWordSubmit={onWordSubmit}
              onWordChange={onWordChange}
              highlightedPath={highlightedPath}
              t={t}
            />

            {/* MP drag-to-spell FTUE — only mounted in MP matches when
                the player has been idle 20s; auto-hides on first word. */}
            {dragFTUE?.visible && (
              <MPDragCoachmark
                t={t}
                accent="pink"
                targetSelector="[data-letter]:not([disabled])"
                onDismiss={dragFTUE.onDismiss}
              />
            )}

            {/* Game over overlay — death or victory, then spectator mode */}
            {!hideGameOverOverlay && (
              <WordHuntGameOverOverlay
                reason={isGameOver ? (targetFound ? (targetFoundBy != null && targetFoundBy !== currentUsername ? 'otherFound' : 'found') : 'eliminated') : null}
                t={t}
                deathRecapStats={deathRecapStats}
              />
            )}
          </div>
        </div>

        {/* MP Leaderboard — mobile strip. Cap by absolute px on short landscape so the grid keeps room. */}
        <div className="shrink-0 max-h-[80px] [@media(min-height:560px)]:max-h-[10vh] overflow-y-auto min-[720px]:hidden">
          <WordHuntMPLeaderboard
            playerLives={playerLives}
            eliminatedPlayers={eliminatedPlayers}
            leaderboard={leaderboard}
            currentUsername={currentUsername}
            t={t}
          />
        </div>
      </div>

      {/* MP Leaderboard — desktop sidebar */}
      <div className="hidden min-[720px]:flex min-[720px]:flex-col min-[720px]:w-56 lg:w-72 xl:w-80 min-[720px]:border-s-3 min-[720px]:border-neo-black min-[720px]:bg-neo-navy/50 min-[720px]:overflow-y-auto">
        <WordHuntMPLeaderboard
          playerLives={playerLives}
          eliminatedPlayers={eliminatedPlayers}
          leaderboard={leaderboard}
          currentUsername={currentUsername}
          t={t}
        />
      </div>
    </div>
  );
});

WordHuntGameLayout.displayName = 'WordHuntGameLayout';

/**
 * Placeholder shown when MP word-hunt target metadata is missing (race / lost startGame).
 * Mirrors the SurvivalClueBoxes shell so the layout doesn't shift when real data arrives.
 * Auto-recovery in WordHuntGame emits `requestGameState` after 1.5s.
 */
function ClueTilesSkeleton({ t }: { t: (key: string) => string }) {
  return (
    <div
      data-testid="wh-clue-skeleton"
      className="mx-auto max-w-3xl w-full px-3 py-2 mb-0.5 rounded-neo-lg bg-neo-navy/30 dark:bg-neo-navy/50 border-2 border-neo-black/20 animate-pulse"
      role="status"
      aria-live="polite"
      aria-label={t('wordHunt.survival.syncingTarget')}
    >
      <div className="text-center mb-2 text-xl sm:text-2xl font-black text-neo-cream/40">
        {t('wordHunt.survival.syncingTarget')}
      </div>
      <div className="flex justify-center flex-wrap gap-2 sm:gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center border-2 rounded-neo font-bold shadow-hard bg-neo-black/60 border-neo-black text-neo-cream/40"
          >
            ?
          </div>
        ))}
      </div>
      <div className="min-h-[40px] sm:min-h-[44px] [@media(max-height:560px)]:min-h-0" />
    </div>
  );
}
