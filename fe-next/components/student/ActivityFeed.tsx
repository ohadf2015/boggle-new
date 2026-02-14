'use client';

import { motion } from 'framer-motion';
import { Trophy, Award } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useClassroomActivity } from '@/hooks/useClassroomActivity';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface ActivityFeedProps {
  classroomId: string;
  userId: string;
}

// ============================================
// COMPONENT
// ============================================

export default function ActivityFeed({ classroomId, userId }: ActivityFeedProps) {
  const { activities, isLoading, error } = useClassroomActivity(classroomId);
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  // ==================== LOADING STATE ====================

  if (isLoading) {
    return (
      <div
        className={cn(
          'p-6 rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy/40 shadow-hard-lg mb-6',
          isRTL && 'rtl'
        )}
      >
        <h2 className="text-xl font-neo-display text-neo-white mb-4">
          {t('student.dashboard.classroomActivity')}
        </h2>
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              data-testid="activity-skeleton-row"
              className="flex items-center gap-3 p-3 rounded-neo bg-neo-navy/20 border border-neo-black/20 animate-pulse"
            >
              <div className="w-10 h-10 rounded-full bg-neo-white/10" />
              <div className="flex-1">
                <div className="h-3 w-32 bg-neo-white/10 rounded mb-2" />
                <div className="h-2 w-24 bg-neo-white/10 rounded" />
              </div>
              <div className="w-8 h-8 rounded-neo bg-neo-white/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==================== ERROR STATE ====================

  if (error) {
    return (
      <div
        className={cn(
          'p-6 rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy/40 shadow-hard-lg mb-6',
          isRTL && 'rtl'
        )}
      >
        <h2 className="text-xl font-neo-display text-neo-white mb-4">
          {t('student.dashboard.classroomActivity')}
        </h2>
        <p className="text-neo-white/70 text-sm text-center py-8">
          {t('student.dashboard.activity.errorLoading')}
        </p>
      </div>
    );
  }

  // ==================== EMPTY STATE ====================

  if (activities.length === 0) {
    return (
      <div
        className={cn(
          'p-6 rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy/40 shadow-hard-lg mb-6',
          isRTL && 'rtl'
        )}
      >
        <h2 className="text-xl font-neo-display text-neo-white mb-4">
          {t('student.dashboard.classroomActivity')}
        </h2>
        <p className="text-neo-white/70 text-sm text-center py-8">
          {t('student.dashboard.activity.noActivity')}
        </p>
      </div>
    );
  }

  // ==================== ACTIVITY LIST ====================

  return (
    <div
      className={cn(
        'p-6 rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy/40 shadow-hard-lg mb-6',
        isRTL && 'rtl'
      )}
    >
      <h2 className="text-xl font-neo-display text-neo-white mb-4">
        {t('student.dashboard.classroomActivity')}
      </h2>

      <div className="space-y-2">
        {activities.map((activity, index) => {
          const isCurrentUser = activity.actorId === userId;
          const isDuel = activity.type === 'duel_completed';

          return (
            <motion.div
              key={activity.id}
              data-testid={`activity-item-${activity.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-neo border-neo bg-neo-navy/20',
                isCurrentUser
                  ? 'border-neo-cyan shadow-hard-sm'
                  : 'border-neo-black/20 hover:border-neo-white/20 transition-colors'
              )}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neo-white/10 flex items-center justify-center text-lg">
                {activity.actorAvatar || '👤'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-neo-body text-neo-white truncate">
                  <span className="font-bold">{activity.actorName}</span>{' '}
                  {isDuel
                    ? t('student.dashboard.activity.wonDuel')
                    : t('student.dashboard.activity.unlockedAchievement')}
                </p>
                <p className="text-xs text-neo-white/50">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>

              {/* Icon */}
              <div
                data-testid={`activity-icon-${activity.type}`}
                className={cn(
                  'flex-shrink-0 w-9 h-9 rounded-neo flex items-center justify-center',
                  isDuel ? 'bg-neo-yellow/15' : 'bg-neo-cyan/15'
                )}
              >
                {isDuel ? (
                  <Trophy className="w-5 h-5 text-neo-yellow" />
                ) : (
                  <Award className="w-5 h-5 text-neo-cyan" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
