/**
 * Student Achievements Page
 *
 * Displays all education achievements (duel/practice) with tier progress
 * using the AchievementGrid component.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { AchievementGrid, type Achievement } from '@/components/education/achievements/AchievementGrid';
import type { AchievementCategory } from '@/lib/supabase/education/types';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

export default function StudentAchievementsPageClient() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);
  const [achievements, setAchievements] = useState<Record<string, Achievement>>({});
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);

  // Auth guard
  useEffect(() => {
    if (loading) {
      return; // Still loading, don't make any decisions yet
    }

    if (!isAuthenticated) {
      router.push(`/${language}`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, loading, router, language]);

  // Fetch education achievements
  useEffect(() => {
    async function fetchAchievements() {
      if (!user || !supabase) {
        setIsLoadingAchievements(false);
        return;
      }

      try {
        // Fetch all education achievement definitions
        const { data: definitions, error: defError } = await supabase
          .from('achievement_definitions')
          .select('key, category, icon, is_secret, base_name_key, base_description_key');

        if (defError) {
          logger.error('Error fetching achievement definitions:', defError);
          setIsLoadingAchievements(false);
          return;
        }

        // Fetch student's progress for each achievement
        const { data: progress, error: progressError } = await supabase
          .from('student_achievements_progress')
          .select('achievement_key, count')
          .eq('student_id', user.id);

        if (progressError) {
          logger.error('Error fetching student achievements progress:', progressError);
          setIsLoadingAchievements(false);
          return;
        }

        // Create a map for easy lookup
        const progressMap = new Map(
          (progress || []).map((p) => [p.achievement_key, p])
        );

        // Transform into Achievement format
        const achievementsRecord: Record<string, Achievement> = {};
        for (const def of definitions || []) {
          const studentProgress = progressMap.get(def.key);
          achievementsRecord[def.key] = {
            count: studentProgress?.count || 0,
            category: def.category as AchievementCategory,
            icon: def.icon,
            nameKey: def.base_name_key,
            descriptionKey: def.base_description_key,
            isSecret: def.is_secret,
          };
        }

        setAchievements(achievementsRecord);
        setIsLoadingAchievements(false);
      } catch (error) {
        logger.error('Error in fetchAchievements:', error);
        setIsLoadingAchievements(false);
      }
    }

    if (user) {
      fetchAchievements();
    }
  }, [user]);

  // Show loader while checking auth
  if (loading || isChecking) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-neo-navy">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden', isRTL && 'rtl')}>
      <EducationHeader showBackButton />

      <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1">
        {/* Back Navigation */}
        <Link
          href={`/${language}/student`}
          className="inline-flex items-center gap-2 text-neo-white hover:text-neo-white mb-6 transition-colors"
        >
          <DirectionalIcon icon={ArrowLeft} className="w-4 h-4" />
          <span className="font-neo-body">{t('common.back')}</span>
        </Link>

        {/* Page Title */}
        <h1 className="text-3xl font-neo-display font-black text-neo-white mb-6">
          {t('student.dashboard.achievements')}
        </h1>

        {/* Achievement Grid */}
        {isLoadingAchievements ? (
          <div className="flex items-center justify-center p-12">
            <PageLoader size="md" text={t('common.loading')} />
          </div>
        ) : (
          <AchievementGrid
            studentId={user!.id}
            achievements={achievements}
          />
        )}
      </div>
    </div>
  );
}
