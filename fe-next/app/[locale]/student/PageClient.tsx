/**
 * Student Dashboard - Integrated Hero Design
 *
 * Hero card merges XP/level + stats into a single visual block
 * with mascot, spring animations, and staggered entrances.
 */

'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import { useClassroomLeaderboard } from '@/hooks/useClassroomLeaderboard';
import { useWinStreak } from '@/hooks/useWinStreak';
import { getXpProgress } from '@/backend/modules/xpManager';
import { EducationHeader } from '@/components/education/EducationHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import StudentLessonView from '@/components/student/StudentLessonView';
import { ClassroomGameBanner } from '@/components/student/ClassroomGameBanner';
import ClassroomLeaderboard from '@/components/education/ClassroomLeaderboard';
import { ChallengePanel } from '@/components/education/challenges/ChallengePanel';
import { MilestoneTracker } from '@/components/education/milestones/MilestoneTracker';
import { MilestoneCelebration, type MilestonePayload } from '@/components/education/milestones/MilestoneCelebration';
import { checkMilestoneCrossed, getMilestoneRewards } from '@/lib/supabase/education/milestones';
import QuickPlayPanel from '@/components/student/QuickPlayPanel';
import StreakCalendar from '@/components/student/StreakCalendar';
import ActivityFeed from '@/components/student/ActivityFeed';
import { cn } from '@/lib/utils';
import { Trophy, Zap, Flame } from 'lucide-react';

// --- Animation variants ---

const heroEntrance = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24, staggerChildren: 0.1 },
  },
};

const childFadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const levelBadgePop = {
  hidden: { scale: 0, rotate: -20 },
  visible: {
    scale: 1,
    rotate: 3,
    transition: { type: 'spring' as const, stiffness: 400, damping: 15, delay: 0.2 },
  },
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

// --- Hero card component ---

function StudentProgress({ classroomId, userId }: { classroomId: string; userId: string }) {
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

  // Milestone celebration state
  const [milestonePayload, setMilestonePayload] = useState<MilestonePayload | null>(null);
  const prevLevelRef = useRef(xpProgress.currentLevel);

  // Check for milestone crossings when level changes
  useEffect(() => {
    const oldLevel = prevLevelRef.current;
    const newLevel = xpProgress.currentLevel;
    if (newLevel > oldLevel) {
      const crossed = checkMilestoneCrossed(oldLevel, newLevel);
      if (crossed && crossed.isMajor) {
        const rewards = getMilestoneRewards(crossed.level);
        setMilestonePayload({
          level: crossed.level,
          isMajor: crossed.isMajor,
          rewards,
        });
      }
    }
    prevLevelRef.current = newLevel;
  }, [xpProgress.currentLevel]);

  // Pick mascot variant based on streak / level
  const mascotVariant = useMemo(() => {
    if (currentStreak >= 7) return 'trophy' as const;
    if (xpProgress.currentLevel >= 10) return 'gaming' as const;
    return 'happy' as const;
  }, [currentStreak, xpProgress.currentLevel]);

  // Skeleton loader
  if (leaderboardLoading || !streakLoaded) {
    return (
      <div className="p-6 rounded-neo border-3 border-black bg-white shadow-hard animate-pulse">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-neo bg-black/10" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-black/10 rounded mb-2" />
            <div className="h-3 w-full bg-black/10 rounded" />
          </div>
        </div>
        <div className="border-t-2 border-black/10 pt-4 grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
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
      <motion.div
        variants={heroEntrance}
        initial="hidden"
        animate="visible"
        className="relative rounded-neo border-3 border-black shadow-hard overflow-hidden"
      >
      {/* Colorful header band */}
      <div className="bg-neo-yellow px-6 pt-5 pb-4">
        {/* Mascot - floating in top-right corner */}
        <motion.div
          className="absolute top-2 end-2 z-10"
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
        </motion.div>

        {/* Level badge + XP progress */}
        <motion.div variants={childFadeUp} className="flex items-center gap-4 pe-14 sm:pe-20">
          {/* Level badge - pops in with rotation */}
          <motion.div variants={levelBadgePop} className="relative flex-shrink-0">
            <motion.div
              className="w-14 h-14 rounded-neo bg-black border-3 border-black flex items-center justify-center shadow-hard-sm"
              whileHover={{ scale: 1.15, rotate: -5 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <span className="text-2xl font-neo-display font-black text-neo-yellow tabular-nums">
                {xpProgress.currentLevel}
              </span>
            </motion.div>
          </motion.div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-neo-body font-bold text-black/70 mb-1">
              {t('education.xp.level')} {xpProgress.currentLevel}
            </p>
            {/* Animated XP progress bar */}
            <div className="w-full h-4 rounded-neo border-2 border-black bg-black/20 overflow-hidden">
              <motion.div
                className="h-full rounded-neo bg-black origin-left"
                variants={xpBarFill}
                custom={xpProgress.progressPercent}
              />
            </div>
            <p className="text-xs font-neo-body font-bold text-black/60 mt-1 tabular-nums">
              {xpProgress.xpInCurrentLevel} / {xpProgress.xpNeededForNextLevel} XP
            </p>
          </div>
        </motion.div>
      </div>

      {/* White body with stats */}
      <div className="bg-white px-6 py-4">
        {/* 3-column stats with stagger */}
        <motion.div
          variants={statsContainer}
          className="grid grid-cols-3 gap-3"
        >
          {/* Rank */}
          <motion.div variants={statItem} className="flex flex-col items-center gap-1 p-3 rounded-neo border-2 border-black bg-neo-yellow/20 shadow-hard-sm text-center">
            <motion.div
              className="w-9 h-9 rounded-neo bg-neo-yellow border-2 border-black flex items-center justify-center shadow-hard-sm"
              whileHover={{ scale: 1.2, rotate: -8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Trophy className="w-5 h-5 text-black" />
            </motion.div>
            <p className="text-xs text-black/60 font-bold">{t('education.leaderboard.rank')}</p>
            <p className="text-xl font-black text-black tabular-nums">
              {typeof rank === 'number' ? `#${rank}` : rank}
            </p>
          </motion.div>

          {/* Total XP */}
          <motion.div variants={statItem} className="flex flex-col items-center gap-1 p-3 rounded-neo border-2 border-black bg-neo-cyan/20 shadow-hard-sm text-center">
            <motion.div
              className="w-9 h-9 rounded-neo bg-neo-cyan border-2 border-black flex items-center justify-center shadow-hard-sm"
              whileHover={{ scale: 1.2, rotate: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Zap className="w-5 h-5 text-black" />
            </motion.div>
            <p className="text-xs text-black/60 font-bold">{t('education.leaderboard.totalXP')}</p>
            <p className="text-xl font-black text-black tabular-nums">{totalXP.toLocaleString()}</p>
          </motion.div>

          {/* Streak */}
          <motion.div variants={statItem} className="flex flex-col items-center gap-1 p-3 rounded-neo border-2 border-black bg-neo-pink/20 shadow-hard-sm text-center">
            <motion.div
              className="w-9 h-9 rounded-neo bg-neo-pink border-2 border-black flex items-center justify-center shadow-hard-sm"
              whileHover={{ scale: 1.2, rotate: -8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Flame className="w-5 h-5 text-white" />
            </motion.div>
            <p className="text-xs text-black/60 font-bold">{t('education.leaderboard.streak')}</p>
            <p className="text-xl font-black text-black tabular-nums">
              {currentStreak} {t('common.days')}
            </p>
          </motion.div>
        </motion.div>

        {/* Milestone Progress */}
        <div className="border-t-2 border-black/10 pt-4 mt-4">
          <MilestoneTracker totalXp={totalXP} />
        </div>
      </div>
      </motion.div>
      <MilestoneCelebration
        milestone={milestonePayload}
        onClose={() => setMilestonePayload(null)}
      />
    </>
  );
}

export default function StudentPageClient() {
  const { user, isAuthenticated, loading, profile } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);
  const { classroomId } = useStudentClassroom();
  const { currentStreak, lastWinDate } = useWinStreak();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAuthenticated) {
      router.push(`/${language}`);
      return;
    }

    // Teachers and admins should use the teacher dashboard, not student view
    const isTeacherOrAdmin =
      profile?.user_role === 'teacher' ||
      profile?.user_role === 'admin' ||
      profile?.is_admin === true;
    if (isTeacherOrAdmin) {
      router.push(`/${language}/teacher`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, loading, router, language, profile]);

  // Show loader during auth check
  if (isChecking || loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden', isRTL && 'rtl')}>
      <EducationHeader />

      {/* Single-column content */}
      <div className="w-full max-w-5xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex-1">
        {/* Page Header - animated entrance */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🎓</span>
            <h1 className="text-3xl font-neo-display font-black text-neo-white text-balance">
              {t('student.dashboard.title')}
            </h1>
          </div>
          <p className="text-neo-white/70 font-neo-body text-pretty ps-1">
            {t('student.dashboard.subtitle')}
          </p>
        </motion.div>

        {/* Classroom Game Banner (if active) */}
        {classroomId && (
          <div className="mb-6">
            <ClassroomGameBanner
              classroomId={classroomId}
              userId={user.id}
              username={user.email || t('student.dashboard.defaultName')}
            />
          </div>
        )}

        {/* Hero Card: XP + Stats + Mascot */}
        {classroomId && (
          <div className="mb-6">
            <StudentProgress classroomId={classroomId} userId={user.id} />
          </div>
        )}

        {/* Quick Play Panel */}
        {classroomId && (
          <div className="mb-6">
            <QuickPlayPanel classroomId={classroomId} userId={user.id} />
          </div>
        )}

        {/* Streak Calendar */}
        <div className="mb-6">
          <StreakCalendar currentStreak={currentStreak} lastWinDate={lastWinDate} />
        </div>

        {/* Daily & Weekly Challenges */}
        {user && (
          <div className="mb-6">
            <ChallengePanel playerId={user.id} />
          </div>
        )}

        {/* Full Classroom Leaderboard */}
        {classroomId && (
          <div className="mb-6">
            <ClassroomLeaderboard
              classroomId={classroomId}
              currentUserId={user.id}
            />
          </div>
        )}

        {/* Classroom Activity Feed */}
        {classroomId && (
          <div className="mb-6">
            <ActivityFeed classroomId={classroomId} userId={user.id} />
          </div>
        )}

        {/* Lesson List */}
        <StudentLessonView />
      </div>
    </div>
  );
}
