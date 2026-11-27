export const MAX_PLAYERS = 4;
export const PLAYER_COLORS = ['neo-lime', 'neo-pink', 'neo-cyan', 'neo-orange'] as const;

export interface Player {
  name: string;
  color: (typeof PLAYER_COLORS)[number];
  score: number | null;
}

export interface Match {
  players: Player[];
  turn: number;
  phase: 'handoff' | 'playing' | 'podium' | 'done';
}

export type MatchAction = { type: 'ready' } | { type: 'turnEnd'; score: number } | { type: 'finish' };

export function newMatch(names: string[]): Match {
  const players = names.slice(0, MAX_PLAYERS).map((n, i) => ({ name: n.trim(), color: PLAYER_COLORS[i], score: null }));
  if (!players.length) players.push({ name: '', color: PLAYER_COLORS[0], score: null });
  return { players, turn: 0, phase: players.length === 1 ? 'playing' : 'handoff' };
}

export function passPlay(m: Match, a: MatchAction): Match {
  if (a.type === 'ready') return m.phase === 'handoff' ? { ...m, phase: 'playing' } : m;
  if (a.type === 'finish') return m.phase === 'podium' ? { ...m, phase: 'done' } : m;
  if (m.phase !== 'playing') return m;
  const players = m.players.map((p, i) => (i === m.turn ? { ...p, score: Math.max(0, Math.floor(a.score)) } : p));
  const next = m.turn + 1;
  if (next < players.length) return { players, turn: next, phase: 'handoff' };
  return { players, turn: m.turn, phase: players.length === 1 ? 'done' : 'podium' };
}

export interface PodiumRow extends Player {
  index: number;
  place: number;
  score: number;
}

export function podium(m: Match): PodiumRow[] {
  const rows = m.players
    .map((p, index) => ({ ...p, index, score: p.score ?? 0, place: 0 }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return rows.map((r) => ({ ...r, place: rows.findIndex((o) => o.score === r.score) + 1 }));
}
