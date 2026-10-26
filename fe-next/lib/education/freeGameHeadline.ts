import type { LastGameMissedWord, RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import { REAL_CLASS_MIN_PLAYERS } from '@/lib/education/teacherUsagePrompt';

export const HEADLINE_MISSED_SHOWN = 3;

export interface FreeGameHeadline {
  gameCode: string;
  gameMode: string;
  playedAt: string;
  players: number;
  classAverage: number;
  topMissed: string[];
}

/** Words at least one student missed, hardest first: the list every round report shows. */
export function missedThisRound(game: RecentClassroomGame): LastGameMissedWord[] {
  return game.missedWords.filter((w) => w.missedBy > 0);
}

/** The free teacher's summary of their latest real class game (newest-first input); null until one exists. */
export function freeGameHeadline(games: readonly RecentClassroomGame[]): FreeGameHeadline | null {
  const game = games.find((g) => g.players.length >= REAL_CLASS_MIN_PLAYERS);
  if (!game) return null;
  const total = game.players.reduce((sum, p) => sum + p.score, 0);
  return {
    gameCode: game.gameCode,
    gameMode: game.gameMode,
    playedAt: game.playedAt,
    players: game.players.length,
    classAverage: Math.round(total / game.players.length),
    topMissed: missedThisRound(game).slice(0, HEADLINE_MISSED_SHOWN).map((w) => w.word),
  };
}
