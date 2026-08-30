'use client';

/**
 * Renders single player through the multiplayer in-game shell.
 *
 * This is the "no separate UI" step: solo used to own PortraitGameLayout (593
 * lines) which duplicated the MP shell's board, timer, combo and word-forming
 * chrome. The shell is transport-free — its only two `socket` mentions are
 * comments, and the `*Connected` children read `useSelectionStore` /
 * `useComboTimer`, both local UI stores — so solo renders it directly and keeps
 * its own local game loop. No Socket.IO in offline or native play.
 *
 * Prop plumbing lives in `toShellProps` (pure, unit-tested). This file only
 * wires refs, handlers and the solo-only chrome slot.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PortraitLayout } from '@/components/game/in-game/components/PortraitLayout';
import { toShellProps } from './toShellProps';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { FoundWord as SpFoundWord } from './types';
import type { FoundWord as ShellFoundWord, ExtendedLeaderboardPlayer } from '@/shared/types/view';
import type { EarthquakeState } from '@/components/game/in-game/types';

export interface SinglePlayerShellProps {
  grid: LetterGrid;
  language: Language;
  score: number;
  remainingTime: number | null;
  isPaused: boolean;
  isGameOver: boolean;
  minWordLength: number;
  bots: Array<{ name: string; score: number }>;
  playerName: string;

  foundWords: SpFoundWord[];
  comboLevel: number;
  fireRoundActive: boolean;
  fireRoundRemaining: number;
  earthquakeState: EarthquakeState;
  currentFeedback: React.ComponentProps<typeof PortraitLayout>['currentFeedback'];
  highlightedPath: Array<{ row: number; col: number }>;
  lastWordFoundTime: number;
  totalBoardWords: number | null;
  isDesktop: boolean;

  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;
  onPathSubmit?: (cells: Array<{ row: number; col: number; letter: string }>) => void;
  /** MP tap-to-select. Solo spells by drag/keyboard, so this defaults to a no-op. */
  onSingleTapDetected?: React.ComponentProps<typeof PortraitLayout>['onSingleTapDetected'];
  onExit: () => void;
  onPauseToggle?: () => void;

  gameStatsRef: React.RefObject<HTMLDivElement | null>;
  t: React.ComponentProps<typeof PortraitLayout>['t'];
  /** Defaults to the app language direction. */
  dir?: 'rtl' | 'ltr';

  /** Coins badge, 0/N progress, practice training bar — solo-only chrome. */
  soloChrome?: React.ReactNode;
  children?: React.ReactNode;
}

const NOOP_TAP = () => {};

export function SinglePlayerShell(props: SinglePlayerShellProps) {
  const {
    grid, language, score, remainingTime, isPaused, isGameOver, minWordLength,
    bots, playerName, foundWords, comboLevel, fireRoundActive, fireRoundRemaining,
    earthquakeState, currentFeedback, highlightedPath, lastWordFoundTime,
    totalBoardWords, isDesktop, onWordSubmit, onWordChange, onPathSubmit,
    onSingleTapDetected = NOOP_TAP, onExit, onPauseToggle, gameStatsRef, t, dir: dirProp,
    soloChrome, children,
  } = props;

  const languageCtx = useLanguage();
  const contextDir = languageCtx.dir;

  // LanguageContext's `t` reads the dictionary from a ref, so its identity never
  // changes when translations finish loading. PortraitLayout and its children are
  // memoized, so anything that rendered during the load window keeps showing raw
  // key paths forever (observed: playerView.swipeHintShort). Re-wrapping `t` when
  // the dictionary lands gives those memo boundaries a changed prop, so they
  // re-render once with real copy — no remount, no game state lost.
  //
  // The context VALUE object is memoized on `translationsReady`, so depending on
  // it is exactly the "dictionary just arrived" signal, even though the flag
  // itself is not exposed on the context.
  const tReady = useCallback<typeof t>(
    (...args) => languageCtx.t(...args),
    [languageCtx],
  );
  const dir = dirProp ?? (contextDir as 'rtl' | 'ltr');

  const helpRef = useRef(false);

  // `bots` is mutated in place by the bot simulation, so this must depend on the
  // live scores, not just the array identity — see the stale-mutable-bot-state
  // pitfall in .claude/rules/60-recurring-pitfalls.md.
  const botScoreKey = bots.map((b) => `${b.name}:${b.score}`).join('|');
  const core = useMemo(
    () => toShellProps({
      grid, language, score, remainingTime, isPaused, isGameOver,
      minWordLength, bots, playerName,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grid, language, score, remainingTime, isPaused, isGameOver, minWordLength, playerName, botScoreKey],
  );

  return (
    <PortraitLayout
      {...core}
      deferredLeaderboard={core.deferredLeaderboard as unknown as ExtendedLeaderboardPlayer[]}
      username={playerName}
      t={tReady}
      dir={dir}
      foundWords={foundWords as unknown as ShellFoundWord[]}
      comboLevel={comboLevel}
      lastWordTime={lastWordFoundTime || null}
      fireRoundActive={fireRoundActive}
      fireRoundRemaining={fireRoundRemaining}
      earthquakeState={earthquakeState}
      currentFeedback={currentFeedback}
      highlightedCells={highlightedPath}
      lastWordFoundTime={lastWordFoundTime}
      totalBoardWords={totalBoardWords}
      hasAnimated
      isTypingMode={false}
      typedWord=""
      isDesktop={isDesktop}
      isHelpOpen={helpRef.current}
      onCloseHelp={() => { helpRef.current = false; }}
      onWordSubmit={onWordSubmit}
      onWordChange={onWordChange}
      onPathSubmit={onPathSubmit}
      onSingleTapDetected={onSingleTapDetected}
      onExitRoom={onExit}
      onPauseToggle={onPauseToggle}
      isPaused={isPaused}
      soloChrome={soloChrome}
      gameStatsRef={gameStatsRef}
    >
      {children}
    </PortraitLayout>
  );
}

export default SinglePlayerShell;
