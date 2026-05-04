export interface RosterPlayer {
  userId: string;
  username: string;
  score: number;
  status: 'connected' | 'disconnected';
  isYou?: boolean;
}

/**
 * Score-sorted, status-aware roster for the desktop shell's left rail.
 * RTL-safe: uses only logical/symmetric Tailwind classes (gap, flex, truncate);
 * no `ml-*` / `mr-*` / `pl-*` / `pr-*`. The `you` indicator is a colored ring
 * for fast visual scan during round.
 */
export function RosterRail({ players }: { players: RosterPlayer[] }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <ul className="flex flex-col gap-2" data-component="roster-rail" aria-label="Players">
      {sorted.map((p, idx) => (
        <li
          key={p.userId}
          data-testid={`roster-row-${p.userId}`}
          data-row="true"
          data-you={p.isYou ? 'true' : 'false'}
          className={`flex items-center gap-2 p-2 border-2 border-foreground rounded-lg bg-card ${p.isYou ? 'ring-2 ring-neo-cyan' : ''}`}
        >
          <span className="font-mono text-xs opacity-60 w-5 text-center">{idx + 1}</span>
          <span
            data-testid={`status-dot-${p.userId}`}
            data-status={p.status}
            className={`inline-block w-2 h-2 rounded-full ${p.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`}
            aria-label={p.status}
          />
          <span className="flex-1 min-w-0 truncate">{p.username}</span>
          <span className="font-bold tabular-nums">{p.score}</span>
        </li>
      ))}
    </ul>
  );
}
