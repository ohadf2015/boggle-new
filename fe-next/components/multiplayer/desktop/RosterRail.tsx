import { memo, useMemo } from 'react';
import Avatar from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface RosterPlayer {
  userId: string;
  username: string;
  score: number;
  wordCount?: number;
  status: 'connected' | 'disconnected';
  isYou?: boolean;
  customAvatar?: CustomAvatarConfig | null;
}

function RosterRailImpl({ players }: { players: RosterPlayer[] }) {
  // Memoize sort + maxScore so the timer-driven parent re-renders (1Hz) don't
  // re-sort every render. The list itself rarely changes — sort only when
  // `players` reference does.
  const { sorted, maxScore } = useMemo(() => {
    const s = [...players].sort((a, b) => b.score - a.score);
    let max = 1;
    for (const p of s) if (p.score > max) max = p.score;
    return { sorted: s, maxScore: max };
  }, [players]);

  return (
    <ul className="flex flex-col gap-2" data-component="roster-rail" aria-label="Players">
      {sorted.map((p, idx) => {
        const pct = Math.min(100, (p.score / maxScore) * 100);
        return (
          <li
            key={p.userId}
            data-testid={`roster-row-${p.userId}`}
            data-row="true"
            data-you={p.isYou ? 'true' : 'false'}
            className={`flex flex-col gap-1.5 p-2.5 border-2 border-foreground rounded-lg bg-card ${p.isYou ? 'ring-2 ring-neo-cyan' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs opacity-50 w-5 text-center shrink-0">{idx + 1}</span>
              <div className="relative shrink-0">
                <Avatar
                  size="sm"
                  customAvatar={p.customAvatar ?? undefined}
                  userId={p.userId}
                  disableEffects
                />
                <span
                  data-testid={`status-dot-${p.userId}`}
                  data-status={p.status}
                  className={`absolute bottom-0 end-0 w-2 h-2 rounded-full border border-background ${p.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`}
                  aria-label={p.status}
                />
              </div>
              <span className="flex-1 min-w-0 truncate text-sm font-medium">{p.username}</span>
              <div className="flex flex-col items-end shrink-0">
                <span className="font-bold tabular-nums text-sm">{p.score}</span>
                {p.wordCount != null && p.wordCount > 0 && (
                  <span className="text-[10px] opacity-50 tabular-nums">{p.wordCount}w</span>
                )}
              </div>
            </div>
            <div className="ms-7 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${p.isYou ? 'bg-neo-cyan' : 'bg-neo-lime/60'}`}
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export const RosterRail = memo(RosterRailImpl);
