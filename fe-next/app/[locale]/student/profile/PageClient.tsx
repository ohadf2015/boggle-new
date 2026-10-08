/**
 * Student Profile Page
 *
 * Displays student achievements, stats, and XP progress
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { EducationHeader } from '@/components/education/EducationHeader';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { PageLoader } from '@/components/ui/PageLoader';
import { EducationBadgeGrid, type StudentAchievement } from '@/components/education';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { getXpProgress } from '@/backend/modules/xpManager';
import { transformAchievementRow } from './achievementTransform';
import { m } from 'framer-motion';
import Avatar from '@/components/Avatar';

export default function StudentProfilePageClient() {
  const { user, profile, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);
  const [achievements, setAchievements] = useState<StudentAchievement[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);
  const { lessons, isLoading: isLoadingProgress } = useStudentProgress();

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

    // On `user`, not `isAuthenticated` (= user && profile, lands later) — see subpageGuard.
    if (!user) {
      // Not the main app home — a no-session visitor on an education
      // sub-page belongs at the auth-free student entry, not the marketing
      // homepage (education homepage-bounce audit).
      router.push(`/${language}/student/join`);
      return;
    }

    setIsChecking(false);
  }, [user, loading, router, language]);

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

  // Show loader during auth check or while auth is loading
  if (isChecking || loading) {
    return (
      <EducationShell header={<EducationHeader showBackButton />} contentClassName="flex items-center justify-center">
        <PageLoader size="lg" text={t('common.loading')} />
      </EducationShell>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <EducationShell className={cn(isRTL && 'rtl')} header={<EducationHeader showBackButton />}
      scrollRegionLabel={t('student.dashboard.title')} contentClassName="px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full max-w-7xl mx-auto">
        {/* Profile Header */}
        <div className="mb-8 space-y-6">
          {/* Avatar + Name Row */}
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <Avatar
              customAvatar={profile?.avatar_config ?? null}
              userId={user?.id}
              pixelSize={96}
              className="rounded-full border-4 border-neo-black shadow-hard"
            />

            {/* Name + Level */}
            <div>
              <h1 className="text-4xl font-neo-display font-black text-neo-white">
                {profile?.display_name || profile?.username || t('common.guest')}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <div className="px-3 py-1 bg-neo-lime text-neo-black font-neo-display font-bold text-lg rounded-neo border-2 border-neo-black">
                  {t('education.xp.level')} {currentLevel}
                </div>
                <div className="px-3 py-1 bg-neo-cyan text-neo-black font-neo-display font-bold text-lg rounded-neo border-2 border-neo-black">
                  {totalXp} {t('education.xp.totalXp')}
                </div>
                {currentStreak > 0 && (
                  <div className="px-3 py-1 bg-neo-orange text-neo-black font-neo-display font-bold text-lg rounded-neo border-2 border-neo-black">
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
              className="h-4 bg-neo-navy-light border-2 border-neo-cream/40 rounded-neo overflow-hidden"
              role="progressbar"
              aria-label={t('common.aria.levelProgress')}
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
                <div key={`stats-${id}`} className="p-6 bg-neo-navy/50 border-neo border-neo-cream/40 rounded-neo shadow-hard animate-pulse">
                  <div className="h-4 w-24 bg-neo-white/10 rounded mb-2" />
                  <div className="h-9 w-16 bg-neo-white/20 rounded" />
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="p-6 bg-neo-navy/50 border-neo border-neo-cream/40 rounded-neo shadow-hard">
                <div className="text-neo-white font-neo-body text-sm mb-1">
                  {t('education.student.lessonsAssigned')}
                </div>
                <div className="text-3xl font-neo-display font-black text-neo-white">
                  {lessons.length}
                </div>
              </div>

              <div className="p-6 bg-neo-navy/50 border-neo border-neo-cream/40 rounded-neo shadow-hard">
                <div className="text-neo-white font-neo-body text-sm mb-1">
                  {t('education.practice.wordsFound')}
                </div>
                <div className="text-3xl font-neo-display font-black text-neo-lime">
                  {studentProgress?.words_mastered?.length || 0}
                </div>
              </div>

              <div className="p-6 bg-neo-navy/50 border-neo border-neo-cream/40 rounded-neo shadow-hard">
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
    </EducationShell>
  );
}
