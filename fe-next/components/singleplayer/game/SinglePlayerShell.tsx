'use client';

/**
 * Single player's play screen: plumbs the solo core into SoloGameLayout.
 *
 * Solo used to render through the multiplayer PortraitLayout. That shell is
 * built for rooms (chat, host, tournament, word-hunt, blast) and squashed the
 * board on phones — see SoloGameLayout's header for the measurements. The board,
 * word strip, overlays and feedback are still the shared components; only the
 * frame around them is solo's own, modelled on the Adventure run shell.
 */
import React from 'react';
import { SoloGameLayout } from './SoloGameLayout';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { FoundWord } from './types';
import type { EarthquakeState, TranslationFn } from '@/components/game/in-game/types';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { SoloMission } from '@/lib/soloMissions';

export interface SinglePlayerShellProps {
  grid: LetterGrid;
  language: Language;
  score: number;
  remainingTime: number | null;
  /** Round length in seconds (the start card and clock read it). */
  totalSeconds: number;
  isPaused: boolean;
  isGameOver: boolean;
  /** Mutated in place by the bot simulation — read fresh every render. */
  bots: Array<{ name: string; score: number }>;

  foundWords: FoundWord[];
  comboLevel: number;
  fireRoundActive: boolean;
  fireRoundRemaining: number;
  earthquakeState: EarthquakeState;
  currentFeedback: WordFeedback | null;
  highlightedPath: Array<{ row: number; col: number }>;
  lastWordFoundTime: number;
  isDesktop: boolean;
  awaitingStart: boolean;
  onStart: () => void;

  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;
  onPathSubmit?: (cells: Array<{ row: number; col: number; letter: string }>) => void;
  onExit: () => void;
  onPauseToggle?: () => void;

  gameStatsRef: React.RefObject<HTMLDivElement | null>;
  t: TranslationFn;

  /** Coins badge, practice training bar — solo-only chrome. */
  soloChrome?: React.ReactNode;
  soloStreak?: number;
  soloMultiplier?: number;
  soloPraiseKey?: string | null;
  soloMissions?: readonly SoloMission[];
  children?: React.ReactNode;
}

export function SinglePlayerShell(props: SinglePlayerShellProps) {
  // Copy the bots each render: the simulation mutates the array in place, so a
  // memoised child would otherwise keep showing the old scores (Class 2 pitfall).
  const bots = props.bots.map((b) => ({ name: b.name, score: b.score }));
  return <SoloGameLayout {...props} bots={bots} />;
}

export default SinglePlayerShell;
