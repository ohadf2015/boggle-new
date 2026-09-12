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
import { EducationShell } from '@/components/education/shell/EducationShell';
import { PageLoader } from '@/components/ui/PageLoader';
import { AchievementGrid, type Achievement } from '@/components/education/achievements/AchievementGrid';
import { STUDENT_PROGRESS_SELECT, buildAchievementsRecord } from '@/lib/education/achievementProgress';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import Image from 'next/image';

export default function StudentAchievementsPageClient() {
  const { user, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);
  const [achievements, setAchievements] = useState<Record<string, Achievement>>({});
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);

  // Auth guard.
  //
  // On `user`, never on `isAuthenticated` — that flag is `!!user && !!profile`,
  // and the profile row is a second round-trip that lands AFTER `loading` goes
  // false. Reading it here turned a cold load of this page into a redirect to
  // the marketing home for a student who was signed in the whole time (four
  // loads out of four, measured). `user` is the only value that actually says
  // "no session"; see app/[locale]/student/__tests__/subpageGuard.test.tsx.
  useEffect(() => {
    if (loading) {
      return; // Still loading, don't make any decisions yet
    }

    if (!user) {
      router.push(`/${language}`);
      return;
    }

    setIsChecking(false);
  }, [user, loading, router, language]);

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
          .select(STUDENT_PROGRESS_SELECT)
          .eq('student_id', user.id);

        if (progressError) {
          logger.error('Error fetching student achievements progress:', progressError);
          setIsLoadingAchievements(false);
          return;
        }

        setAchievements(buildAchievementsRecord(definitions || [], progress || []));
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
      <EducationShell header={<EducationHeader showBackButton />} contentClassName="flex items-center justify-center">
        <PageLoader size="lg" text={t('common.loading')} />
      </EducationShell>
    );
  }

  return (
    <EducationShell
      className={cn(isRTL && 'rtl')}
      header={<EducationHeader showBackButton />}
      scrollRegionLabel={t('student.dashboard.achievements')}
      contentClassName="px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="w-full max-w-5xl mx-auto">
        {/* Back Navigation */}
        <Link
          href={`/${language}/student`}
          className="inline-flex items-center gap-2 text-neo-white hover:text-neo-white mb-6 transition-colors"
        >
          <DirectionalIcon icon={ArrowLeft} className="w-4 h-4" />
          <span className="font-neo-body">{t('common.back')}</span>
        </Link>

        {/* Page Title */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-neo-display font-black text-neo-white">
            {t('student.dashboard.achievements')}
          </h1>
          {/* Decorative only. */}
          <Image
            src="/images/education/words-mastered.webp"
            alt=""
            aria-hidden="true"
            width={200}
            height={112}
            className="hidden sm:block w-40 h-auto shrink-0 select-none"
          />
        </div>

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
    </EducationShell>
  );
}
