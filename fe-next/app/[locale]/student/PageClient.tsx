/**
 * Student Dashboard - Integrated Hero Design
 *
 * Hero card merges XP/level + stats into a single visual block
 * with mascot, spring animations, and staggered entrances.
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
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
    timeScope: 'all-time',
  });

  const { currentStreak, isLoaded: streakLoaded } = useWinStreak();

  const userInTopThree = topThree.find((entry) => entry.isCurrentUser);
  const userEntry = userInTopThree || currentUserRank;

  const rank = userEntry?.rank ?? '-';
  const totalXP = userEntry?.totalXp ?? 0;

  const xpProgress = useMemo(() => getXpProgress(totalXP), [totalXP]);

  // Pick mascot variant based on streak / level
  const mascotVariant = useMemo(() => {
    if (currentStreak >= 7) return 'trophy' as const;
    if (xpProgress.currentLevel >= 10) return 'gaming' as const;
    return 'happy' as const;
  }, [currentStreak, xpProgress.currentLevel]);

  // Skeleton loader
  if (leaderboardLoading || !streakLoaded) {
    return (
      <div className="p-6 rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy/40 shadow-hard-lg animate-pulse">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-neo bg-neo-white/10" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-neo-white/10 rounded mb-2" />
            <div className="h-3 w-full bg-neo-white/10 rounded" />
          </div>
        </div>
        <div className="border-t border-white/10 pt-4 grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-neo bg-neo-white/10" />
              <div>
                <div className="h-3 w-10 bg-neo-white/10 rounded mb-1" />
                <div className="h-5 w-12 bg-neo-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={heroEntrance}
      initial="hidden"
      animate="visible"
      className="relative p-6 rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy/40 shadow-hard-lg overflow-hidden"
    >
      {/* Mascot - floating in top-right corner */}
      <motion.div
        className="absolute -top-2 -right-2 z-10 hidden sm:block"
        initial={{ scale: 0, rotate: 30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.5 }}
      >
        <InteractiveMascot
          variant={mascotVariant}
          size="sm"
          enableHover
          enableClick
          clickAnimation="bounce"
          animated
        />
      </motion.div>

      {/* Top: Level badge + XP progress */}
      <motion.div variants={childFadeUp} className="flex items-center gap-4 mb-4 pe-16 sm:pe-20">
        {/* Level badge - pops in with rotation */}
        <motion.div variants={levelBadgePop} className="relative flex-shrink-0">
          <motion.div
            className="w-14 h-14 rounded-neo bg-neo-lime/20 border-neo border-neo-lime/50 flex items-center justify-center"
            whileHover={{ scale: 1.15, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <span className="text-2xl font-neo-display font-black text-neo-lime tabular-nums">
              {xpProgress.currentLevel}
            </span>
          </motion.div>
        </motion.div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-neo-body text-neo-white/70 mb-1">
            {t('education.xp.level')} {xpProgress.currentLevel}
          </p>
          {/* Animated XP progress bar */}
          <div className="w-full h-3 rounded-full bg-black/40 border border-neo-black overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-neo-lime origin-left"
              variants={xpBarFill}
              custom={xpProgress.progressPercent}
            />
          </div>
          <p className="text-xs font-neo-body text-neo-white/50 mt-1 tabular-nums">
            {xpProgress.xpInCurrentLevel} / {xpProgress.xpNeededForNextLevel} XP
          </p>
        </div>
      </motion.div>

      {/* Bottom: 3-column stats with stagger */}
      <motion.div
        variants={statsContainer}
        className="border-t border-white/10 pt-4 grid grid-cols-3 gap-4"
      >
        {/* Rank */}
        <motion.div variants={statItem} className="flex items-center gap-2">
          <motion.div
            className="w-9 h-9 rounded-neo bg-neo-yellow/15 flex items-center justify-center"
            whileHover={{ scale: 1.2, rotate: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Trophy className="w-5 h-5 text-neo-yellow" />
          </motion.div>
          <div>
            <p className="text-xs text-neo-white/50">{t('education.leaderboard.rank')}</p>
            <p className="text-lg font-bold text-neo-yellow tabular-nums">
              {typeof rank === 'number' ? `#${rank}` : rank}
            </p>
          </div>
        </motion.div>

        {/* Total XP */}
        <motion.div variants={statItem} className="flex items-center gap-2">
          <motion.div
            className="w-9 h-9 rounded-neo bg-neo-cyan/15 flex items-center justify-center"
            whileHover={{ scale: 1.2, rotate: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Zap className="w-5 h-5 text-neo-cyan" />
          </motion.div>
          <div>
            <p className="text-xs text-neo-white/50">{t('education.leaderboard.totalXP')}</p>
            <p className="text-lg font-bold text-neo-cyan tabular-nums">{totalXP.toLocaleString()}</p>
          </div>
        </motion.div>

        {/* Streak */}
        <motion.div variants={statItem} className="flex items-center gap-2">
          <motion.div
            className="w-9 h-9 rounded-neo bg-neo-pink/15 flex items-center justify-center"
            whileHover={{ scale: 1.2, rotate: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Flame className="w-5 h-5 text-neo-pink" />
          </motion.div>
          <div>
            <p className="text-xs text-neo-white/50">{t('education.leaderboard.streak')}</p>
            <p className="text-lg font-bold text-neo-pink tabular-nums">
              {currentStreak} {t('common.days')}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function StudentPageClient() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);
  const { classroomId } = useStudentClassroom();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAuthenticated) {
      router.push(`/${language}`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, loading, router, language]);

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

        {/* Page Header - animated entrance */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <h1 className="text-3xl font-neo-display text-neo-white mb-2 text-balance">
            {t('student.dashboard.title')}
          </h1>
          <p className="text-neo-white/70 font-neo-body text-pretty">
            {t('student.dashboard.subtitle')}
          </p>
        </motion.div>

        {/* Lesson List */}
        <StudentLessonView />
      </div>
    </div>
  );
}
