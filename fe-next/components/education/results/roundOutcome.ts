export type RoundOutcomeKind = 'empty' | 'zero' | 'solo' | 'tie' | 'winner';

export interface RoundOutcome {
  kind: RoundOutcomeKind;
  /** Confetti, sting, trophy loop and god rays are earned only by a real score. */
  celebrate: boolean;
  /** Everyone sharing the top score; empty when nobody scored. */
  leaders: string[];
  topScore: number;
  players: number;
}

/**
 * Classifies a host-stripped round so every celebration source reads one
 * answer. `playerCount` is the room size when the podium is capped at three.
 */
export function roundOutcome(
  entries: readonly { username: string; score: number }[],
  playerCount?: number
): RoundOutcome {
  const players = Math.max(entries.length, playerCount ?? 0);
  if (entries.length === 0) {
    return { kind: 'empty', celebrate: false, leaders: [], topScore: 0, players };
  }
  const topScore = Math.max(...entries.map((e) => e.score));
  if (topScore <= 0) {
    return { kind: 'zero', celebrate: false, leaders: [], topScore: 0, players };
  }
  const leaders = entries.filter((e) => e.score === topScore).map((e) => e.username);
  const kind: RoundOutcomeKind = players === 1 ? 'solo' : leaders.length > 1 ? 'tie' : 'winner';
  return { kind, celebrate: true, leaders, topScore, players };
}
