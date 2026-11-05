/**
 * Student Achievements ("Awards") — education achievements with tier progress,
 * in the Academy frame (map backdrop, back-to-map plaque, the map's dock). The
 * page never scrolls; the badge wall scrolls inside its panel.
 *
 * Guard: on the session (`user`), never on the profile — see
 * `useStudentSubpageGuard` and app/[locale]/student/__tests__/subpageGuard.test.tsx.
 */

'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Achievement } from '@/components/education/achievements/AchievementGrid';
import { AcademyPageFrame, FrameSkeleton } from '@/components/student/pages/AcademyPageFrame';
import { AwardsFilterBar, type AwardsFilter } from '@/components/student/pages/AwardsWall';
import { useStudentSubpageGuard } from '@/components/student/pages/useStudentSubpageGuard';
import { AwardsBody } from './AwardsBody';
import { STUDENT_PROGRESS_SELECT, buildAchievementsRecord } from '@/lib/education/achievementProgress';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

type T = (k: string, fallback?: string, params?: Record<string, unknown>) => string;

export default function StudentAchievementsPageClient() {
  const { t: rawT, language } = useLanguage();
  const t = rawT as unknown as T;
  const { status, user } = useStudentSubpageGuard(language);
  const userId = user?.id ?? null;
  const [achievements, setAchievements] = useState<Record<string, Achievement>>({});
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);
  const [filter, setFilter] = useState<AwardsFilter>('all');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const done = () => { if (!cancelled) setIsLoadingAchievements(false); };

    async function fetchAchievements(id: string) {
      if (!supabase) return done();
      try {
        const { data: definitions, error: defError } = await supabase
          .from('achievement_definitions')
          .select('key, category, icon, is_secret, base_name_key, base_description_key');
        if (defError) {
          logger.error('Error fetching achievement definitions:', defError);
          return done();
        }
        const { data: progress, error: progressError } = await supabase
          .from('student_achievements_progress')
          .select(STUDENT_PROGRESS_SELECT)
          .eq('student_id', id);
        if (progressError) {
          logger.error('Error fetching student achievements progress:', progressError);
          return done();
        }
        if (!cancelled) setAchievements(buildAchievementsRecord(definitions || [], progress || []));
      } catch (error) {
        logger.error('Error in fetchAchievements:', error);
      }
      done();
    }

    fetchAchievements(userId);
    return () => { cancelled = true; };
  }, [userId]);

  const ready = status === 'ready';

  return (
    <AcademyPageFrame
      title={t('teacher.nav.studentAchievements', 'Awards')}
      art="/images/education/chest-books.webp"
      toolbar={ready && (isLoadingAchievements || Object.keys(achievements).length > 0) ? <AwardsFilterBar active={filter} onChange={setFilter} /> : undefined}
      regionLabel={t('student.dashboard.achievements')}
      pending={!ready}
      busy={ready && isLoadingAchievements}
    >
      {!ready || isLoadingAchievements ? (
        <FrameSkeleton rows={8} grid />
      ) : (
        <AwardsBody achievements={achievements} filter={filter} />
      )}
    </AcademyPageFrame>
  );
}
