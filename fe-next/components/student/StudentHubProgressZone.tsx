'use client';

/**
 * StudentHubProgressZone — Progress zone for student hub (Zone 2)
 *
 * Compact hero card: XP bar + level badge + streak + rank + milestone tracker.
 *
 * Deliberately has NO celebration modal. Crossing a level used to throw a full-screen
 * MilestoneCelebration over the hub the moment the XP query resolved — an interruption a
 * student had to dismiss before they could reach their teacher's lesson, fired by a value
 * arriving from the network rather than by anything they just did. The MilestoneTracker
 * below shows the same progress without taking the screen.
 */

import { useMemo } from 'react';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomLeaderboard } from '@/hooks/useClassroomLeaderboard';
import { useWinStreak } from '@/hooks/useWinStreak';
import { getXpProgress } from '@/backend/modules/xpManager';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import { MilestoneTracker } from '@/components/education/milestones/MilestoneTracker';
import { Trophy, Zap, Flame } from 'lucide-react';

interface StudentHubProgressZoneProps {
  classroomId: string;
  userId: string;
}

// --- Animation variants ---

const heroEntrance = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24, staggerChildren: 0.1 },
  },
};

const childFadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const levelBadgePop = {
  hidden: { scale: 0, rotate: -20 },
  visible: { scale: 1, rotate: 3, transition: { type: 'spring' as const, stiffness: 400, damping: 15, delay: 0.2 } },
};

const statItem = {
  hidden: { opacity: 0, y: 12, scale: 0.9 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

const statsContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } },
};

const xpBarFill = {
  hidden: { scaleX: 0 },
  visible: (percent: number) => ({
    scaleX: percent / 100,
    transition: { type: 'spring' as const, stiffness: 80, damping: 18, delay: 0.4 },
  }),
};

