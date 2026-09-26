import { useMemo, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { StandardDesktopAdapter } from './StandardDesktopAdapter';
import { BlastDesktopAdapter } from './BlastDesktopAdapter';
import { WordHuntDesktopAdapter } from './WordHuntDesktopAdapter';
import { WheelRushDesktopAdapter } from './WheelRushDesktopAdapter';
import { toRosterPlayers, type MpRosterUserLike } from '@/lib/multiplayer/roster';
import type { LadderWord } from './WordsLadder';
import type { BlastGoal } from './insights/GoalBanner';
import { MpRoundLayout, type MpRoundLayoutProps } from '../round/MpRoundLayout';
import { mergeServerWords, useServerAcceptedWords } from '../round/useServerAcceptedWords';

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

// Moved to lib/multiplayer/roster (the single roster source); re-exported for existing importers.
export { toRosterPlayers };

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
  /**
   * The room's seat list (`updateUsers`). Merged into the roster so seated
   * players who have not scored yet still show — the joiner's rail read
   * "PLAYERS 0" in a full room without it.
   */
  users?: MpRosterUserLike[];
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
  /**
   * The rebuilt round frame (classic, word-hunt): rail | HUD over board |
   * ladder, shared with phone. When set, the legacy per-mode adapter is skipped.
   */
  round?: Omit<MpRoundLayoutProps, 'canvas' | 'gameMode'>;
}

/**
 * Shared desktop chassis for the live MP in-game views (player + host). Reuses
 * the existing mode adapters by mapping the live data shapes and passing the
 * already-built game component through as `canvas`. Renders nothing for modes
 * without an adapter (callers should only mount this for `isShellMode`).
 */
export function MpDesktopShellFrame(props: MpDesktopShellFrameProps) {
  if (props.round) {
    return (
      <div data-mp-shell data-game-mode={props.gameMode} className="flex-1 min-h-0 flex flex-col">
        <MpRoundLayout {...props.round} gameMode={props.gameMode} canvas={props.canvas} />
      </div>
    );
  }
  return <LegacyShellFrame {...props} />;
}

function LegacyShellFrame(props: MpDesktopShellFrameProps) {
  const { leaderboard, users, foundWords, meId } = props;
  // Stable identities across timer ticks (perf rule 4): the adapters' memoized
  // rails compare these by reference.
  const roster = useMemo(() => toRosterPlayers(leaderboard, meId, users), [leaderboard, meId, users]);
  // Blast submits straight to the socket, so `foundWords` alone misses its
  // words: merge the server's accepts (once each, server points).
  const accepted = useServerAcceptedWords();
  const ladder = useMemo(
    () => mergeServerWords(toLadderWords(foundWords, meId), accepted, meId ?? ''),
    [foundWords, meId, accepted],
  );
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
