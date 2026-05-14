'use client';

import { m } from 'framer-motion';
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
          'p-6 rounded-neo border-3 border-black bg-neo-cream shadow-hard-sm',
          isRTL && 'rtl'
        )}
      >
        <h2 className="text-xl font-neo-display font-black text-black mb-4">
          {t('student.dashboard.classroomActivity')}
        </h2>
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div
              key={`skel-${i}`}
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
          'p-6 rounded-neo border-3 border-black bg-neo-cream shadow-hard-sm',
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
          'p-6 rounded-neo border-3 border-black bg-neo-cream shadow-hard-sm',
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
    <m.div
      className={cn(
        'p-6 rounded-neo border-3 border-black bg-neo-cream shadow-hard-sm',
        isRTL && 'rtl'
      )}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { type: 'spring', stiffness: 260, damping: 24, staggerChildren: 0.06, delayChildren: 0.15 },
        },
      }}
    >
      <m.div
        className="flex items-center gap-3 mb-4"
        variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0 } }}
      >
        <h2 className="text-xl font-neo-display font-black text-black">
          {t('student.dashboard.classroomActivity')}
        </h2>
        <m.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.3 }}
          className="px-2 py-0.5 bg-neo-cyan border-2 border-black rounded-neo text-xs font-bold text-black shadow-hard-sm"
        >
          {activities.length}
        </m.span>
      </m.div>

      <div className="space-y-2">
        {activities.map((activity, index) => {
          const isCurrentUser = activity.actorId === userId;
          const isDuel = activity.type === 'duel_completed';

          return (
            <m.div
              key={activity.id}
              data-testid={`activity-item-${activity.id}`}
              variants={{
                hidden: { opacity: 0, x: -10, scale: 0.96 },
                visible: {
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  transition: { type: 'spring', stiffness: 350, damping: 22 },
                },
              }}
              whileHover={{
                x: 4,
                boxShadow: '4px 4px 0px black',
                transition: { type: 'spring', stiffness: 400, damping: 20 },
              }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-neo border-2 cursor-default',
                isCurrentUser
                  ? 'border-neo-cyan bg-neo-cyan/10 shadow-hard-sm'
                  : 'border-black/20 bg-gray-50'
              )}
            >
              {/* Avatar */}
              <m.div
                className={cn(
                  'shrink-0 w-10 h-10 rounded-full border-2 border-black flex items-center justify-center text-lg shadow-hard-sm',
                  isCurrentUser ? 'bg-neo-cyan' : 'bg-neo-lime'
                )}
                whileHover={{ scale: 1.15, rotate: -8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                {activity.actorAvatar || '👤'}
              </m.div>

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
              <m.div
                data-testid={`activity-icon-${activity.type}`}
                className={cn(
                  'shrink-0 w-9 h-9 rounded-neo border-2 border-black flex items-center justify-center shadow-hard-sm',
                  isDuel ? 'bg-neo-lime' : 'bg-neo-cyan'
                )}
                whileHover={{ scale: 1.2, rotate: 8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                {isDuel ? (
                  <Trophy className="w-5 h-5 text-black" />
                ) : (
                  <Award className="w-5 h-5 text-black" />
                )}
              </m.div>
            </m.div>
          );
        })}
      </div>
    </m.div>
  );
}
