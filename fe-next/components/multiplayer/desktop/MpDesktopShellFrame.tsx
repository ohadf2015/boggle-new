import type { ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { StandardDesktopAdapter } from './StandardDesktopAdapter';
import { BlastDesktopAdapter } from './BlastDesktopAdapter';
import { WordHuntDesktopAdapter } from './WordHuntDesktopAdapter';
import { WheelRushDesktopAdapter } from './WheelRushDesktopAdapter';
import type { RosterPlayer } from './RosterRail';
import type { LadderWord } from './WordsLadder';
import type { BlastGoal } from './insights/GoalBanner';

/** Modes that have a desktop-shell adapter wired here. */
export const SHELL_MODES = ['classic', 'blast', 'word-hunt', 'wheel-rush'] as const;
export type ShellMode = (typeof SHELL_MODES)[number];

export function isShellMode(mode: string | null | undefined): mode is ShellMode {
  return !!mode && (SHELL_MODES as readonly string[]).includes(mode);
}

/** Loose live shapes (PlayerInGameView/HostInGameView) — mapped to shell shapes here. */
interface LeaderboardEntryLike {
  username: string;
  score: number;
  wordCount?: number;
}
interface FoundWordLike {
  word: string;
  score?: number;
  timestamp?: number;
}

/**
 * Maps the live server leaderboard to the desktop shell's RosterPlayer shape.
 * The live MP path keys players by username, so userId === username and the
 * current player is flagged via meId.
 */
export function toRosterPlayers(
  leaderboard: LeaderboardEntryLike[] | undefined,
  meId?: string,
): RosterPlayer[] {
  if (!leaderboard) return [];
  return leaderboard.map((p) => ({
    userId: p.username,
    username: p.username,
    score: p.score,
    wordCount: p.wordCount,
    status: 'connected' as const,
    isYou: p.username === meId,
  }));
}

/**
 * Maps the local player's found words to the shell's WordsLadder shape.
 * `foundWords` in the live views are always the local player's, so userId = meId.
 */
export function toLadderWords(
  foundWords: FoundWordLike[] | undefined,
  meId?: string,
): LadderWord[] {
  if (!foundWords) return [];
  return foundWords.map((w) => ({
    word: w.word,
    score: w.score ?? 0,
    ts: w.timestamp ?? 0,
    userId: meId ?? '',
  }));
}

export interface MpDesktopShellFrameProps {
  gameMode: string;
  /** The mode's game component, rendered into the shell's center slot unchanged. */
  canvas: ReactNode;
  leaderboard: LeaderboardEntryLike[] | undefined;
  foundWords: FoundWordLike[] | undefined;
  socket?: Socket | null;
  meId?: string;
  roomId: string;
  remainingTime: number | null | undefined;
  totalTime: number | null | undefined;
  startTimeMs?: number;
  // mode-specific extras (all optional; safe defaults applied)
  targetCategory?: string;
  huntFound?: number;
  huntTarget?: number;
  fogProgress?: number;
  currentSpin?: number;
  totalSpins?: number;
  blastGoal?: BlastGoal;
  comboCount?: number;
  comboMultiplier?: number;
  retiredTileCount?: number;
  luckyBoostActive?: boolean;
}

/**
 * Shared desktop chassis for the live MP in-game views (player + host). Reuses
 * the existing mode adapters by mapping the live data shapes and passing the
 * already-built game component through as `canvas`. Renders nothing for modes
 * without an adapter (callers should only mount this for `isShellMode`).
 */
export function MpDesktopShellFrame(props: MpDesktopShellFrameProps) {
  const roster = toRosterPlayers(props.leaderboard, props.meId);
  const ladder = toLadderWords(props.foundWords, props.meId);
  const common = {
    roomId: props.roomId,
    leaderboard: roster,
    foundWords: ladder,
    remainingTime: props.remainingTime ?? 0,
    totalTime: props.totalTime ?? 0,
    canvas: props.canvas,
    meId: props.meId,
    socket: props.socket,
    startTimeMs: props.startTimeMs,
  };

  switch (props.gameMode) {
    case 'classic':
      return <StandardDesktopAdapter {...common} />;
    case 'blast':
      return (
        <BlastDesktopAdapter
          {...common}
          goal={props.blastGoal}
          comboCount={props.comboCount}
          comboMultiplier={props.comboMultiplier}
          retiredTileCount={props.retiredTileCount}
          luckyBoostActive={props.luckyBoostActive}
        />
      );
    case 'word-hunt':
      return (
        <WordHuntDesktopAdapter
          {...common}
          targetCategory={props.targetCategory ?? ''}
          huntFound={props.huntFound}
          huntTarget={props.huntTarget}
        />
      );
    case 'wheel-rush':
      return (
        <WheelRushDesktopAdapter
          {...common}
          fogProgress={props.fogProgress ?? 0}
          currentSpin={props.currentSpin}
          totalSpins={props.totalSpins}
        />
      );
    default:
      return null;
  }
}
