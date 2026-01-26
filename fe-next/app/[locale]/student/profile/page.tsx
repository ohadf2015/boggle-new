/**
 * Student Profile Page
 *
 * Displays student achievements, stats, and XP progress
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import Header from '@/components/Header';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { EducationBadgeGrid, type StudentAchievement } from '@/components/education';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

export default function StudentProfilePage() {
  const { user, isAuthenticated, profile } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);
  const [achievements, setAchievements] = useState<StudentAchievement[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);
  const { lessons } = useStudentProgress();

  // Get student XP and level from first lesson progress
  const studentProgress = lessons.length > 0 ? lessons[0].progress : null;
  const totalXp = studentProgress?.total_xp || 0;
  const currentLevel = studentProgress?.current_level || 1;
  const currentStreak = studentProgress?.current_streak || 0;

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      router.push(`/${language}`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, router, language]);

  // Fetch student achievements
  useEffect(() => {
    async function fetchAchievements() {
      if (!user || !supabase) {
        setIsLoadingAchievements(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('student_achievements')
          .select('*')
          .eq('student_id', user.id);

        if (error) {
          logger.error('Error fetching achievements:', error);
          setIsLoadingAchievements(false);
          return;
        }

        // Transform database rows to StudentAchievement format
        const formattedAchievements: StudentAchievement[] = (data || []).map((row) => ({
          achievement_key: row.achievement_key,
          current_tier: row.current_tier,
          progress_value: row.progress_value,
          next_threshold: row.next_threshold,
          percent_complete: row.percent_complete,
          is_pinned: row.is_pinned,
          is_secret: row.is_secret,
          category: row.category,
          icon: row.icon,
        }));

        setAchievements(formattedAchievements);
        setIsLoadingAchievements(false);
      } catch (error) {
        logger.error('Error in fetchAchievements:', error);
        setIsLoadingAchievements(false);
      }
    }

    fetchAchievements();
  }, [user]);

  if (isChecking) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <NeoLoader variant="mascot-letters" size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden', isRTL && 'rtl')}>
      <Header />

      <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1">
        {/* Profile Header */}
        <div className="mb-8 space-y-6">
          {/* Avatar + Name Row */}
          <div className="flex items-center gap-6">
            {/* Avatar */}
            {profile?.avatar_image ? (
              <img
                src={profile.avatar_image}
                alt={`${profile.display_name || profile.username}'s avatar`}
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
                <div className="px-3 py-1 bg-neo-yellow text-neo-black font-neo-display font-bold text-lg rounded-neo border-2 border-neo-black">
                  {t('education.xp.level')} {currentLevel}
                </div>
                <div className="px-3 py-1 bg-neo-orange text-neo-white font-neo-display font-bold text-lg rounded-neo border-2 border-neo-black">
                  {totalXp} {t('education.xp.totalXp')}
                </div>
                {currentStreak > 0 && (
                  <div className="px-3 py-1 bg-neo-pink text-neo-white font-neo-display font-bold text-lg rounded-neo border-2 border-neo-black">
                    🔥 {currentStreak} {t('education.xp.streak')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-neo-white/70 font-neo-body text-sm">
                {t('education.xp.progress')}
              </span>
              <span className="text-neo-white/70 font-neo-body text-sm">
                {t('education.xp.nextLevel')}: {currentLevel + 1}
              </span>
            </div>
            <div
              className="h-4 bg-neo-navy-light border-2 border-neo-black rounded-neo overflow-hidden"
              role="progressbar"
              aria-label="Level progress"
              aria-valuenow={50}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-neo-cyan transition-all duration-500"
                style={{ width: '50%' }}
              />
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-6 bg-neo-navy/50 border-neo border-neo-black rounded-neo shadow-hard">
            <div className="text-neo-white/60 font-neo-body text-sm mb-1">
              {t('education.student.lessonsAssigned')}
            </div>
            <div className="text-3xl font-neo-display font-black text-neo-white">
              {lessons.length}
            </div>
          </div>

          <div className="p-6 bg-neo-navy/50 border-neo border-neo-black rounded-neo shadow-hard">
            <div className="text-neo-white/60 font-neo-body text-sm mb-1">
              {t('education.practice.wordsFound')}
            </div>
            <div className="text-3xl font-neo-display font-black text-neo-yellow">
              {studentProgress?.words_mastered?.length || 0}
            </div>
          </div>

          <div className="p-6 bg-neo-navy/50 border-neo border-neo-black rounded-neo shadow-hard">
            <div className="text-neo-white/60 font-neo-body text-sm mb-1">
              {t('education.practice.complete')}
            </div>
            <div className="text-3xl font-neo-display font-black text-neo-cyan">
              {studentProgress?.total_practice_sessions || 0}
            </div>
          </div>
        </div>

        {/* Achievement Grid */}
        {isLoadingAchievements ? (
          <div className="flex items-center justify-center p-12">
            <NeoLoader variant="mascot-letters" size="md" text={t('common.loading')} />
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
