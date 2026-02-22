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
          'p-6 rounded-neo border-3 border-black bg-white shadow-hard-sm',
          isRTL && 'rtl'
        )}
      >
        <h2 className="text-xl font-neo-display font-black text-black mb-4">
          {t('student.dashboard.classroomActivity')}
        </h2>
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              data-testid="activity-skeleton-row"
              className="flex items-center gap-3 p-3 rounded-neo border-2 border-black/20 bg-gray-100 animate-pulse"
            >
              <div className="w-10 h-10 rounded-full bg-black/10" />
              <div className="flex-1">
                <div className="h-3 w-32 bg-black/10 rounded mb-2" />
                <div className="h-2 w-24 bg-black/10 rounded" />
              </div>
              <div className="w-8 h-8 rounded-neo bg-black/10" />
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
          'p-6 rounded-neo border-3 border-black bg-white shadow-hard-sm',
          isRTL && 'rtl'
        )}
      >
        <h2 className="text-xl font-neo-display font-black text-black mb-4">
          {t('student.dashboard.classroomActivity')}
        </h2>
        <p className="text-black/50 text-sm text-center py-8">
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
          'p-6 rounded-neo border-3 border-black bg-white shadow-hard-sm',
          isRTL && 'rtl'
        )}
      >
        <h2 className="text-xl font-neo-display font-black text-black mb-4">
          {t('student.dashboard.classroomActivity')}
        </h2>
        <p className="text-black/50 text-sm text-center py-8">
          {t('student.dashboard.activity.noActivity')}
        </p>
      </div>
    );
  }

  // ==================== ACTIVITY LIST ====================

  return (
    <div
      className={cn(
        'p-6 rounded-neo border-3 border-black bg-white shadow-hard-sm',
        isRTL && 'rtl'
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-neo-display font-black text-black">
          {t('student.dashboard.classroomActivity')}
        </h2>
        <span className="px-2 py-0.5 bg-neo-cyan border-2 border-black rounded-neo text-xs font-bold text-black shadow-hard-sm">
          {activities.length}
        </span>
      </div>

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
                'flex items-center gap-3 p-3 rounded-neo border-2 transition-all',
                isCurrentUser
                  ? 'border-neo-cyan bg-neo-cyan/10 shadow-hard-sm'
                  : 'border-black/20 bg-gray-50 hover:border-black hover:bg-gray-100'
              )}
            >
              {/* Avatar */}
              <div className={cn(
                'flex-shrink-0 w-10 h-10 rounded-full border-2 border-black flex items-center justify-center text-lg shadow-hard-sm',
                isCurrentUser ? 'bg-neo-cyan' : 'bg-neo-yellow'
              )}>
                {activity.actorAvatar || '👤'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-neo-body text-black truncate">
                  <span className="font-bold">{activity.actorName}</span>{' '}
                  {isDuel
                    ? t('student.dashboard.activity.wonDuel')
                    : t('student.dashboard.activity.unlockedAchievement')}
                </p>
                <p className="text-xs text-black/50">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>

              {/* Icon */}
              <div
                data-testid={`activity-icon-${activity.type}`}
                className={cn(
                  'flex-shrink-0 w-9 h-9 rounded-neo border-2 border-black flex items-center justify-center shadow-hard-sm',
                  isDuel ? 'bg-neo-yellow' : 'bg-neo-cyan'
                )}
              >
                {isDuel ? (
                  <Trophy className="w-5 h-5 text-black" />
                ) : (
                  <Award className="w-5 h-5 text-black" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
