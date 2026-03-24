'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PlayerScore } from '@/hooks/useResultsData';
import type { ConsolationCrown } from '@/utils/consolationCrowns';

interface ConsolationRowsProps {
  /** Players ranked 4th and below */
  players: PlayerScore[];
  /** Map of username -> consolation crown */
  crowns: Map<string, ConsolationCrown>;
  /** Current player username (to highlight) */
  currentUsername?: string;
  /** Translation function */
  t: (key: string) => string | undefined;
}

function formatScore(score: number): string {
  return score.toLocaleString();
}

export default function ConsolationRows({
  players,
  crowns,
  currentUsername,
  t,
}: ConsolationRowsProps) {
  if (!players.length) return null;

  return (
    <div className="divide-y divide-white/5">
      {players.map((player, index) => {
        const crown = crowns.get(player.username);
        const isCurrent = player.username === currentUsername;
        const avatarEmoji = (player.avatar as any)?.emoji;
        const avatarColor = (player.avatar as any)?.color || '#334155';

        return (
          <motion.div
            key={player.username}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.3 }}
            className="flex items-center justify-between py-4"
          >
            <div className="flex items-center gap-3">
              {crown && (
                <img
                  src={crown.image}
                  alt=""
                  className={cn(
                    'w-8 h-8 rounded-lg shrink-0',
                    crown.id === 'sniper' && 'shadow-[0_0_8px_rgba(0,255,255,0.3)]',
                    crown.id === 'speedster' && 'shadow-[0_0_8px_rgba(255,107,53,0.3)]',
                    crown.id === 'wordsmith' && 'shadow-[0_0_8px_rgba(255,20,147,0.3)]',
                    crown.id === 'explorer' && 'shadow-[0_0_8px_rgba(255,225,53,0.3)]'
                  )}
                />
              )}
              <div
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-sm shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {avatarEmoji || player.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <p
                  className={cn(
                    'text-xs font-bold uppercase tracking-tight truncate',
                    isCurrent ? 'text-white' : 'text-white/80'
                  )}
                >
                  {player.username}
                </p>
                {crown && (
                  <span
                    className={cn(
                      'text-[9px] font-black uppercase tracking-widest',
                      crown.color
                    )}
                  >
                    {t(`crowns.${crown.id}`) || crown.name}
                  </span>
                )}
              </div>
            </div>
            <span
              className={cn(
                'text-xs font-black tabular-nums shrink-0',
                isCurrent ? 'text-white/60' : 'text-white/40'
              )}
            >
              {formatScore(player.score)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
