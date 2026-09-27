'use client';

import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import PlayerProfileTooltip from '@/components/ui/PlayerProfileTooltip';

interface LeaderboardParticipant {
  id: string;
  event_id: string;
  user_id: string;
  username: string;
  score: number;
  joined_at: string;
  rewards_claimed: boolean;
}

interface EventReward {
  position: number;
  coins: number;
  title?: string;
  badge?: string;
}

interface EventLeaderboardProps {
  participants: LeaderboardParticipant[];
  rewards: EventReward[];
  currentUserId?: string;
  compact?: boolean;
  className?: string;
}

const positionIcons = [Trophy, Medal, Award];

const EventLeaderboard: React.FC<EventLeaderboardProps> = ({
  participants,
  rewards,
  currentUserId,
  compact = false,
  className,
}) => {
  const { t } = useLanguage();

  const rewardForPosition = (pos: number) =>
    rewards.find((r) => r.position === pos) ?? null;

  return (
    <div
      data-testid="event-leaderboard"
      className={cn(
        'border-3 border-black rounded-neo shadow-hard bg-neo-navy/90 overflow-hidden',
        compact && 'compact',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b-3 border-black bg-neo-navy flex items-center gap-2">
        <Trophy size={18} className="text-neo-yellow" />
        <h3 className="font-neo-display font-bold text-white">
          {t('events.leaderboard')}
        </h3>
      </div>

      {/* Empty state */}
      {participants.length === 0 ? (
        <div className="p-6 text-center text-white text-sm">
          {t('events.noParticipants')}
        </div>
      ) : (
        <div className={cn('divide-y divide-white/10', compact && 'max-h-60 overflow-y-auto')}>
          {participants.map((p, index) => {
            const position = index + 1;
            const isCurrentUser = p.user_id === currentUserId;
            const reward = rewardForPosition(position);
            const Icon = positionIcons[index] ?? null;

            return (
              <AdaptiveMotion.div
                key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div
                  data-testid={`leaderboard-row-${p.user_id}`}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5',
                    isCurrentUser && 'ring-2 ring-neo-yellow bg-neo-yellow/10',
                    position <= 3 && 'bg-white/5'
                  )}
                >
                  {/* Position */}
                  <div className="w-8 text-center font-bold text-white">
                    {Icon ? (
                      <Icon
                        size={18}
                        className={cn(
                          position === 1 && 'text-yellow-400',
                          position === 2 && 'text-gray-300',
                          position === 3 && 'text-amber-600'
                        )}
                      />
                    ) : (
                      <span className="text-sm">{position}</span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <PlayerProfileTooltip
                      player={{
                        id: p.user_id || p.id,
                        username: p.username,
                        score: p.score,
                      }}
                      isCurrentUser={isCurrentUser}
                      side="right"
                    >
                      <span className={cn(
                        'text-sm font-medium truncate block',
                        isCurrentUser ? 'text-neo-yellow font-bold' : 'text-white cursor-pointer hover:underline'
                      )}>
                        {p.username}
                        {isCurrentUser && (
                          <span className="ms-1 text-xs text-neo-yellow/70">
                            ({t('events.you')})
                          </span>
                        )}
                      </span>
                    </PlayerProfileTooltip>
                  </div>

                  {/* Score */}
                  <div className="text-sm font-mono font-bold text-white">
                    {p.score}
                  </div>

                  {/* Reward preview */}
                  {reward && !compact && (
                    <div className="text-xs text-neo-yellow/70 w-20 text-right truncate">
                      {reward.title || `${reward.coins} coins`}
                    </div>
                  )}
                </div>
              </AdaptiveMotion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventLeaderboard;
