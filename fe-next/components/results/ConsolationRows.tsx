'use client';

import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PlayerScore } from '@/hooks/useResultsData';
import type { ConsolationCrown } from '@/utils/consolationCrowns';
import Avatar from '@/components/Avatar';
import { AddFriendBadge } from '@/components/results/ResultsFriendStatus';

interface ConsolationRowsProps {
  /** Players ranked 4th and below */
  players: PlayerScore[];
  /** Map of username -> consolation crown */
  crowns: Map<string, ConsolationCrown>;
  /** Current player username (to highlight) */
  currentUsername?: string;
  /** Translation function */
  t: (key: string) => string | undefined;
  /** Starting rank (e.g. 4 when top 3 are on the podium) */
  startRank?: number;
}

function formatScore(score: number): string {
  return score.toLocaleString();
}

const rowVariants = {
  hidden: (i: number) => ({
    opacity: 0,
    x: i % 2 === 0 ? -30 : 30,
    scale: 0.92,
    rotate: i % 2 === 0 ? -2 : 2,
  }),
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 250,
      damping: 18,
      delay: 0.6 + i * 0.08,
    },
  }),
};

export default function ConsolationRows({
  players,
  crowns,
  currentUsername,
  t,
  startRank = 4,
}: ConsolationRowsProps) {
  const reducedMotion = useReducedMotion();
  if (!players.length) return null;

  return (
    <div className="divide-y divide-white/5">
      {players.map((player, index) => {
        const crown = crowns.get(player.username);
        const isCurrent = player.username === currentUsername;
        const rank = startRank + index;

        return (
          <m.div
            key={player.username}
            custom={index}
            variants={reducedMotion ? undefined : rowVariants}
            initial="hidden"
            animate="visible"
            className="flex items-center justify-between py-4"
          >
            <div className="flex items-center gap-3">
              {/* Placement number */}
              <span className="text-xs font-black tabular-nums text-white w-6 text-center shrink-0">
                {rank}
              </span>

              {/* Crown image */}
              {crown && (
                <m.img
                  src={crown.image}
                  alt=""
                  initial={reducedMotion ? undefined : { scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 14, delay: 0.7 + index * 0.08 }}
                  className={cn(
                    'w-10 h-10 rounded-lg shrink-0',
                    crown.id === 'sniper' && 'shadow-[0_0_8px_rgba(0,255,255,0.3)]',
                    crown.id === 'speedDemon' && 'shadow-[0_0_8px_rgba(255,107,53,0.3)]',
                    crown.id === 'scholar' && 'shadow-[0_0_8px_rgba(255,20,147,0.3)]',
                    crown.id === 'explorer' && 'shadow-[0_0_8px_rgba(255,225,53,0.3)]',
                    crown.id === 'clutch' && 'shadow-[0_0_8px_rgba(255,20,147,0.3)]',
                    crown.id === 'tank' && 'shadow-[0_0_8px_rgba(0,255,255,0.3)]'
                  )}
                />
              )}

              {/* Player avatar */}
              <div className="w-10 h-10 shrink-0">
                <Avatar
                  userId={player.username}
                  customAvatar={player.avatar?.customAvatar}
                  size="md"
                  className="w-full h-full rounded-full"
                />
              </div>

              <div className="flex flex-col min-w-0">
                <p
                  className={cn(
                    'text-xs font-bold uppercase tracking-tight truncate',
                    isCurrent ? 'text-white' : 'text-white'
                  )}
                >
                  {player.username}
                </p>
                {crown && (
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        'text-[9px] font-black uppercase tracking-widest',
                        crown.color
                      )}
                    >
                      {t(`results.crowns.${crown.id}`) || crown.name}
                    </span>
                    <span className="text-[8px] text-white leading-tight">
                      {t(crown.descriptionKey)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isCurrent && (
                <AddFriendBadge username={player.username} isBot={(player as { isBot?: boolean }).isBot} />
              )}
              <span
                className={cn(
                  'text-xs font-black tabular-nums',
                  isCurrent ? 'text-white' : 'text-white'
                )}
              >
                {formatScore(player.score)}
              </span>
            </div>
          </m.div>
        );
      })}
    </div>
  );
}
