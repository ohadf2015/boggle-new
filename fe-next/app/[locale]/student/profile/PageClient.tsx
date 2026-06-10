/**
 * Student Profile Page
 *
 * Displays student achievements, stats, and XP progress
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { EducationHeader } from '@/components/education/EducationHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { EducationBadgeGrid, type StudentAchievement } from '@/components/education';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { getXpProgress } from '@/backend/modules/xpManager';
import { getDuelStats, getDuelHistory, type DuelHistoryEntry, type DuelStatsResult } from '@/lib/supabase/education/duels';
import { Swords, Trophy, X, Minus, Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { transformAchievementRow } from './achievementTransform';
import { m } from 'framer-motion';
import { ClassmatesList } from '@/components/education/duels/ClassmatesList';
import { getStudentClassroom, getClassroomStudents, getLessons as getStudentLessons, type Classroom, type ClassroomStudent, type VocabularyLesson } from '@/lib/supabase/education';

export default function StudentProfilePageClient() {
  const { user, isAuthenticated, profile, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);
  const [achievements, setAchievements] = useState<StudentAchievement[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);
  const [duelStats, setDuelStats] = useState<DuelStatsResult | null>(null);
  const [recentDuels, setRecentDuels] = useState<DuelHistoryEntry[]>([]);
  const [isLoadingDuels, setIsLoadingDuels] = useState(true);
  const { lessons, isLoading: isLoadingProgress } = useStudentProgress();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [classmates, setClassmates] = useState<ClassroomStudent[]>([]);
  const [classroomLessons, setClassroomLessons] = useState<VocabularyLesson[]>([]);

  // Get student XP and level from first lesson progress
  const studentProgress = lessons.length > 0 ? lessons[0].progress : null;
  const totalXp = studentProgress?.total_xp || 0;
  const currentStreak = studentProgress?.current_streak || 0;

  // Calculate actual XP progress using the XP manager
  const xpProgress = getXpProgress(totalXp);
  const currentLevel = xpProgress.currentLevel;

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (loading) {
      return; // Still loading, don't make any decisions yet
    }

    // Check authentication (only after loading completes)
    if (!isAuthenticated) {
      router.push(`/${language}`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, loading, router, language]);

  // Fetch student achievements
  useEffect(() => {
    async function fetchAchievements() {
      if (!user || !supabase) {
        setIsLoadingAchievements(false);
        return;
      }

      try {
        // Join with achievement_definitions + tiers to compute nextThreshold client-side
        const { data, error } = await supabase
          .from('student_achievements')
          .select(`
            id,
            student_id,
            current_tier,
            progress_value,
            is_pinned,
            unlocked_at,
            achievement_definitions!inner (
              key,
              category,
              icon,
              is_secret,
              achievement_tiers (
                tier,
                threshold,
                tier_order
              )
            )
          `)
          .eq('student_id', user.id);

        if (error) {
          logger.error('Error fetching achievements:', error);
          setIsLoadingAchievements(false);
          return;
        }

        const formattedAchievements: StudentAchievement[] = (data || []).map((row) =>
          transformAchievementRow({
            current_tier: row.current_tier,
            progress_value: row.progress_value || 0,
            is_pinned: row.is_pinned || false,
            achievement_definitions: row.achievement_definitions as unknown as Parameters<typeof transformAchievementRow>[0]['achievement_definitions'],
          })
        );

        setAchievements(formattedAchievements);
        setIsLoadingAchievements(false);
      } catch (error) {
        logger.error('Error in fetchAchievements:', error);
        setIsLoadingAchievements(false);
      }
    }

    fetchAchievements();
  }, [user]);

  // Fetch duel data
  useEffect(() => {
    async function fetchDuelData() {
      if (!user) {
        setIsLoadingDuels(false);
        return;
      }

      try {
        const [statsResult, historyResult] = await Promise.all([
          getDuelStats(user.id),
          getDuelHistory(user.id, 5),
        ]);

        if (statsResult.data) {
          setDuelStats(statsResult.data);
        }

        if (historyResult.data) {
          setRecentDuels(historyResult.data);
        }

        setIsLoadingDuels(false);
      } catch (error) {
        logger.error('Error fetching duel data:', error);
        setIsLoadingDuels(false);
      }
    }

    fetchDuelData();
  }, [user]);

  // Fetch classroom and classmates data
  useEffect(() => {
    async function fetchClassroomData() {
      if (!user) return;

      const [classroomRes, lessonsRes] = await Promise.all([
        getStudentClassroom(user.id),
        getStudentLessons(user.id),
      ]);

      if (classroomRes.data) {
        setClassroom(classroomRes.data);
        // Fetch classmates once classroom is known
        const studentsRes = await getClassroomStudents(classroomRes.data.id);
        if (studentsRes.data) {
          setClassmates(studentsRes.data);
        }
      }

      if (lessonsRes.data) {
        setClassroomLessons(lessonsRes.data);
      }
    }

    fetchClassroomData();
  }, [user]);

  // Show loader during auth check or while auth is loading
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
      <EducationHeader showBackButton />

      <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1">
        {/* Profile Header */}
        <div className="mb-8 space-y-6">
          {/* Avatar + Name Row */}
          <div className="flex items-center gap-6">
            {/* Avatar */}
            {profile?.avatar_image ? (
              <Image
                src={profile.avatar_image}
                alt={`${profile.display_name || profile.username}'s avatar`}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full border-4 border-neo-black shadow-hard"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-neo-cyan border-4 border-neo-black shadow-hard flex items-center justify-center">
                <span className="text-5xl">{profile?.avatar_emoji || '👤'}</span>
              </div>
            )}

            {/* Name + Level */}
            <div>
              <h1 className="text-4xl font-neo-display font-black text-neo-white">
                {profile?.display_name || profile?.username || t('common.guest')}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <div className="px-3 py-1 bg-neo-lime text-neo-black font-neo-display font-bold text-lg rounded-neo border-2 border-neo-black">
                  {t('education.xp.level')} {currentLevel}
                </div>
                <div className="px-3 py-1 bg-neo-orange text-neo-black font-neo-display font-bold text-lg rounded-neo border-2 border-neo-black">
                  {totalXp} {t('education.xp.totalXp')}
                </div>
                {currentStreak > 0 && (
                  <div className="px-3 py-1 bg-neo-pink text-neo-black font-neo-display font-bold text-lg rounded-neo border-2 border-neo-black">
                    🔥 {currentStreak} {t('education.xp.streak')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-neo-white font-neo-body text-sm">
                {xpProgress.xpInCurrentLevel} / {xpProgress.xpNeededForNextLevel} XP
              </span>
              {!xpProgress.isMaxLevel ? (
                <span className="text-neo-white font-neo-body text-sm">
                  {t('education.xp.nextLevel')}: {currentLevel + 1}
                </span>
              ) : (
                <span className="text-neo-pink font-neo-display font-bold text-sm">
                  {t('education.xp.maxLevel')}
                </span>
              )}
            </div>
            <div
              className="h-4 bg-neo-navy-light border-2 border-neo-black rounded-neo overflow-hidden"
              role="progressbar"
              aria-label="Level progress"
              aria-valuenow={xpProgress.progressPercent}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-neo-cyan transition-all duration-500"
                style={{ width: `${xpProgress.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {isLoadingProgress ? (
            // Skeleton loaders for stats
            <>
              {['a', 'b', 'c'].map((id) => (
                <div key={`stats-${id}`} className="p-6 bg-neo-navy/50 border-neo border-neo-black rounded-neo shadow-hard animate-pulse">
                  <div className="h-4 w-24 bg-neo-white/10 rounded mb-2" />
                  <div className="h-9 w-16 bg-neo-white/20 rounded" />
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="p-6 bg-neo-navy/50 border-neo border-neo-black rounded-neo shadow-hard">
                <div className="text-neo-white font-neo-body text-sm mb-1">
                  {t('education.student.lessonsAssigned')}
                </div>
                <div className="text-3xl font-neo-display font-black text-neo-white">
                  {lessons.length}
                </div>
              </div>

              <div className="p-6 bg-neo-navy/50 border-neo border-neo-black rounded-neo shadow-hard">
                <div className="text-neo-white font-neo-body text-sm mb-1">
                  {t('education.practice.wordsFound')}
                </div>
                <div className="text-3xl font-neo-display font-black text-neo-lime">
                  {studentProgress?.words_mastered?.length || 0}
                </div>
              </div>

              <div className="p-6 bg-neo-navy/50 border-neo border-neo-black rounded-neo shadow-hard">
                <div className="text-neo-white font-neo-body text-sm mb-1">
                  {t('education.practice.complete')}
                </div>
                <div className="text-3xl font-neo-display font-black text-neo-cyan">
                  {studentProgress?.total_practice_sessions || 0}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Duel Record Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-neo-display font-bold text-neo-white mb-4">
            {t('student.profile.duelRecord')}
          </h2>

          {isLoadingDuels ? (
            // Skeleton loader
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['a', 'b', 'c', 'd'].map((id) => (
                <div key={`duel-${id}`} className="p-4 bg-neo-navy/50 border-neo border-neo-black rounded-neo shadow-hard animate-pulse">
                  <div className="h-4 w-16 bg-neo-white/10 rounded mb-2" />
                  <div className="h-8 w-12 bg-neo-white/20 rounded" />
                </div>
              ))}
            </div>
          ) : duelStats && (duelStats.wins > 0 || duelStats.losses > 0 || duelStats.draws > 0) ? (
            <>
              {/* Duel Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Wins */}
                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-4 bg-green-500/20 border-neo border-neo-black rounded-neo shadow-hard"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-neo-body text-sm">
                      {t('duels.wins')}
                    </span>
                  </div>
                  <div className="text-3xl font-neo-display font-black text-neo-white">
                    {duelStats.wins}
                  </div>
                </m.div>

                {/* Losses */}
                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 bg-red-500/20 border-neo border-neo-black rounded-neo shadow-hard"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <X className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 font-neo-body text-sm">
                      {t('duels.losses')}
                    </span>
                  </div>
                  <div className="text-3xl font-neo-display font-black text-neo-white">
                    {duelStats.losses}
                  </div>
                </m.div>

                {/* Win Rate */}
                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 bg-neo-cyan/20 border-neo border-neo-black rounded-neo shadow-hard"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-neo-cyan font-neo-body text-sm">
                      {t('student.profile.winRate')}
                    </span>
                  </div>
                  <div className="text-3xl font-neo-display font-black text-neo-white">
                    {(() => {
                      const total = duelStats.wins + duelStats.losses + duelStats.draws;
                      if (total === 0) return '0.0';
                      return ((duelStats.wins / total) * 100).toFixed(1);
                    })()}%
                  </div>
                </m.div>

                {/* Win Streak */}
                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-4 bg-neo-orange/20 border-neo border-neo-black rounded-neo shadow-hard"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {duelStats.currentStreak >= 3 && <Flame className="w-4 h-4 text-neo-orange" />}
                    <span className="text-neo-orange font-neo-body text-sm">
                      {t('duels.winStreak')}
                    </span>
                  </div>
                  <div className="text-3xl font-neo-display font-black text-neo-white">
                    {duelStats.winStreak}
                  </div>
                </m.div>

                {/* Draws (if any) - hidden if 0 */}
                {duelStats.draws > 0 && (
                  <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="p-4 bg-gray-500/20 border-neo border-neo-black rounded-neo shadow-hard col-span-2 md:col-span-1"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Minus className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400 font-neo-body text-sm">
                        {t('duels.draws')}
                      </span>
                    </div>
                    <div className="text-3xl font-neo-display font-black text-neo-white">
                      {duelStats.draws}
                    </div>
                  </m.div>
                )}
              </div>

              {/* Challenge Classmate */}
              {classroom && classmates.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-neo-display font-bold text-neo-white mb-3">
                    {t('duels.challengeClassmate')}
                  </h3>
                  <ClassmatesList
                    classmates={classmates}
                    classroomId={classroom.id}
                    lessons={classroomLessons.map(l => ({ id: l.id, name: l.name }))}
                    currentUserId={user.id}
                    maxItems={5}
                  />
                </div>
              )}

              {/* Recent Duels */}
              {recentDuels.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-neo-display font-bold text-neo-white">
                    {t('student.profile.recentDuels')}
                  </h3>

                  <div className="space-y-2">
                    {recentDuels.map((duel, index) => {
                      const opponentName = duel.challenger_id === user.id
                        ? duel.opponent.display_name
                        : duel.challenger.display_name;
                      const score = duel.challenger_id === user.id
                        ? duel.challenger_score
                        : duel.opponent_score;

                      return (
                        <m.div
                          key={duel.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-3 bg-neo-navy/30 border-2 border-neo-black rounded-neo hover:bg-neo-navy/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {/* Win/Loss/Draw badge */}
                            <div className={cn(
                              'px-2 py-1 rounded-neo border-2 border-neo-black font-neo-display font-bold text-xs',
                              duel.isWin && 'bg-green-500 text-white',
                              !duel.isWin && duel.winner_id !== null && 'bg-red-500 text-white',
                              duel.winner_id === null && 'bg-gray-500 text-white'
                            )}>
                              {duel.isWin ? 'W' : duel.winner_id === null ? 'D' : 'L'}
                            </div>

                            {/* Opponent */}
                            <div>
                              <div className="text-neo-white font-neo-body text-sm">
                                {t('duels.vs')} {opponentName}
                              </div>
                              <div className="text-neo-white font-neo-body text-xs">
                                {duel.completed_at && formatDistanceToNow(new Date(duel.completed_at), { addSuffix: true })}
                              </div>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="text-neo-white font-neo-display font-bold">
                            {score}
                          </div>
                        </m.div>
                      );
                    })}
                  </div>

                  {/* Link to full duel history */}
                  <Link
                    href={`/${language}/duels/history`}
                    className={cn(
                      'block text-center text-neo-cyan hover:text-neo-cyan/80 font-neo-body text-sm',
                      'transition-colors underline underline-offset-4 mt-2'
                    )}
                  >
                    {t('student.profile.viewDuelHistory')} →
                  </Link>
                </div>
              )}
            </>
          ) : (
            // Empty state
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 bg-neo-navy/30 border-neo border-neo-black rounded-neo shadow-hard text-center"
            >
              <Swords className="w-12 h-12 text-neo-white mx-auto mb-3" />
              <div className="text-neo-white font-neo-body mb-1">
                {t('student.profile.noDuelsYet')}
              </div>
              <div className="text-neo-white font-neo-body text-sm">
                {t('student.profile.challengePrompt')}
              </div>
            </m.div>
          )}
        </div>

        {/* Achievement Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-neo-display font-bold text-neo-white">
            {t('student.dashboard.achievements')}
          </h2>
          <Link
            href={`/${language}/student/achievements`}
            className={cn(
              'text-neo-cyan hover:text-neo-cyan/80 font-neo-body text-sm',
              'transition-colors underline underline-offset-4'
            )}
          >
            {t('student.dashboard.viewAll')} →
          </Link>
        </div>

        {/* Achievement Grid */}
        {isLoadingAchievements ? (
          <div className="flex items-center justify-center p-12">
            <PageLoader size="md" text={t('common.loading')} />
          </div>
        ) : (
          <EducationBadgeGrid
            studentId={user.id}
            achievements={achievements}
          />
        )}
      </div>
    </div>
  );
}
