export interface RosterPlayer {
  userId: string;
  username: string;
  score: number;
  status: 'connected' | 'disconnected';
  isYou?: boolean;
}

/** Placeholder — real implementation in Task P2.T7. */
export function RosterRail({ players }: { players: RosterPlayer[] }) {
  return (
    <ul className="flex flex-col gap-2" data-component="roster-rail">
      {players.map(p => (
        <li key={p.userId} className="flex justify-between p-2 border-2 border-foreground rounded-lg bg-card">
          <span>{p.username}</span><span>{p.score}</span>
        </li>
      ))}
    </ul>
  );
}
