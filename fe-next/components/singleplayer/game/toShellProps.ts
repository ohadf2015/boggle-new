/**
 * Maps single-player game state onto the multiplayer in-game shell
 * (`components/game/in-game/components/PortraitLayout`).
 *
 * Single player used to own three bespoke layouts — PortraitGameLayout (593
 * lines), LandscapeGameLayout (424) and DesktopGameLayout (394) — that
 * duplicated the MP shell's board, timer, combo and word-forming chrome. The MP
 * shell is transport-free (its only two `socket` mentions are comments; the
 * `*Connected` wrappers read `useSelectionStore` / `useComboTimer`, both local
 * UI stores), so solo can render it directly and keep its local game loop.
 *
 * The mapping lives here, as a pure function, because that is where the bugs
 * are: a shell swap is mostly prop plumbing, and plumbing is testable without a
 * ~60-prop render harness.
 */
import type { LetterGrid, Language } from '@/shared/types/game';

export interface ShellBot {
  name: string;
  score: number;
}

export interface ShellLeaderboardEntry {
  username: string;
  score: number;
  isBot?: boolean;
}

export interface ToShellPropsInput {
  grid: LetterGrid;
  language: Language;
  score: number;
  remainingTime: number | null;
  isPaused: boolean;
  isGameOver: boolean;
  minWordLength: number;
  /** Mutated in place by the bot simulation — read it fresh every render. */
  bots: ShellBot[];
  playerName: string;
}

export interface ShellCoreProps {
  letterGrid: LetterGrid;
  gameLanguage: Language;
  playerScore: number;
  remainingTime: number | null;
  timerValue: number;
  gameActive: boolean;
  isPlaying: boolean;
  minWordLength: number;
  deferredLeaderboard: ShellLeaderboardEntry[];
  playerRank: number | null;
  /* Solo has no room, no host and no tournament. */
  gameCode: string;
  isHost: boolean;
  tournamentData: null;
  showStartAnimation: boolean;
  gameplayFocusMode: boolean;
}

/**
 * Solo gains something in this swap: bots become real leaderboard entries, so
 * the live standings render during play instead of only at the results screen.
 */
export function toShellLeaderboard(
  bots: ShellBot[],
  playerName: string,
  playerScore: number,
): ShellLeaderboardEntry[] {
  return [
    { username: playerName, score: playerScore },
    ...bots.map((b) => ({ username: b.name, score: b.score, isBot: true })),
  ].sort((a, b) => b.score - a.score);
}

/** 1-based rank of the player within the sorted leaderboard, or null if absent. */
export function toPlayerRank(
  leaderboard: ShellLeaderboardEntry[],
  playerName: string,
): number | null {
  const idx = leaderboard.findIndex((e) => e.username === playerName && !e.isBot);
  return idx === -1 ? null : idx + 1;
}

export function toShellProps(input: ToShellPropsInput): ShellCoreProps {
  const leaderboard = toShellLeaderboard(input.bots, input.playerName, input.score);
  // `gameActive` drives the shell's input handling — a paused or finished solo
  // board must not accept letters, same as an MP round that has ended.
  const active = !input.isPaused && !input.isGameOver;

  return {
    letterGrid: input.grid,
    gameLanguage: input.language,
    playerScore: input.score,
    remainingTime: input.remainingTime,
    timerValue: input.remainingTime ?? 0,
    gameActive: active,
    isPlaying: active,
    minWordLength: input.minWordLength,
    deferredLeaderboard: leaderboard,
    playerRank: toPlayerRank(leaderboard, input.playerName),
    gameCode: '',
    isHost: true,
    tournamentData: null,
    showStartAnimation: false,
    gameplayFocusMode: false,
  };
}
