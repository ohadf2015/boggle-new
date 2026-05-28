/**
 * DuelMonitoringPanel - Real-time duel activity panel
 *
 * Shows recent duel activity for a classroom using useClassroomActivity hook.
 * Displays recent duel results with winner names, scores, and duel types.
 */

'use client';

import { useClassroomActivity } from '@/hooks/useClassroomActivity';
import { useLanguage } from '@/contexts/LanguageContext';
import { Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export interface DuelMonitoringPanelProps {
  classroomId: string;
}

export function DuelMonitoringPanel({ classroomId }: DuelMonitoringPanelProps) {
  const { t, language } = useLanguage();
  const { activities, isLoading } = useClassroomActivity(classroomId, 5);

  // Filter for duel activities only
  const duelActivities = activities.filter(activity => activity.type === 'duel_completed');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div
            key={`skeleton-${i}`}
            className="h-16 bg-neo-white/5 rounded-neo animate-pulse"
            data-testid="duel-skeleton"
          />
        ))}
      </div>
    );
  }

  if (duelActivities.length === 0) {
    return (
      <div className="text-center py-8 text-neo-white font-neo-body">
        <Swords className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>{t('teacher.duels.noDuels')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {duelActivities.map(activity => {
        const { actorName, timestamp, metadata } = activity;
        const score = (metadata.score as number) || 0;
        const duelType = (metadata.duelType as string) || 'async';
        const winnerId = (metadata.winnerId as string) || '';

        return (
          <div
            key={activity.id}
            className={cn(
              'p-4 rounded-neo border-neo border-neo-black',
              'bg-neo-navy/50 shadow-hard-sm',
              'hover:shadow-hard transition-all'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Swords className="w-5 h-5 text-neo-pink shrink-0" />
                <div>
                  <p className="font-neo-body font-bold text-neo-white">
                    {actorName}
                  </p>
                  <p className="text-sm text-neo-white">
                    {score} {t('teacher.duels.points')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Duel type badge */}
                <span
                  className={cn(
                    'text-xs px-2 py-1 rounded font-bold',
                    duelType === 'realtime'
                      ? 'bg-neo-pink/20 text-neo-pink'
                      : 'bg-neo-cyan/20 text-neo-cyan'
                  )}
                >
                  {duelType === 'realtime' ? t('teacher.duels.realtime') : t('teacher.duels.async')}
                </span>

                {/* Time ago */}
                <span className="text-xs text-neo-white">
                  {formatDistanceToNow(timestamp, { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DuelMonitoringPanel;