export function StudentHubProgressZone({ classroomId, userId }: StudentHubProgressZoneProps) {
  const { t } = useLanguage();

  const { topThree, currentUserRank, isLoading: leaderboardLoading } = useClassroomLeaderboard({
    classroomId,
    currentUserId: userId,
    initialTimeScope: 'all-time',
  });

  const { currentStreak, isLoaded: streakLoaded } = useWinStreak();

  const userInTopThree = topThree.find((entry) => entry.isCurrentUser);
  const userEntry = userInTopThree || currentUserRank;
  const rank = userEntry?.rank ?? '-';
  const totalXP = userEntry?.totalXp ?? 0;
  const xpProgress = useMemo(() => getXpProgress(totalXP), [totalXP]);

  const mascotVariant = useMemo(() => {
    if (currentStreak >= 7) return 'trophy' as const;
    if (xpProgress.currentLevel >= 10) return 'gaming' as const;
    return 'happy' as const;
  }, [currentStreak, xpProgress.currentLevel]);

  // Skeleton
  if (leaderboardLoading || !streakLoaded) {
    return (
      <div className="p-6 rounded-neo border-neo border-neo-black bg-neo-navy shadow-hard animate-pulse">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-neo bg-black/10" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-black/10 rounded mb-2" />
            <div className="h-3 w-full bg-black/10 rounded" />
          </div>
        </div>
        <div className="border-t-2 border-black/10 pt-4 grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={`stat-${i}`} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-neo bg-black/10" />
              <div>
                <div className="h-3 w-10 bg-black/10 rounded mb-1" />
                <div className="h-5 w-12 bg-black/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <m.div
        variants={heroEntrance}
        initial="hidden"
        animate="visible"
        className="relative rounded-neo border-3 border-black shadow-hard overflow-hidden"
      >
        {/* Lime header with XP */}
        <div className="bg-neo-lime px-6 pt-5 pb-4">
          <m.div
            className="absolute top-2 inset-e-2 z-10"
            initial={{ scale: 0, rotate: 30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.5 }}
          >
            <InteractiveMascot
              variant={mascotVariant}
              size="sm"
              sizeClassName="w-12 h-12 sm:w-16 sm:h-16"
              enableHover
              enableClick
              clickAnimation="bounce"
              animated
            />
          </m.div>

          <m.div variants={childFadeUp} className="flex items-center gap-4 pe-14 sm:pe-20">
            <m.div variants={levelBadgePop} className="relative shrink-0">
              <m.div
                className="w-14 h-14 rounded-neo bg-black border-3 border-black flex items-center justify-center shadow-hard-sm"
                whileHover={{ scale: 1.15, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <span className="text-2xl font-neo-display font-black text-neo-lime tabular-nums">
                  {xpProgress.currentLevel}
                </span>
              </m.div>
            </m.div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-neo-body font-bold text-black/70 mb-1">
                {t('education.xp.level')} {xpProgress.currentLevel}
              </p>
              <div className="w-full h-4 rounded-neo border-2 border-black bg-black/20 overflow-hidden">
                <m.div
                  className="h-full rounded-neo bg-black origin-left"
                  variants={xpBarFill}
                  custom={xpProgress.progressPercent}
                />
              </div>
              <p className="text-xs font-neo-body font-bold text-black/60 mt-1 tabular-nums">
                {xpProgress.xpInCurrentLevel} / {xpProgress.xpNeededForNextLevel} XP
              </p>
            </div>
          </m.div>
        </div>

        {/* Dark body with stats */}
        <div className="bg-neo-navy-light px-6 py-4">
          <m.div variants={statsContainer} className="grid grid-cols-3 gap-3">
            {/* Rank */}
            <m.div variants={statItem} className="flex flex-col items-center gap-1 p-3 rounded-neo border-neo border-neo-black bg-neo-navy border-l-4 border-l-neo-lime shadow-hard-sm text-center">
              <m.div
                className="w-9 h-9 rounded-neo bg-neo-lime border-2 border-black flex items-center justify-center shadow-hard-sm"
                whileHover={{ scale: 1.2, rotate: -8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Trophy className="w-5 h-5 text-black" />
              </m.div>
              <p className="text-xs text-neo-white font-bold">{t('education.leaderboard.rank')}</p>
              <p className="text-xl font-black text-neo-white tabular-nums">
                {typeof rank === 'number' ? `#${rank}` : rank}
              </p>
            </m.div>

            {/* Total XP */}
            <m.div variants={statItem} className="flex flex-col items-center gap-1 p-3 rounded-neo border-neo border-neo-black bg-neo-navy border-l-4 border-l-neo-cyan shadow-hard-sm text-center">
              <m.div
                className="w-9 h-9 rounded-neo bg-neo-cyan border-2 border-black flex items-center justify-center shadow-hard-sm"
                whileHover={{ scale: 1.2, rotate: 8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Zap className="w-5 h-5 text-black" />
              </m.div>
              <p className="text-xs text-neo-white font-bold">{t('education.leaderboard.totalXP')}</p>
              <p className="text-xl font-black text-neo-white tabular-nums">{totalXP.toLocaleString()}</p>
            </m.div>

            {/* Streak */}
            <m.div variants={statItem} className="flex flex-col items-center gap-1 p-3 rounded-neo border-neo border-neo-black bg-neo-navy border-l-4 border-l-neo-pink shadow-hard-sm text-center">
              <m.div
                className="w-9 h-9 rounded-neo bg-neo-pink border-2 border-black flex items-center justify-center shadow-hard-sm"
                whileHover={{ scale: 1.2, rotate: -8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Flame className="w-5 h-5 text-white" />
              </m.div>
              <p className="text-xs text-neo-white font-bold">{t('education.leaderboard.streak')}</p>
              <p className="text-xl font-black text-neo-white tabular-nums">
                {currentStreak} {t('common.days')}
              </p>
            </m.div>
          </m.div>

          <div className="border-t-2 border-black/10 pt-4 mt-4">
            <MilestoneTracker totalXp={totalXP} />
          </div>
        </div>
      </m.div>
    </>
  );
}
