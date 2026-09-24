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
import { AwardsFilterBar, AwardsGrid, type AwardsFilter } from '@/components/student/pages/AwardsWall';
import { useStudentSubpageGuard } from '@/components/student/pages/useStudentSubpageGuard';
import { toneStyle } from '@/components/student/academy/chrome';
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
  const all = Object.values(achievements);
  const earned = all.filter((a) => a.count > 0).length;

  const badge =
    ready && all.length > 0 ? (
      <span
        dir="auto"
        className="inline-flex h-9 items-center rounded-full border-2 border-neo-black px-3 font-neo-display text-sm font-black text-neo-black"
        style={toneStyle('gold', { shadow: 2, trim: 1 })}
      >
        {t('academy.pages.awardsEarned', '{earned}/{total} earned', { earned, total: all.length })}
      </span>
    ) : undefined;

  return (
    <AcademyPageFrame
      title={t('teacher.nav.studentAchievements', 'Awards')}
      art="/images/education/chest-books.webp"
      badge={badge}
      toolbar={ready ? <AwardsFilterBar active={filter} onChange={setFilter} /> : undefined}
      regionLabel={t('student.dashboard.achievements')}
      pending={!ready}
      busy={ready && isLoadingAchievements}
    >
      {!ready || isLoadingAchievements ? (
        <FrameSkeleton rows={8} grid />
      ) : (
        <div data-testid="student-awards-content">
          <AwardsGrid achievements={achievements} filter={filter} />
        </div>
      )}
    </AcademyPageFrame>
  );
}
