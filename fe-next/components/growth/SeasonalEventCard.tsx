'use client';

/**
 * SeasonalEventCard - Card for active seasonal events with countdown and CTA.
 * Shows event name, description, time remaining, progress, reward preview.
 * Neo-brutalist: border-neo-yellow, shadow-hard, Calendar/Trophy icons.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { Calendar, Trophy, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSeasonalEvents } from '@/hooks/useSeasonalEvents';
import { cn } from '@/lib/utils';
import type { SeasonalEventReward } from '@/shared/types/growth';

function formatTimeRemaining(endTime: string): string {
  const ms = new Date(endTime).getTime() - Date.now();
  if (ms <= 0) return '0h';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days > 0) return `${days}d ${remainingHours}h`;
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

const REWARD_TYPE_ICONS: Record<string, string> = {
  coins: '\uD83E\uDE99',
  avatar_part: '\uD83C\uDFA8',
  title: '\uD83C\uDFC5',
  streak_freeze: '\u2744\uFE0F',
};

function RewardPreview({ rewards }: { rewards: SeasonalEventReward[] }) {
  const { t } = useLanguage();
  const top3 = rewards.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="flex flex-col gap-1" data-testid="reward-preview">
      <span className="text-xs font-bold text-neo-white uppercase">
        {t('seasonalEvent.rewards')}
      </span>
      <div className="flex gap-2">
        {top3.map((reward) => (
          <div
            key={`${reward.rank}-${reward.type}`}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-neo',
              'bg-neo-white/5 border border-neo-white/10',
              'text-xs text-neo-white'
            )}
          >
            <span aria-hidden="true">
              {REWARD_TYPE_ICONS[reward.type] ?? '\uD83C\uDF81'}
            </span>
            <span>{reward.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const SeasonalEventCard: React.FC = memo(function SeasonalEventCard() {
  const { t } = useLanguage();
  const router = useRouter();
  const { activeEvents, myParticipation, loading } = useSeasonalEvents();
  const activeEvent = activeEvents[0] ?? null;
  const participation = activeEvent
    ? myParticipation.find((p: { eventId: string }) => p.eventId === activeEvent.id) ?? null
    : null;

  const handleJoin = useCallback(() => {
    if (!activeEvent) return;
    router.push(`/events/${activeEvent.id}`);
  }, [router, activeEvent]);

  const timeRemaining = useMemo(
    () => (activeEvent ? formatTimeRemaining(activeEvent.endTime) : ''),
    [activeEvent]
  );

  if (loading || !activeEvent) return null;

  const hasJoined = participation != null;
  const progressPercent =
    hasJoined && participation.score > 0
      ? Math.min(100, Math.round((participation.score / 1000) * 100))
      : 0;

  return (
    <div
      data-testid="seasonal-event-card"
      role="region"
      aria-label={t('seasonalEvent.ariaLabel')}
      className={cn(
        'border-neo border-neo-yellow rounded-neo p-4',
        'bg-neo-navy shadow-hard-sm',
        'flex flex-col gap-3'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-neo-yellow" aria-hidden="true" />
          <h3 className="font-neo-display text-lg text-neo-white">
            {activeEvent.name}
          </h3>
        </div>
        <div
          data-testid="event-countdown"
          className="flex items-center gap-1 text-xs text-neo-white"
        >
          <Clock className="w-3 h-3" aria-hidden="true" />
          {timeRemaining}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-neo-white">{activeEvent.description}</p>

      {/* Progress bar (if joined) */}
      {hasJoined && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-neo-white">
              {t('seasonalEvent.score')}: {participation.score.toLocaleString()}
            </span>
            {participation.rank != null && (
              <span className="text-neo-yellow font-bold">
                #{participation.rank}
              </span>
            )}
          </div>
          <div
            className="w-full h-2 rounded-full bg-neo-white/10 overflow-hidden"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('seasonalEvent.progressAriaLabel')}
          >
            <div
              className="h-full rounded-full bg-neo-yellow transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Reward preview */}
      <RewardPreview rewards={activeEvent.rewards} />

      {/* CTA */}
      <button
        data-testid="event-cta-btn"
        onClick={handleJoin}
        className={cn(
          'w-full py-2 rounded-neo font-bold',
          'border-neo shadow-hard-sm',
          'hover:shadow-hard-pressed active:translate-y-0.5',
          'flex items-center justify-center gap-2',
          hasJoined
            ? 'bg-neo-yellow text-neo-navy'
            : 'bg-neo-orange text-neo-white'
        )}
      >
        <Trophy className="w-4 h-4" aria-hidden="true" />
        {hasJoined
          ? t('seasonalEvent.continuePlaying')
          : t('seasonalEvent.joinEvent')}
      </button>
    </div>
  );
});

export default SeasonalEventCard;
